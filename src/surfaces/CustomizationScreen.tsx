/**
 * Weft — CustomizationScreen
 *
 * Phase 6 + Sprint 2: Paradigm picker, accessibility profiles, wallpaper
 * entry row, and icon size/shape pickers.
 *
 * Layout (bottom sheet, slides up from bottom, full height):
 *   ┌────────────────────────────────────────────────┐
 *   │  ← close button           Customise            │
 *   │                                                 │
 *   │  [Skeuo preview] [Glass preview] [Min preview]  │
 *   │                                                 │
 *   │  Accessibility                                  │
 *   │  [ Motor ] [ Vision ] [ Cognitive ] [OneHanded] │
 *   │                                                 │
 *   │  Wallpaper                                      │
 *   │  ┌──────────────────────────────────────────┐   │
 *   │  │  🖼  Wallpaper       Change  ›            │   │
 *   │  └──────────────────────────────────────────┘   │
 *   │                                                 │
 *   │  Icons                                          │
 *   │  Size   [ S ] [ M ] [ L ]                       │
 *   │  Shape  [●circle][■sq][⬟squircle][◆teardrop]   │
 *   │                                                 │
 *   │  [  Apply  ]                                    │
 *   └────────────────────────────────────────────────┘
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
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
import type { AccessibilityProfile, IconShape, Paradigm } from '../context/types';
import { ONBOARDING_KEY } from './OnboardingScreen';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomizationScreenProps = {
  /** 0 = fully closed, 1 = fully open. Animated.Value owned by App.tsx. */
  animValue: Animated.Value;
  onDismiss: () => void;
  isOpen: boolean;
  /** Called when the user taps the Wallpaper entry row. */
  onOpenWallpaperPicker?: () => void;
  /** Called when the user taps the Gestures entry row. */
  onOpenGestureConfig?: () => void;
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

const ICON_SIZES: { id: number; label: string }[] = [
  { id: 48, label: 'S' },
  { id: 60, label: 'M' },
  { id: 72, label: 'L' },
];

const ICON_SHAPES: { id: IconShape; label: string; symbol: string }[] = [
  { id: 'circle',         label: 'Circle',    symbol: '●' },
  { id: 'squircle',       label: 'Squircle',  symbol: '⬟' },
  { id: 'rounded-square', label: 'Square',    symbol: '■' },
  { id: 'teardrop',       label: 'Teardrop',  symbol: '◆' },
];

// ---------------------------------------------------------------------------
// WallpaperRow — tappable entry row that opens the wallpaper picker
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Row icon helpers — pure View icons, no emoji
// ---------------------------------------------------------------------------

function ImageIcon({ color, size }: { color: string; size: number }) {
  const sw = size * 0.1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.7, borderWidth: sw,
        borderColor: color, borderRadius: sw * 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: size * 0.3,
          backgroundColor: color, opacity: 0.35 }} />
        <View style={{ width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11,
          borderWidth: sw, borderColor: color, position: 'absolute', top: sw * 2, left: sw * 2 }} />
      </View>
    </View>
  );
}

