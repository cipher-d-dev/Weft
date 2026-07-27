/**
 * Weft — CustomizationScreen
 *
 * Phase 6: The thesis-proving screen. Full-screen overlay that replaces
 * CustomizationDrawer. Lets the user pick a paradigm and toggle accessibility
 * profiles while watching a live PreviewCard update in real time.
 *
 * Layout (bottom sheet, slides up from bottom, full height):
 *   ┌────────────────────────────────────────────────┐
 *   │  ← close button           Customise            │
 *   │                                                 │
 *   │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
 *   │  │ Skeuo    │ │  Glass   │ │ Minimal  │        │
 *   │  │ preview  │ │ preview  │ │ preview  │        │  ← 3 PreviewCards
 *   │  │          │ │          │ │          │        │
 *   │  └──────────┘ └──────────┘ └──────────┘        │
 *   │   ○ selected  ● active                          │
 *   │                                                 │
 *   │  Accessibility                                  │
 *   │  [ Motor ] [ Vision ] [ Cognitive ] [OneHanded] │  ← 4 toggle chips
 *   │                                                 │
 *   │  [  Apply  ]                                    │
 *   └────────────────────────────────────────────────┘
 *
 * Architecture:
 * - Local state for paradigm + profiles while the drawer is open
 * - On "Apply" (or live if autoApply) → dispatch to WeftConfigContext
 * - Three PreviewCards always render their respective paradigm using LOCAL
 *   semantics (they call compose() internally from props)
 * - The active PreviewCard shows the composed result of paradigm × profiles
 * - Animated slide-up entry, spring dismissal
 * - Paradigm switch: selected card scales up, others scale down (spring)
 * - Profile toggles: Toggle atoms, connected to local state
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { PreviewCard } from '../components/PreviewCard';
import type { AccessibilityProfile, Paradigm } from '../context/types';
import { ONBOARDING_KEY } from './OnboardingScreen';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomizationScreenProps = {
  /** 0 = fully closed, 1 = fully open. Animated.Value owned by App.tsx. */
  animValue: Animated.Value;
  onDismiss: () => void;
  isOpen: boolean;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARADIGMS: { id: Paradigm; label: string; sub: string }[] = [
  { id: 'skeuo',   label: 'Skeuomorphic', sub: 'Warm & tactile'  },
  { id: 'glass',   label: 'Glass',        sub: 'Frosted & airy'  },
  { id: 'minimal', label: 'Minimal',      sub: 'Flat & focused'  },
];

const PROFILES: { id: AccessibilityProfile; label: string; description: string }[] = [
  { id: 'motor',     label: 'Motor',      description: 'Larger targets'   },
  { id: 'vision',    label: 'Vision',     description: 'High contrast'    },
  { id: 'cognitive', label: 'Cognitive',  description: 'Less noise'       },
  { id: 'oneHanded', label: 'One-Handed', description: 'Thumb zone'       },
];

// ---------------------------------------------------------------------------
// ParadigmCard — one of the three selectable paradigm previews
// ---------------------------------------------------------------------------

