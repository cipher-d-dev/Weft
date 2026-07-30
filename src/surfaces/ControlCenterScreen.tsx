/**
 * Weft — ControlCenterScreen (Material You / One UI redesign)
 *
 * Design language:
 *  - Large rounded pill tiles (2-column grid) inspired by Android 12+ Quick Settings
 *  - Active tiles use tonal fill (accent surface) + filled icon; inactive use muted surface
 *  - Real MaterialCommunityIcons — no more hand-drawn View icons
 *  - Thicker sliders with icon + label + live percentage value
 *  - Drag handle at top, panel title, footer with Customise shortcut
 *  - Permissions (CAMERA, BLUETOOTH_CONNECT, POST_NOTIFICATIONS) requested
 *    on first CC open via PermissionsAndroid.requestMultiple
 *  - Swipe-up or tap scrim to dismiss
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

let BlurView: React.ComponentType<{
  style?: ViewStyle;
  blurType?: string;
  blurAmount?: number;
  reducedTransparencyFallbackColor?: string;
}> | null = null;
try {
  BlurView = require('@react-native-community/blur').BlurView;
} catch {
  BlurView = null;
}

import { useWeftConfig } from '../hooks/useWeftConfig';
import { Slider } from '../components/Slider';
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
  onOpenCustomization?: () => void;
  style?: ViewStyle;
};

type ControlId = 'wifi' | 'bluetooth' | 'dnd' | 'flashlight' | 'airplane' | 'rotate';

type ControlDef = {
  id: ControlId;
  label: string;
  iconOn: string;   // MaterialCommunityIcons name when active
  iconOff: string;  // MaterialCommunityIcons name when inactive
};

const CONTROLS: ControlDef[] = [
  { id: 'wifi',       label: 'Wi-Fi',      iconOn: 'wifi',                  iconOff: 'wifi-off'            },
  { id: 'bluetooth',  label: 'Bluetooth',  iconOn: 'bluetooth',             iconOff: 'bluetooth-off'       },
  { id: 'dnd',        label: 'Focus',      iconOn: 'moon-waning-crescent',  iconOff: 'bell-outline'        },
  { id: 'flashlight', label: 'Torch',      iconOn: 'flashlight',            iconOff: 'flashlight-off'      },
  { id: 'airplane',   label: 'Airplane',   iconOn: 'airplane',              iconOff: 'airplane-off'        },
  { id: 'rotate',     label: 'Rotation',   iconOn: 'screen-rotation',       iconOff: 'screen-rotation-lock'},
];

const PANEL_HEIGHT = 520;

// ---------------------------------------------------------------------------
// Permission pre-grant
// ---------------------------------------------------------------------------

async function requestPermissions() {
  if (Platform.OS !== 'android') return;
  try {
    const perms: string[] = [
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
    // POST_NOTIFICATIONS only exists on Android 13+
    if ((PermissionsAndroid.PERMISSIONS as Record<string, string>).POST_NOTIFICATIONS) {
      perms.push((PermissionsAndroid.PERMISSIONS as Record<string, string>).POST_NOTIFICATIONS);
    }
    await PermissionsAndroid.requestMultiple(perms as Parameters<typeof PermissionsAndroid.requestMultiple>[0]);
  } catch {
    // Best-effort
  }
}

// Module-level flag so permissions are only asked once per JS session
const permissionsRequested = { current: false };

// ---------------------------------------------------------------------------
// Tile — large rounded pill, 2-column grid
// ---------------------------------------------------------------------------

const ControlTile = memo(function ControlTile({
  def,
  on,
  loading,
  onPress,
  accentColor,
  accentSurface,
  surfaceColor,
  borderColor,
  textPrimary,
  textSecondary,
  tileRadius,
}: {
  def: ControlDef;
  on: boolean;
  loading: boolean;
  onPress: () => void;
  accentColor: string;
  accentSurface: string;   // tonal fill when on (lower opacity accent)
  surfaceColor: string;    // tile background when off
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  tileRadius: number;
}) {
  const bg        = on ? accentSurface : surfaceColor;
  const iconColor = on ? accentColor   : textSecondary;
  const labelCol  = on ? accentColor   : textPrimary;
  const iconName  = on ? def.iconOn    : def.iconOff;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      disabled={loading}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={def.label}
      style={[
        styles.tile,
        {
          backgroundColor: bg,
          borderColor: on ? accentColor : borderColor,
          borderRadius: tileRadius,
          opacity: loading ? 0.45 : 1,
        },
      ]}
    >
      <Icon name={iconName} size={26} color={iconColor} style={styles.tileIcon} />
      <Text style={[styles.tileLabel, { color: labelCol }]} numberOfLines={1}>
        {def.label}
      </Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// ControlCenterScreen
// ---------------------------------------------------------------------------

export const ControlCenterScreen = memo(function ControlCenterScreen({
  animValue,
  onDismiss,
  isOpen,
  onOpenCustomization,
  style,
}: ControlCenterScreenProps) {
  const { semantics } = useWeftConfig();
  const insets = useSafeAreaInsets();

  const s  = semantics;
  const gc = s.component.glassContainer;

  const useBlur    = s.component.glassContainer !== null && BlurView !== null;
  const panelRadius = 28;
  const tileRadius  = 20;

  // Surface / accent tokens — derive tonal surface from accent
  const bg          = s.surface.controlCenter.background;
  const textPrimary = s.surface.controlCenter.textPrimary;
  const textSec     = s.surface.controlCenter.textSecondary;
  const accent      = s.accent;
  // Tonal surface: accent at low opacity over the panel bg
  const accentSurface = accent.subtle;
  const tileSurface   = s.component.tile.background;
  const tileBorder    = s.component.tile.border;

  // ── System state ──────────────────────────────────────────────────────────
  const [controls, setControls] = useState<SystemControlState>(DEFAULT_CONTROL_STATE);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (!permissionsRequested.current) {
      permissionsRequested.current = true;
      requestPermissions();
    }
    let cancelled = false;
    setLoading(true);
    readAllControls().then(state => {
      if (!cancelled) { setControls(state); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // ── Toggle handler ────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (id: ControlId, current: boolean) => {
    const next = !current;
    setControls(prev => ({ ...prev, [id]: next }));
    let result;
    switch (id) {
      case 'wifi':       result = await SystemControls.setWifi(next);           break;
      case 'bluetooth':  result = await SystemControls.setBluetooth(next);      break;
      case 'dnd':        result = await SystemControls.setDnd(next);            break;
      case 'flashlight': result = await SystemControls.setFlashlight(next);     break;
      case 'airplane':   result = await SystemControls.setAirplaneMode(next);   break;
      case 'rotate':     return;
      default:           return;
    }
    if (result && ('openedSettings' in result || 'permissionRequired' in result || 'noop' in result)) {
      setControls(prev => ({ ...prev, [id]: current }));
    }
  }, []);

  // ── Slider handlers ───────────────────────────────────────────────────────
  const handleBrightness = useCallback(async (v: number) => {
    setControls(prev => ({ ...prev, brightness: v }));
    await SystemControls.setBrightness(v);
  }, []);

  const handleVolume = useCallback(async (v: number) => {
    setControls(prev => ({ ...prev, volume: v }));
    await SystemControls.setVolume(v);
  }, []);

  // ── Swipe-up to dismiss ───────────────────────────────────────────────────
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const panelSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) =>
        gs.dy < -30 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
      onPanResponderRelease: (_e, gs) => {
        if (gs.dy < -60) onDismissRef.current();
      },
    }),
  ).current;

  // ── Animated values ───────────────────────────────────────────────────────
  const translateY = animValue.interpolate({
    inputRange: [0, 1], outputRange: [-PANEL_HEIGHT, 0], extrapolate: 'clamp',
  });
  const panelOpacity = animValue.interpolate({
    inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp',
  });
  const scrimOpacity = animValue.interpolate({
    inputRange: [0, 1], outputRange: [0, 0.45], extrapolate: 'clamp',
  });

  if (!isOpen && animValue === animValue) {
    // keep mounted for animation; rely on pointer-events to block interaction
  }

  const panelTop = insets.top;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, style]}
      pointerEvents={isOpen ? 'box-none' : 'none'}
    >
      {/* Scrim */}
      <TouchableWithoutFeedback onPress={onDismiss} accessible={false}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.scrim,
            { opacity: scrimOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            top: panelTop,
            borderBottomLeftRadius: panelRadius,
            borderBottomRightRadius: panelRadius,
            backgroundColor: bg,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.28,
            shadowRadius: 24,
            elevation: 20,
            transform: [{ translateY }],
            opacity: panelOpacity,
          },
        ]}
        {...panelSwipe.panHandlers}
      >
        {/* Glass blur layer */}
        {useBlur && BlurView && (
          <BlurView
            style={StyleSheet.flatten([StyleSheet.absoluteFill, {
              borderBottomLeftRadius: panelRadius,
              borderBottomRightRadius: panelRadius,
            }])}
            blurType="dark"
            blurAmount={gc!.blurRadius}
            reducedTransparencyFallbackColor={gc!.tint}
          />
        )}

        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: textSec }]} />
        </View>

        {/* Panel title */}
        <Text style={[styles.panelTitle, { color: textPrimary }]}>
          Quick Settings
        </Text>

        {/* 2-column tile grid */}
        <View style={styles.tileGrid}>
          {CONTROLS.map(def => {
            const val = controls[def.id as keyof SystemControlState];
            const isOn = typeof val === 'boolean' ? val : false;
            return (
              <ControlTile
                key={def.id}
                def={def}
                on={isOn}
                loading={loading}
                onPress={() => handleToggle(def.id, isOn)}
                accentColor={accent.primary}
                accentSurface={accentSurface}
                surfaceColor={tileSurface}
                borderColor={tileBorder}
                textPrimary={textPrimary}
                textSecondary={textSec}
                tileRadius={tileRadius}
              />
            );
          })}
        </View>

        {/* Brightness slider */}
        <View style={styles.sliderRow}>
          <Icon name="brightness-6" size={20} color={textSec} style={styles.sliderIcon} />
          <View style={styles.sliderTrack}>
            <Slider
              value={controls.brightness}
              onValueChange={handleBrightness}
            />
          </View>
          <Text style={[styles.sliderValue, { color: textSec }]}>
            {Math.round(controls.brightness * 100)}%
          </Text>
        </View>

        {/* Volume slider */}
        <View style={styles.sliderRow}>
          <Icon name="volume-high" size={20} color={textSec} style={styles.sliderIcon} />
          <View style={styles.sliderTrack}>
            <Slider
              value={controls.volume}
              onValueChange={handleVolume}
            />
          </View>
          <Text style={[styles.sliderValue, { color: textSec }]}>
            {Math.round(controls.volume * 100)}%
          </Text>
        </View>

        {/* Footer — Customise button */}
        {onOpenCustomization && (
          <TouchableOpacity
            style={[styles.footerBtn, { borderColor: tileBorder }]}
            onPress={() => { onDismiss(); setTimeout(onOpenCustomization, 180); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open Customise"
          >
            <Icon name="tune-variant" size={18} color={textSec} />
            <Text style={[styles.footerBtnLabel, { color: textSec }]}>Customise</Text>
          </TouchableOpacity>
        )}
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
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.55,
  },
  // 2-column grid of large pill tiles
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 18,
  },
  tile: {
    // Each tile is ~47% wide so two fit per row with the gap
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 10,
  },
  tileIcon: {
    // fixed size slot so label always starts at the same offset
  },
  tileLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  // Sliders
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  sliderIcon: {
    width: 24,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
  },
  sliderValue: {
    width: 38,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
  },
  // Footer
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  footerBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