function SwipeUpIcon({ color, size }: { color: string; size: number }) {
  const sw = size * 0.1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Upward arrow */}
      <View style={{ width: 0, height: 0,
        borderLeftWidth: size * 0.22, borderRightWidth: size * 0.22,
        borderBottomWidth: size * 0.32,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: color, marginBottom: sw,
      }} />
      <View style={{ width: sw * 1.4, height: size * 0.35,
        borderRadius: sw, backgroundColor: color }} />
      {/* Base line */}
      <View style={{ width: size * 0.7, height: sw, borderRadius: sw / 2,
        backgroundColor: color, marginTop: sw * 1.5 }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// WallpaperRow
const WallpaperRow = memo(function WallpaperRow({
  onPress,
  rowBg,
  rowBorder,
  textPrimary,
  textSecondary,
  accentColor,
}: {
  onPress: () => void;
  rowBg: string;
  rowBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Change wallpaper"
      style={[styles.wallpaperRow, { backgroundColor: rowBg, borderColor: rowBorder }]}
    >
      <ImageIcon color={textSecondary} size={22} />
      <View style={styles.wallpaperRowText}>
        <Text style={[styles.wallpaperRowTitle, { color: textPrimary }]}>Wallpaper</Text>
        <Text style={[styles.wallpaperRowSub, { color: textSecondary }]}>
          Gallery, bundled or Unsplash
        </Text>
      </View>
      <Text style={[styles.wallpaperChevron, { color: accentColor }]}>›</Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// GestureRow — tappable entry row that opens the gesture config screen
// ---------------------------------------------------------------------------

const GestureRow = memo(function GestureRow({
  onPress,
  rowBg,
  rowBorder,
  textPrimary,
  textSecondary,
  accentColor,
}: {
  onPress: () => void;
  rowBg: string;
  rowBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Configure gesture bindings"
      style={[styles.wallpaperRow, { backgroundColor: rowBg, borderColor: rowBorder }]}
    >
      <SwipeUpIcon color={textSecondary} size={22} />
      <View style={styles.wallpaperRowText}>
        <Text style={[styles.wallpaperRowTitle, { color: textPrimary }]}>Gestures</Text>
        <Text style={[styles.wallpaperRowSub, { color: textSecondary }]}>
          Swipe actions for 4 directions
        </Text>
      </View>
      <Text style={[styles.wallpaperChevron, { color: accentColor }]}>›</Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// IconOptionChip — single selectable chip for size or shape
// ---------------------------------------------------------------------------

const IconOptionChip = memo(function IconOptionChip({
  label,
  isActive,
  onPress,
  accentPrimary,
  accentSubtle,
  surfaceBg,
  borderColor,
  textPrimary,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  accentPrimary: string;
  accentSubtle: string;
  surfaceBg: string;
  borderColor: string;
  textPrimary: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      style={[
        styles.iconChip,
        {
          backgroundColor: isActive ? accentSubtle : surfaceBg,
          borderColor: isActive ? accentPrimary : borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.iconChipText,
          { color: isActive ? accentPrimary : textPrimary, fontWeight: isActive ? '700' : '400' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

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
  onOpenWallpaperPicker,
  onOpenGestureConfig,
  style,
}: CustomizationScreenProps) {
  const { semantics, paradigm, activeProfiles, icons, setParadigm, toggleProfile, setIcons } =
    useWeftConfig();
  const insets = useSafeAreaInsets();
  const s = semantics;

  // ── Local pending state — editing happens locally; applies on confirm ──────
  const [localParadigm, setLocalParadigm] = useState<Paradigm>(paradigm);
  const [localProfiles, setLocalProfiles] = useState<AccessibilityProfile[]>(activeProfiles);
  const [localIconSize, setLocalIconSize] = useState<number>(icons.size);
  const [localIconShape, setLocalIconShape] = useState<IconShape>(icons.shape);

  // Sync local state when the drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalParadigm(paradigm);
      setLocalProfiles(activeProfiles);
      setLocalIconSize(icons.size);
      setLocalIconShape(icons.shape);
    }
  }, [isOpen, paradigm, activeProfiles, icons.size, icons.shape]);

  // ── Back handler ──────────────────────────────────────────────────────────
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
    // Sync profiles
    const current = new Set(activeProfiles);
    const next    = new Set(localProfiles);
    for (const p of current) {
      if (!next.has(p)) toggleProfile(p);
    }
    for (const p of next) {
      if (!current.has(p)) toggleProfile(p);
    }
    // Apply icon changes
    setIcons({ size: localIconSize, shape: localIconShape });
    onDismiss();
  }, [
    localParadigm, localProfiles, activeProfiles,
    localIconSize, localIconShape,
    setParadigm, toggleProfile, setIcons, onDismiss,
  ]);

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

  // ── Surface colors ────────────────────────────────────────────────────────
  const cs  = s.surface.customization;
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
            <View style={styles.closeXBar1} />
            <View style={styles.closeXBar2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: cs.textPrimary }]}>
            Customise
          </Text>
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

          {/* ── Wallpaper section ─────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: cs.textSecondary, marginTop: 28 }]}>
            Wallpaper
          </Text>

          <WallpaperRow
            onPress={() => onOpenWallpaperPicker?.()}
            rowBg={cs.backgroundAlt}
            rowBorder={cs.border}
            textPrimary={cs.textPrimary}
            textSecondary={cs.textSecondary}
            accentColor={s.accent.primary}
          />

          {/* ── Gestures section ──────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: cs.textSecondary, marginTop: 28 }]}>
            Gestures
          </Text>

          <GestureRow
            onPress={() => onOpenGestureConfig?.()}
            rowBg={cs.backgroundAlt}
            rowBorder={cs.border}
            textPrimary={cs.textPrimary}
            textSecondary={cs.textSecondary}
            accentColor={s.accent.primary}
          />

          {/* ── Icons section ─────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: cs.textSecondary, marginTop: 28 }]}>
            Icons
          </Text>

          {/* Size row */}
          <View style={styles.iconOptionRow}>
            <Text style={[styles.iconOptionLabel, { color: cs.textSecondary }]}>Size</Text>
            <View style={styles.iconChipGroup}>
              {ICON_SIZES.map(opt => (
                <IconOptionChip
                  key={opt.id}
                  label={opt.label}
                  isActive={localIconSize === opt.id}
                  onPress={() => setLocalIconSize(opt.id)}
                  accentPrimary={s.accent.primary}
                  accentSubtle={s.accent.subtle}
                  surfaceBg={cs.backgroundAlt}
                  borderColor={cs.border}
                  textPrimary={cs.textPrimary}
                />
              ))}
            </View>
          </View>

          {/* Shape row */}
          <View style={[styles.iconOptionRow, { marginTop: 10 }]}>
            <Text style={[styles.iconOptionLabel, { color: cs.textSecondary }]}>Shape</Text>
            <View style={styles.iconChipGroup}>
              {ICON_SHAPES.map(opt => (
                <IconOptionChip
                  key={opt.id}
                  label={opt.symbol}
                  isActive={localIconShape === opt.id}
                  onPress={() => setLocalIconShape(opt.id)}
                  accentPrimary={s.accent.primary}
                  accentSubtle={s.accent.subtle}
                  surfaceBg={cs.backgroundAlt}
                  borderColor={cs.border}
                  textPrimary={cs.textPrimary}
                />
              ))}
            </View>
          </View>
          {/* Shape label row so the user knows which option is which */}
          <View style={styles.iconShapeLabelRow}>
            {ICON_SHAPES.map(opt => (
              <Text
                key={opt.id}
                style={[
                  styles.iconShapeCaption,
                  {
                    color: localIconShape === opt.id ? s.accent.primary : cs.textSecondary,
                    fontWeight: localIconShape === opt.id ? '600' : '400',
                  },
                ]}
              >
                {opt.label}
              </Text>
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
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require('react-native').DevSettings.reload();
              }}
              style={[styles.devResetBtn, { borderColor: s.surface.customization.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.devResetText, { color: s.surface.customization.textSecondary }]}>
                Dev: Reset onboarding
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
  closeXBar1: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '45deg' }],
  },
  closeXBar2: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '-45deg' }],
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

  // ── Wallpaper row ──
  wallpaperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 4,
  },
  wallpaperIcon: {
    fontSize: 22,
  },
  wallpaperRowText: {
    flex: 1,
  },
  wallpaperRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  wallpaperRowSub: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.7,
  },
  wallpaperChevron: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },

  // ── Icon options ──
  iconOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 4,
  },
  iconOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 42,
  },
  iconChipGroup: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  iconChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  iconChipText: {
    fontSize: 14,
  },
  iconShapeLabelRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginHorizontal: 4,
    paddingLeft: 54, // aligns under chips (42 label width + 12 gap)
    gap: 8,
  },
  iconShapeCaption: {
    flex: 1,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
