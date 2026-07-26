/**
 * Weft — ControlCenterScreen
 *
 * Phase 5: Pull-down control panel. Sits as an absolute overlay above the
 * HomeScreen. Opened by a swipe-down gesture from the top of the screen;
 * dismissed by swiping up, tapping the scrim, or pressing the back button.
 *
 * Layout:
 *   - 6 Tile atoms in a 3×2 grid: Wi-Fi, Bluetooth, Do Not Disturb,
 *     Flashlight, Airplane Mode, Rotation Lock
 *   - 2 Slider atoms: Brightness (sun icon), Volume (speaker icon)
 *   - A SectionHeader above each group
 *   - A glass container plate behind the content when paradigm is Glass
 *     (controlled entirely by semantics.component.glassContainer — no branching)
 *
 * Animation:
 *   - Driven by a single Animated.Value (0 = closed, 1 = open) passed in
 *     from the parent. The parent owns the value so it can also drive the
 *     scrim opacity on the HomeScreen layer.
 *   - translateY: panel slides from -PANEL_HEIGHT to 0
 *   - opacity: fades from 0 to 1
 *
 * Glass × Vision cascade:
 *   - When both are active, compose() deepens glassContainer.tint to 92%,
 *     zeroes out plateBackground and chipBackground automatically.
 *   - This component reads those token values; it never checks paradigm or
 *     profiles itself.
 */

import React, { memo, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// BlurView — Glass paradigm panel blur effect.
// Imported with a try/catch-style lazy require so the app doesn't crash if
// the native module isn't linked yet (e.g. first run before npm install).
let BlurView: React.ComponentType<{
  style?: ViewStyle;
  blurType?: string;
  blurAmount?: number;
  reducedTransparencyFallbackColor?: string;
}> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlurView = require('@react-native-community/blur').BlurView;
} catch {
  // Native module not linked — Glass panel will fall back to solid tint.
  BlurView = null;
}

import { useWeftConfig } from '../hooks/useWeftConfig';
import { Tile } from '../components/Tile';
import { Slider } from '../components/Slider';
import { SectionHeader } from '../components/SectionHeader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ControlCenterScreenProps = {
  /** 0 = fully closed, 1 = fully open. Animated.Value owned by the parent. */
  animValue: Animated.Value;
  /** Called when the panel should dismiss (tap scrim, swipe-up, etc.). */
  onDismiss: () => void;
  /** Whether the panel is currently open/opening (gates touch handling). */
  isOpen: boolean;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Control tile definitions
// ---------------------------------------------------------------------------

type ControlTile = {
  id: string;
  label: string;
  /** Unicode symbol used as the tile icon — no external assets required. */
  symbol: string;
};

