/**
 * Weft — CustomizationDrawer
 *
 * Temporary pre-Phase-6 customization entry point. A bottom-sheet style
 * overlay that lets you switch paradigm and toggle accessibility profiles
 * during development and demo.
 *
 * This is NOT the Phase 6 Customization surface — that surface has a
 * live PreviewCard, paradigm specimen tiles, and the full design treatment.
 * This is a functional stand-in so paradigm/profile switching is accessible
 * from the home dock before Phase 6 is built.
 *
 * Architecture mirrors ControlCenterScreen: animValue (0=closed, 1=open)
 * is owned by App.tsx and passed in. The drawer slides up from the bottom.
 */

import React, { memo } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWeftConfig } from '../hooks/useWeftConfig';
import type { AccessibilityProfile, Paradigm } from '../context/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomizationDrawerProps = {
  /** 0 = fully closed, 1 = fully open. */
  animValue: Animated.Value;
  onDismiss: () => void;
  isOpen: boolean;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAWER_HEIGHT = 320;

const PARADIGMS: { id: Paradigm; label: string; description: string }[] = [
  { id: 'skeuo',   label: 'Skeuomorphic', description: 'Warm & tactile' },
  { id: 'glass',   label: 'Glass',        description: 'Frosted & airy' },
  { id: 'minimal', label: 'Minimal',      description: 'Flat & focused' },
];

const PROFILES: { id: AccessibilityProfile; label: string }[] = [
  { id: 'motor',     label: 'Motor' },
  { id: 'vision',    label: 'Vision' },
  { id: 'cognitive', label: 'Cognitive' },
  { id: 'oneHanded', label: 'One-Handed' },
];

// ---------------------------------------------------------------------------
// CustomizationDrawer
// ---------------------------------------------------------------------------

export const CustomizationDrawer = memo(function CustomizationDrawer({
  animValue,
  onDismiss,
  isOpen,
  style,
}: CustomizationDrawerProps) {
  const { semantics, paradigm, activeProfiles, setParadigm, toggleProfile } =
    useWeftConfig();
  const insets = useSafeAreaInsets();

  const s = semantics;

  // Slide up from bottom
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_HEIGHT + insets.bottom, 0],
    extrapolate: 'clamp',
  });

  const panelOpacity = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  const scrimOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
    extrapolate: 'clamp',
  });

  // Panel background — always use the controlCenter surface bg so it
  // reads well regardless of paradigm. Glass uses a solid dark tone here
  // since we can't blur without a native module.
  const panelBg = paradigm === 'glass'
    ? '#0D1F2D'
    : s.surface.controlCenter.background;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, style]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {/* Scrim */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: scrimOpacity }]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: panelBg,
            borderColor: s.surface.controlCenter.border,
            transform: [{ translateY }],
            opacity: panelOpacity,
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: s.surface.controlCenter.textSecondary }]} />
        </View>

        {/* Header */}
        <Text
          style={[
            styles.heading,
            {
              color: s.surface.controlCenter.textPrimary,
              fontFamily: s.component.appIcon.labelType.fontFamily,
              fontSize: 17,
              fontWeight: '600',
            },
          ]}
        >
          Customise
        </Text>

        {/* Paradigm row */}
        <Text style={[styles.sectionLabel, { color: s.surface.controlCenter.textSecondary }]}>
          Paradigm
        </Text>
        <View style={styles.paradigmRow}>
          {PARADIGMS.map(p => {
            const active = paradigm === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setParadigm(p.id)}
                style={[
                  styles.paradigmChip,
                  {
                    backgroundColor: active
                      ? s.accent.primary
                      : s.surface.controlCenter.backgroundAlt,
                    borderColor: active
                      ? s.accent.primary
                      : s.surface.controlCenter.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.paradigmLabel,
                    {
                      color: active
                        ? s.accent.onAccent
                        : s.surface.controlCenter.textPrimary,
                      fontFamily: s.component.appIcon.labelType.fontFamily,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {p.label}
                </Text>
                <Text
                  style={[
                    styles.paradigmDesc,
                    {
                      color: active
                        ? s.accent.onAccent
                        : s.surface.controlCenter.textSecondary,
                      fontFamily: s.component.appIcon.labelType.fontFamily,
                    },
                  ]}
                >
                  {p.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Profiles row */}
        <Text style={[styles.sectionLabel, { color: s.surface.controlCenter.textSecondary }]}>
          Accessibility
        </Text>
        <View style={styles.profileRow}>
          {PROFILES.map(pr => {
            const active = activeProfiles.includes(pr.id);
            return (
              <TouchableOpacity
                key={pr.id}
                onPress={() => toggleProfile(pr.id)}
                style={[
                  styles.profileChip,
                  {
                    backgroundColor: active
                      ? s.accent.subtle
                      : s.surface.controlCenter.backgroundAlt,
                    borderColor: active
                      ? s.accent.primary
                      : s.surface.controlCenter.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.profileLabel,
                    {
                      color: active
                        ? s.accent.primary
                        : s.surface.controlCenter.textSecondary,
                      fontFamily: s.component.appIcon.labelType.fontFamily,
                      fontWeight: active ? '600' : '400',
                    },
                  ]}
                >
                  {pr.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    zIndex: 200,  // above ControlCenter (z:100)
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    minHeight: DRAWER_HEIGHT,
  },
  handleRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  heading: {
    marginBottom: 16,
    fontSize: 17,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  paradigmRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  paradigmChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  paradigmLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  paradigmDesc: {
    fontSize: 10,
    opacity: 0.8,
  },
  profileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  profileLabel: {
    fontSize: 12,
  },
});