const ParadigmCard = memo(function ParadigmCard({
  id,
  label,
  sub,
  isSelected,
  activeProfiles,
  accentColor,
  textPrimary,
  textSecondary,
  onSelect,
}: {
  id: Paradigm;
  label: string;
  sub: string;
  isSelected: boolean;
  activeProfiles: AccessibilityProfile[];
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  onSelect: (p: Paradigm) => void;
}) {
  // Spring-driven scale: selected card is larger
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0.88)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1 : 0.88,
      tension: 200,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    <TouchableOpacity
      onPress={() => onSelect(id)}
      activeOpacity={0.85}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${label} paradigm. ${sub}.${isSelected ? ' Selected.' : ''}`}
      style={styles.paradigmCardWrapper}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {/* Preview card — uses LOCAL semantics for this paradigm */}
        <PreviewCard
          paradigm={id}
          activeProfiles={isSelected ? activeProfiles : []}
        />

        {/* Selection ring */}
        {isSelected && (
          <View
            style={[
              styles.selectionRing,
              { borderColor: accentColor },
            ]}
          />
        )}

        {/* Paradigm label below card */}
        <Text
          style={[
            styles.paradigmLabel,
            {
              color: isSelected ? accentColor : textSecondary,
              fontWeight: isSelected ? '700' : '400',
            },
          ]}
        >
          {label}
        </Text>
        <Text style={[styles.paradigmSub, { color: textSecondary }]}>
          {sub}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// ProfileChip — single accessibility toggle chip
// ---------------------------------------------------------------------------

const ProfileChip = memo(function ProfileChip({
  id,
  label,
  description,
  isActive,
  accentPrimary,
  accentSubtle,
  surfaceBg,
  borderColor,
  textPrimary,
  textSecondary,
  onToggle,
}: {
  id: AccessibilityProfile;
  label: string;
  description: string;
  isActive: boolean;
  accentPrimary: string;
  accentSubtle: string;
  surfaceBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onToggle: (p: AccessibilityProfile) => void;
}) {
  const bgAnim   = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(bgAnim, {
      toValue: isActive ? 1 : 0,
      tension: 260,
      friction: 22,
      useNativeDriver: false,  // backgroundColor not nativeDriver-compatible
    }).start();
  }, [isActive, bgAnim]);

  return (
    <TouchableOpacity
      onPress={() => onToggle(id)}
      activeOpacity={0.8}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: isActive }}
      accessibilityLabel={`${label}: ${description}. ${isActive ? 'On' : 'Off'}.`}
      style={styles.profileChipTouchable}
    >
      <Animated.View
        style={[
          styles.profileChip,
          {
            borderColor: isActive ? accentPrimary : borderColor,
            backgroundColor: isActive ? accentSubtle : surfaceBg,
          },
        ]}
      >
        {/* Active indicator dot */}
        <View
          style={[
            styles.profileDot,
            { backgroundColor: isActive ? accentPrimary : 'transparent',
              borderColor: isActive ? accentPrimary : borderColor },
          ]}
        />
        <View>
          <Text
            style={[
              styles.profileChipLabel,
              { color: isActive ? accentPrimary : textPrimary,
                fontWeight: isActive ? '600' : '400' },
            ]}
          >
            {label}
          </Text>
          <Text style={[styles.profileChipDesc, { color: textSecondary }]}>
            {description}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// CustomizationScreen
// ---------------------------------------------------------------------------

export const CustomizationScreen = memo(function CustomizationScreen({
  animValue,
  onDismiss,
  isOpen,
  style,
}: CustomizationScreenProps) {
  const { semantics, paradigm, activeProfiles, setParadigm, toggleProfile } =
    useWeftConfig();
  const insets = useSafeAreaInsets();
  const s = semantics;

  // ── Local pending state — editing happens locally; applies on confirm ──────
  // This means the user can explore without committing until they tap Apply.
  const [localParadigm, setLocalParadigm] = useState<Paradigm>(paradigm);
  const [localProfiles, setLocalProfiles] = useState<AccessibilityProfile[]>(activeProfiles);

  // Sync local state when the drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalParadigm(paradigm);
      setLocalProfiles(activeProfiles);
    }
  }, [isOpen, paradigm, activeProfiles]);

  // ── Back handler — dismiss on back press when open ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, onDismiss]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectParadigm = useCallback((p: Paradigm) => {
    setLocalParadigm(p);
  }, []);

  const handleToggleProfile = useCallback((p: AccessibilityProfile) => {
    setLocalProfiles(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p],
    );
  }, []);

  const handleApply = useCallback(() => {
    setParadigm(localParadigm);
    // Sync profiles: add new ones, remove unchecked ones
    const current = new Set(activeProfiles);
    const next    = new Set(localProfiles);

    // Toggle off removed profiles
    for (const p of current) {
      if (!next.has(p)) toggleProfile(p);
    }
    // Toggle on added profiles
    for (const p of next) {
      if (!current.has(p)) toggleProfile(p);
    }
    onDismiss();
  }, [localParadigm, localProfiles, activeProfiles, setParadigm, toggleProfile, onDismiss]);

  const handleCancel = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // ── Animated values ───────────────────────────────────────────────────────
  const translateY = animValue.interpolate({
    inputRange:  [0, 1],
    outputRange: [800, 0],
    extrapolate: 'clamp',
  });

  const scrimOpacity = animValue.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 0.6],
    extrapolate: 'clamp',
  });

  // ── Surface colors — use customization surface tokens ─────────────────────
  const cs  = s.surface.customization;

  // For the panel, always use a near-opaque solid regardless of paradigm.
  // The customization surface needs to be readable at all times.
  const panelBg = cs.background;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, style]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {/* Scrim */}
      <Pressable onPress={handleCancel} style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: scrimOpacity }]}
        />
      </Pressable>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: panelBg,
            paddingBottom: insets.bottom + 16,
            borderColor: cs.border,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.closeBtn}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close customisation"
          >
            <Text style={[styles.closeBtnText, { color: cs.textSecondary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: cs.textPrimary }]}>
            Customise
          </Text>
          {/* Spacer to balance the close button */}
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: 8, paddingBottom: 24 },
          ]}
          bounces={false}
        >
          {/* ── Paradigm section ──────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: cs.textSecondary }]}>
            Paradigm
          </Text>

          <View style={styles.paradigmRow}>
            {PARADIGMS.map(p => (
              <ParadigmCard
                key={p.id}
                id={p.id}
                label={p.label}
                sub={p.sub}
                isSelected={localParadigm === p.id}
                activeProfiles={localProfiles}
                accentColor={s.accent.primary}
                textPrimary={cs.textPrimary}
                textSecondary={cs.textSecondary}
                onSelect={handleSelectParadigm}
              />
            ))}
          </View>

          {/* ── Accessibility section ─────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: cs.textSecondary, marginTop: 28 }]}>
            Accessibility
          </Text>

          <View style={styles.profileGrid}>
            {PROFILES.map(pr => (
              <ProfileChip
                key={pr.id}
                id={pr.id}
                label={pr.label}
                description={pr.description}
                isActive={localProfiles.includes(pr.id)}
                accentPrimary={s.accent.primary}
                accentSubtle={s.accent.subtle}
                surfaceBg={cs.backgroundAlt}
                borderColor={cs.border}
                textPrimary={cs.textPrimary}
                textSecondary={cs.textSecondary}
                onToggle={handleToggleProfile}
              />
            ))}
          </View>

          {/* ── Apply button ─────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={handleApply}
            style={[styles.applyBtn, { backgroundColor: s.accent.primary }]}
            activeOpacity={0.85}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Apply customisation"
          >
            <Text style={[styles.applyBtnText, { color: s.accent.onAccent }]}>
              Apply
            </Text>
          </TouchableOpacity>

          {/* ── Dev-only: reset onboarding ────────────────────────────── */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={async () => {
                await AsyncStorage.removeItem(ONBOARDING_KEY);
                await AsyncStorage.removeItem('weft:config');
                // Force a reload so onboarding appears again
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require('react-native').DevSettings.reload();
              }}
              style={[styles.devResetBtn, { borderColor: s.surface.customization.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.devResetText, { color: s.surface.customization.textSecondary }]}>
                ⚙ Dev: Reset onboarding
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Styles — structural / layout only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '94%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  paradigmRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  paradigmCardWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  selectionRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 2.5,
    // Sized to match PreviewCard outer container
    width: 148,
    height: 268,
    alignSelf: 'center',
  },
  paradigmLabel: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  paradigmSub: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.7,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileChipTouchable: {
    // width set to allow 2 per row with gap
    width: '47%',
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  profileDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  profileChipLabel: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  profileChipDesc: {
    fontSize: 10,
    marginTop: 1,
    opacity: 0.7,
  },
  applyBtn: {
    marginTop: 28,
    marginHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  devResetBtn: {
    marginTop: 12,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  devResetText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
