/**
 * Weft — AtomTestScreen
 *
 * Dev-only screen that renders every atom in all three paradigms side by side.
 * Confirms:
 *   1. Every atom derives its style entirely from semantics (no inline overrides)
 *   2. Switching paradigm updates all atoms simultaneously
 *   3. No atom contains paradigm-specific branching
 *   4. AppIcon renders identically across paradigm switches
 *   5. PreviewCard shows independent composed semantics per paradigm
 *
 * This screen is replaced by real surface routing in Phase 4+.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWeftConfig } from '../hooks/useWeftConfig';
import { Tile } from '../components/Tile';
import { Toggle } from '../components/Toggle';
import { Slider } from '../components/Slider';
import { SectionHeader } from '../components/SectionHeader';
import { WidgetCard } from '../components/WidgetCard';
import { AppIcon } from '../components/AppIcon';
import { Dock } from '../components/Dock';
import { PreviewCard } from '../components/PreviewCard';
import type { Paradigm, AccessibilityProfile } from '../context/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARADIGMS: Paradigm[] = ['skeuo', 'glass', 'minimal'];
const PROFILES: AccessibilityProfile[] = ['motor', 'vision', 'cognitive', 'oneHanded'];

// A simple coloured square as a stand-in app icon image
function MockIcon({ color }: { color: string }) {
  return (
    <View style={[styles.mockIcon, { backgroundColor: color }]} />
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function AtomTestScreen(): React.JSX.Element {
  const { semantics, paradigm, activeProfiles, setParadigm, toggleProfile } =
    useWeftConfig();
  const insets = useSafeAreaInsets();

  const s = semantics;

  // Local state for interactive atoms
  const [toggleVal, setToggleVal] = useState(false);
  const [sliderVal, setSliderVal] = useState(0.4);

  // Resolve surface background (glass uses transparent — need fallback)
  const surfaceBg =
    s.surface.home.background === 'transparent'
      ? '#0B2438'
      : s.surface.home.background;

  return (
    <View style={[styles.root, { backgroundColor: surfaceBg, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={paradigm === 'skeuo' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: s.layout.screenPaddingH },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.screenTitle,
            { color: s.surface.home.textPrimary },
          ]}
        >
          weft
        </Text>

        {/* ── Paradigm switcher ────────────────────────────────────────── */}
        <SectionHeader label="Paradigm" />
        <View style={styles.row}>
          {PARADIGMS.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setParadigm(p)}
              activeOpacity={0.75}
              style={[
                styles.switchChip,
                {
                  backgroundColor:
                    paradigm === p ? s.accent.primary : s.component.tile.background,
                  borderColor:
                    paradigm === p ? s.accent.primary : s.component.tile.border,
                  borderRadius: s.component.tile.radius,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: s.component.tile.labelType.fontFamily,
                  fontSize: s.component.tile.labelType.fontSize,
                  fontWeight: s.component.tile.labelType.fontWeight,
                  color: paradigm === p ? s.accent.onAccent : s.component.tile.labelColor,
                }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Profile toggles ─────────────────────────────────────────── */}
        <SectionHeader label="Profiles" />
        <View style={styles.row}>
          {PROFILES.map(prof => {
            const on = activeProfiles.includes(prof);
            return (
              <TouchableOpacity
                key={prof}
                onPress={() => toggleProfile(prof)}
                activeOpacity={0.75}
                style={[
                  styles.switchChip,
                  {
                    backgroundColor: on ? s.accent.subtle : s.component.tile.background,
                    borderColor: on ? s.accent.primary : s.component.tile.border,
                    borderRadius: s.component.tile.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: s.component.tile.labelType.fontFamily,
                    fontSize: s.component.tile.labelType.fontSize,
                    fontWeight: s.component.tile.labelType.fontWeight,
                    color: on ? s.accent.primary : s.component.tile.labelColor,
                  }}
                >
                  {prof}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tile ────────────────────────────────────────────────────── */}
        <SectionHeader label="Tile" />
        <View style={styles.row}>
          <Tile
            icon={<MockIcon color={s.accent.primary} />}
            label="Settings"
            tileState="enabled"
          />
          <Tile
            icon={<MockIcon color={s.accent.primary} />}
            label="Wi-Fi"
            status="On"
            tileState="selected"
          />
          <Tile
            icon={<MockIcon color={s.surface.home.textDisabled} />}
            label="Bluetooth"
            tileState="disabled"
          />
          <Tile
            icon={<MockIcon color={s.accent.primary} />}
            label="Camera"
            tileState="enabled"
          />
        </View>

        {/* ── Toggle ──────────────────────────────────────────────────── */}
        <SectionHeader label="Toggle" />
        <View style={[styles.row, styles.rowCenter]}>
          <Toggle
            value={toggleVal}
            onValueChange={setToggleVal}
            accessibilityLabel="Example toggle"
          />
          <Toggle
            value={true}
            onValueChange={() => {}}
            accessibilityLabel="Always on"
          />
          <Toggle
            value={false}
            onValueChange={() => {}}
            disabled
            accessibilityLabel="Disabled toggle"
          />
        </View>

        {/* ── Slider ──────────────────────────────────────────────────── */}
        <SectionHeader label="Slider" />
        <Slider
          value={sliderVal}
          onValueChange={setSliderVal}
          accessibilityLabel="Example slider"
        />

        {/* ── SectionHeader (specimens) ───────────────────────────────── */}
        <SectionHeader label="Section Header Specimens" />
        <SectionHeader label="Connectivity" />
        <SectionHeader label="Display" />
        <SectionHeader label="Sound" />

        {/* ── WidgetCard ──────────────────────────────────────────────── */}
        <SectionHeader label="Widget Card" />
        <WidgetCard>
          <Text
            style={{
              fontFamily: s.component.tile.labelType.fontFamily,
              fontSize: s.component.tile.labelType.fontSize,
              color: s.surface.home.textPrimary,
            }}
          >
            Widget content goes here
          </Text>
          <Text
            style={{
              fontFamily: s.component.appIcon.labelType.fontFamily,
              fontSize: s.component.appIcon.labelType.fontSize,
              color: s.surface.home.textSecondary,
              marginTop: 4,
            }}
          >
            Adapts to paradigm via tokens
          </Text>
        </WidgetCard>

        {/* ── AppIcon ─────────────────────────────────────────────────── */}
        <SectionHeader label="App Icon (paradigm-invariant)" />
        <View style={styles.row}>
          {['#E53935', '#43A047', '#1E88E5', '#FB8C00'].map((color, i) => (
            <AppIcon
              key={color}
              icon={<MockIcon color={color} />}
              label={['Phone', 'Maps', 'Mail', 'Clock'][i]}
            />
          ))}
        </View>

        {/* ── PreviewCard ─────────────────────────────────────────────── */}
        <SectionHeader label="Preview Cards (independent compose)" />
        <View style={[styles.row, styles.previewRow]}>
          {PARADIGMS.map(p => (
            <View key={p} style={styles.previewItem}>
              <PreviewCard paradigm={p} activeProfiles={activeProfiles} />
              <Text
                style={[
                  styles.previewLabel,
                  {
                    fontFamily: s.component.appIcon.labelType.fontFamily,
                    fontSize: s.component.appIcon.labelType.fontSize,
                    color: s.surface.home.textSecondary,
                  },
                ]}
              >
                {p}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Dock ────────────────────────────────────────────────────── */}
        {/* Dock is position:absolute so we give it a spacer to avoid overlap */}
        <View style={styles.dockSpacer} />
      </ScrollView>

      {/* Dock at screen bottom */}
      <Dock>
        {['#E53935', '#43A047', '#1E88E5', '#8E24AA'].map((color, i) => (
          <AppIcon
            key={color}
            icon={<MockIcon color={color} />}
            label={['Phone', 'Maps', 'Browser', 'Music'][i]}
          />
        ))}
      </Dock>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Structural styles only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: 24,
    paddingBottom: 120,
    gap: 8,
  },
  screenTitle: {
    fontSize: 42,
    fontFamily: 'Fraunces-VariableFont_SOFT,WONK,opsz,wght',
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  rowCenter: {
    alignItems: 'center',
  },
  switchChip: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewRow: {
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
  },
  previewItem: {
    alignItems: 'center',
    gap: 6,
  },
  previewLabel: {
    textTransform: 'capitalize',
  },
  mockIcon: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  dockSpacer: {
    height: 20,
  },
});
