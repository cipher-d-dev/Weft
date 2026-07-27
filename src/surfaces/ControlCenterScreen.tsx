/**
 * Weft — ControlCenterScreen
 *
 * Phase 5 (complete): Pull-down control panel with real system API integration
 * via WeftControlModule (Kotlin native module).
 *
 * Controls:
 *   6 toggle tiles: Wi-Fi, Bluetooth, Do Not Disturb, Flashlight,
 *                   Airplane Mode, Rotation Lock (local-only)
 *   2 sliders:      Brightness (writes Settings.System.SCREEN_BRIGHTNESS)
 *                   Volume (writes AudioManager.STREAM_MUSIC)
 *
 * System API behaviour per control:
 *   Wi-Fi          → direct toggle Android ≤9, opens WiFi settings on Android 10+
 *   Bluetooth      → direct toggle Android ≤12, opens BT settings on Android 13+
 *   DND            → requires ACCESS_NOTIFICATION_POLICY; opens settings if missing
 *   Flashlight     → CameraManager.setTorchMode(), always direct
 *   Airplane mode  → always opens Settings (Android restriction since 4.2)
 *   Brightness     → requires WRITE_SETTINGS; opens permission screen if missing
 *   Volume         → AudioManager.STREAM_MUSIC, always direct, no permission needed
 *
 * Animation:
 *   Driven by a single Animated.Value (0=closed, 1=open) owned by App.tsx.
 *   Panel slides from -PANEL_HEIGHT to 0; scrim fades 0→0.45.
 *   Swipe-up on the panel also dismisses.
 *
 * Glass × Vision cascade:
 *   compose() adjusts glassContainer tokens automatically — this component
 *   never checks paradigm or profiles directly.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// BlurView — lazy require so the app doesn't crash if not linked yet
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
  BlurView = null;
}

import { useWeftConfig } from '../hooks/useWeftConfig';
import { Tile } from '../components/Tile';
import { Slider } from '../components/Slider';
import { SectionHeader } from '../components/SectionHeader';
import {
  readAllControls,
  SystemControls,
  DEFAULT_CONTROL_STATE,
  type SystemControlState,
} from '../hooks/useSystemControls';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ControlCenterScreenProps = {
  animValue: Animated.Value;
  onDismiss: () => void;
  isOpen: boolean;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Control tile definitions
// ---------------------------------------------------------------------------

type ControlTile = {
  id: keyof Pick<SystemControlState, 'wifi' | 'bluetooth' | 'dnd' | 'flashlight' | 'airplane'> | 'rotate';
  label: string;
  symbol: string;
  symbolOn?: string;
};

const CONTROL_TILES: ControlTile[] = [
  { id: 'wifi',      label: 'Wi-Fi',          symbol: '⌘',  symbolOn: '⌘'  },
  { id: 'bluetooth', label: 'Bluetooth',       symbol: '⊞',  symbolOn: '⊞'  },
  { id: 'dnd',       label: 'Do Not\nDisturb', symbol: '🔕', symbolOn: '🔕' },
  { id: 'flashlight',label: 'Flashlight',      symbol: '⬡',  symbolOn: '⬡'  },
  { id: 'airplane',  label: 'Airplane',        symbol: '✈',  symbolOn: '✈'  },
  { id: 'rotate',    label: 'Rotation',        symbol: '⟳',  symbolOn: '⟳'  },
];

const PANEL_HEIGHT = 440;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

  // ── System control state ──────────────────────────────────────────────────
  const [controls, setControls] = useState<SystemControlState>(DEFAULT_CONTROL_STATE);
  const [loading, setLoading] = useState(true);

  // Read real state whenever panel opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    readAllControls().then(state => {
      if (!cancelled) {
        setControls(state);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // ── Toggle handler — calls native write, then updates local state ─────────
  const handleTilePress = useCallback(async (
    id: ControlTile['id'],
    currentValue: boolean,
  ) => {
    const next = !currentValue;

    // Optimistic update
    setControls(prev => ({ ...prev, [id]: next }));

    let result: Awaited<ReturnType<typeof SystemControls.setWifi>>;

    switch (id) {
      case 'wifi':
        result = await SystemControls.setWifi(next);
        break;
      case 'bluetooth':
        result = await SystemControls.setBluetooth(next);
        break;
      case 'dnd':
        result = await SystemControls.setDnd(next);
        break;
      case 'flashlight':
        result = await SystemControls.setFlashlight(next);
        break;
      case 'airplane':
        result = await SystemControls.setAirplaneMode(next);
        break;
      case 'rotate':
        // Rotation lock is local UI state only — no system API available
        // from a non-system app without WRITE_SETTINGS at system level.
        return;
      default:
        return;
    }

    // If the action opened a settings panel or required a permission,
    // revert the optimistic update since state didn't actually change.
    if ('openedSettings' in result || 'permissionRequired' in result || 'noop' in result) {
      setControls(prev => ({ ...prev, [id]: currentValue }));
    }
  }, []);

  // ── Slider handlers — call native write on every value change ────────────
  const handleBrightnessChange = useCallback(async (v: number) => {
    setControls(prev => ({ ...prev, brightness: v }));
    await SystemControls.setBrightness(v);
  }, []);

  const handleVolumeChange = useCallback(async (v: number) => {
    setControls(prev => ({ ...prev, volume: v }));
    await SystemControls.setVolume(v);
  }, []);

  // ── Swipe-up-to-close PanResponder on the panel ───────────────────────────
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const panelSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        gs.dy < -30 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dy < -60) onDismissRef.current();
      },
    }),
  ).current;

  // ── Animated values ───────────────────────────────────────────────────────
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-PANEL_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  const panelOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const scrimOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
    extrapolate: 'clamp',
  });

  // ── Background resolution ─────────────────────────────────────────────────
  const isGlass = gc !== null;
  const useBlur = isGlass && BlurView !== null;
  const panelBackground = useBlur
    ? 'transparent'
    : isGlass
    ? gc.tint
    : s.surface.controlCenter.background;
  const blurRadius = isGlass ? gc.blurRadius : 0;
  const panelRadius = gc !== null ? gc.radius : s.component.widgetCard.radius;

  const iconSize = Math.round(s.component.tile.touchTarget * 0.38);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, style]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {/* Scrim */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrimOpacity }]}
        />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            paddingTop: insets.top + 12,
            paddingHorizontal: s.layout.screenPaddingH,
            paddingBottom: 24,
            backgroundColor: panelBackground,
            borderBottomLeftRadius: panelRadius,
            borderBottomRightRadius: panelRadius,
            elevation: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            transform: [{ translateY }],
            opacity: panelOpacity,
          },
        ]}
        {...panelSwipe.panHandlers}
      >
        {/* BlurView for Glass paradigm */}
        {useBlur && BlurView !== null && (
          <BlurView
            style={[
              StyleSheet.absoluteFill,
              { borderBottomLeftRadius: panelRadius, borderBottomRightRadius: panelRadius },
            ]}
            blurType={Platform.OS === 'android' ? 'dark' : 'dark'}
            blurAmount={blurRadius}
            reducedTransparencyFallbackColor={gc!.tint}
          />
        )}

        {/* Glass tint overlay */}
        {useBlur && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: gc!.tint,
                borderBottomLeftRadius: panelRadius,
                borderBottomRightRadius: panelRadius,
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View
            style={[styles.handle, { backgroundColor: s.surface.controlCenter.textSecondary }]}
          />
        </View>

        {/* Controls section */}
        <SectionHeader label="Controls" />
        <View style={[styles.tileGrid, { gap: s.layout.gridGap, marginTop: 8, opacity: loading ? 0.4 : 1 }]}>
          {CONTROL_TILES.map(ct => {
            const on = ct.id === 'rotate'
              ? (controls as Record<string, boolean>)['rotate'] ?? false
              : (controls[ct.id as keyof SystemControlState] as boolean) ?? false;

            return (
              <Tile
                key={ct.id}
                icon={
                  <SymbolIcon
                    symbol={on && ct.symbolOn ? ct.symbolOn : ct.symbol}
                    color={on ? s.accent.primary : s.component.tile.iconColor}
                    size={iconSize}
                  />
                }
                label={ct.label}
                status={on ? 'On' : undefined}
                tileState={on ? 'selected' : 'enabled'}
                onPress={() => handleTilePress(ct.id, on)}
                style={styles.tileCell}
              />
            );
          })}
        </View>

        {/* Brightness slider */}
        <View style={{ marginTop: s.layout.sectionGap }}>
          <SectionHeader label="Brightness" />
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderIcon, { color: s.surface.controlCenter.textSecondary }]}>
              ☀
            </Text>
            <View style={styles.sliderFlex}>
              <Slider
                value={controls.brightness}
                onValueChange={handleBrightnessChange}
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
              {Math.round(controls.brightness * 100)}%
            </Text>
          </View>
        </View>

        {/* Volume slider */}
        <View style={{ marginTop: s.layout.sectionGap }}>
          <SectionHeader label="Volume" />
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderIcon, { color: s.surface.controlCenter.textSecondary }]}>
              ♪
            </Text>
            <View style={styles.sliderFlex}>
              <Slider
                value={controls.volume}
                onValueChange={handleVolumeChange}
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
              {Math.round(controls.volume * 100)}%
            </Text>
          </View>
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
  tileCell: {},
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