const CONTROL_TILES: ControlTile[] = [
  { id: 'wifi',     label: 'Wi-Fi',      symbol: '󰖩' },  // nf-md-wifi
  { id: 'bt',       label: 'Bluetooth',  symbol: '󰂯' },  // nf-md-bluetooth
  { id: 'dnd',      label: 'Do Not\nDisturb', symbol: '󰂛' }, // nf-md-bell_off
  { id: 'torch',    label: 'Flashlight', symbol: '󰛌' },  // nf-md-flashlight
  { id: 'airplane', label: 'Airplane',   symbol: '󰀝' },  // nf-md-airplane
  { id: 'rotate',   label: 'Rotation',   symbol: '󰑵' },  // nf-md-screen_rotation
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Logical height of the panel (dp). Must be tall enough for all content. */
const PANEL_HEIGHT = 420;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single symbol icon rendered inside a Tile. */
const SymbolIcon = memo(function SymbolIcon({
  symbol,
  color,
  size,
}: {
  symbol: string;
  color: string;
  size: number;
}) {
  return (
    <Text style={{ color, fontSize: size, textAlign: 'center', includeFontPadding: false }}>
      {symbol}
    </Text>
  );
});

// ---------------------------------------------------------------------------
// ControlCenterScreen
// ---------------------------------------------------------------------------

export const ControlCenterScreen = memo(function ControlCenterScreen({
  animValue,
  onDismiss,
  isOpen,
  style,
}: ControlCenterScreenProps) {
  const { semantics } = useWeftConfig();
  const insets = useSafeAreaInsets();

  const s = semantics;
  const gc = s.component.glassContainer;

  // ── Local toggle state ────────────────────────────────────────────────────
  // In a real launcher these would dispatch to system APIs. For the Phase 5
  // demo they are local UI state, which is all the compose pipeline needs to
  // demonstrate the cascade rule.
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    wifi: true,
    bt: false,
    dnd: false,
    torch: false,
    airplane: false,
    rotate: true,
  });

  const [brightness, setBrightness] = useState(0.6);
  const [volume, setVolume] = useState(0.4);

  const handleTilePress = (id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Animated values ───────────────────────────────────────────────────────
  // translateY: 0 when open, -PANEL_HEIGHT when closed
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-PANEL_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  // opacity: 0 when closed, 1 when open
  const panelOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Scrim behind the panel (darkens HomeScreen content)
  const scrimOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
    extrapolate: 'clamp',
  });

  // ── Background resolution ──────────────────────────────────────────────
  // Glass + BlurView available: panel bg is transparent, BlurView provides
  // the frosted glass effect using the token's blurRadius.
  // Glass + no BlurView (module not linked): fall back to gc.tint solid color.
  // Skeuo / Minimal: use controlCenter surface background (no blur).
  const isGlass = gc !== null;
  const useBlur = isGlass && BlurView !== null;
  const panelBackground = useBlur
    ? 'transparent'
    : isGlass
    ? gc.tint
    : s.surface.controlCenter.background;

  const blurRadius = isGlass ? gc.blurRadius : 0;

  // ── Icon size from tile tokens ─────────────────────────────────────────
  const iconSize = Math.round(s.component.tile.touchTarget * 0.38);

  // ── Tile grid column count — 3 across ────────────────────────────────
  const TILE_COLS = 3;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, style]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {/* ── Scrim — tapping it dismisses the panel ──────────────────── */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.scrim,
            { opacity: scrimOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* ── Panel ───────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.panel,
          {
            paddingTop: insets.top + 12,
            paddingHorizontal: s.layout.screenPaddingH,
            paddingBottom: 24,
            backgroundColor: panelBackground,
            borderBottomLeftRadius: gc !== null ? gc.radius : s.component.widgetCard.radius,
            borderBottomRightRadius: gc !== null ? gc.radius : s.component.widgetCard.radius,
            elevation: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            transform: [{ translateY }],
            opacity: panelOpacity,
          },
        ]}
      >
        {/* ── BlurView for Glass paradigm — absolute fill behind content ── */}
        {useBlur && BlurView !== null && (
          <BlurView
            style={[
              StyleSheet.absoluteFill,
              {
                borderBottomLeftRadius: gc!.radius,
                borderBottomRightRadius: gc!.radius,
              },
            ]}
            blurType={Platform.OS === 'android' ? 'dark' : 'dark'}
            blurAmount={blurRadius}
            reducedTransparencyFallbackColor={gc!.tint}
          />
        )}

        {/* ── Tint overlay on top of blur (glass color) ─────────────── */}
        {useBlur && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: gc!.tint,
                borderBottomLeftRadius: gc!.radius,
                borderBottomRightRadius: gc!.radius,
              },
            ]}
            pointerEvents="none"
          />
        )}
        {/* ── Drag handle ─────────────────────────────────────────── */}
        <View style={styles.handleRow}>
          <View
            style={[
              styles.handle,
              { backgroundColor: s.surface.controlCenter.textSecondary },
            ]}
          />
        </View>

        {/* ── Controls section ───────────────────────────────────── */}
        <SectionHeader label="Controls" />
        <View style={[styles.tileGrid, { gap: s.layout.gridGap, marginTop: 8 }]}>
          {CONTROL_TILES.map(ct => {
            const on = toggles[ct.id] ?? false;
            return (
              <Tile
                key={ct.id}
                icon={
                  <SymbolIcon
                    symbol={ct.symbol}
                    color={on
                      ? s.accent.primary
                      : s.component.tile.iconColor}
                    size={iconSize}
                  />
                }
                label={ct.label}
                status={on ? 'On' : undefined}
                tileState={on ? 'selected' : 'enabled'}
                onPress={() => handleTilePress(ct.id)}
                style={styles.tileCell}
              />
            );
          })}
        </View>

        {/* ── Sliders section ──────────────────────────────────────── */}
        <View style={{ marginTop: s.layout.sectionGap }}>
          <SectionHeader label="Brightness" />
          <View style={styles.sliderRow}>
            <Text
              style={[
                styles.sliderIcon,
                { color: s.surface.controlCenter.textSecondary },
              ]}
            >
              ☀
            </Text>
            <View style={styles.sliderFlex}>
              <Slider
                value={brightness}
                onValueChange={setBrightness}
                accessibilityLabel="Brightness"
              />
            </View>
            <Text
              style={[
                styles.sliderValue,
                {
                  color: s.surface.controlCenter.textSecondary,
                  fontFamily: s.component.appIcon.labelType.fontFamily,
                  fontSize: s.component.appIcon.labelType.fontSize,
                },
              ]}
            >
              {Math.round(brightness * 100)}%
            </Text>
          </View>
        </View>

        <View style={{ marginTop: s.layout.sectionGap }}>
          <SectionHeader label="Volume" />
          <View style={styles.sliderRow}>
            <Text
              style={[
                styles.sliderIcon,
                { color: s.surface.controlCenter.textSecondary },
              ]}
            >
              ♪
            </Text>
            <View style={styles.sliderFlex}>
              <Slider
                value={volume}
                onValueChange={setVolume}
                accessibilityLabel="Volume"
              />
            </View>
            <Text
              style={[
                styles.sliderValue,
                {
                  color: s.surface.controlCenter.textSecondary,
                  fontFamily: s.component.appIcon.labelType.fontFamily,
                  fontSize: s.component.appIcon.labelType.fontSize,
                },
              ]}
            >
              {Math.round(volume * 100)}%
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Styles — structural / layout only. No colours, no token values.
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    // Full-screen container. pointerEvents controlled inline.
    zIndex: 100,
  },
  scrim: {
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: PANEL_HEIGHT,
  },
  handleRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tileCell: {
    // Each tile sizes itself from semantics.component.tile.touchTarget
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  sliderIcon: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  sliderFlex: {
    flex: 1,
  },
  sliderValue: {
    width: 36,
    textAlign: 'right',
  },
});
