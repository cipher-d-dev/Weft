/**
 * Weft — GestureConfigScreen (v2)
 *
 * Modern gesture configuration screen.
 *
 * Layout:
 *   - Full-screen dark surface
 *   - Back button + title header
 *   - Central phone diagram with 4 swipe arrows radiating outward
 *   - Tapping any arrow/card opens an animated bottom sheet picker
 *   - Bottom sheet shows all 6 actions as a tight icon + label list
 *
 * All colours and radii come from semantics tokens.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWeftConfig } from '../hooks/useWeftConfig';
import type { GestureAction, GestureBindings } from '../context/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Direction = keyof GestureBindings;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIONS: GestureAction[] = [
  'none',
  'allApps',
  'quickSettings',
  'notifications',
  'controlCenter',
  'recentApps',
];

const ACTION_META: Record<GestureAction, { label: string; description: string }> = {
  none:          { label: 'None',           description: 'No action'                  },
  allApps:       { label: 'All Apps',       description: 'Open app drawer'            },
  quickSettings: { label: 'Quick Settings', description: 'System quick panel'         },
  notifications: { label: 'Notifications',  description: 'Notification shade'         },
  controlCenter: { label: 'Control Center', description: 'Weft control panel'         },
  recentApps:    { label: 'Recent Apps',    description: 'App switcher'               },
};

const DIRECTION_META: Record<Direction, { label: string; angle: number }> = {
  swipeUp:    { label: 'Swipe Up',    angle: 270 },
  swipeDown:  { label: 'Swipe Down',  angle: 90  },
  swipeLeft:  { label: 'Swipe Left',  angle: 180 },
  swipeRight: { label: 'Swipe Right', angle: 0   },
};

const { width: SW, height: SH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Micro icons — pure View, no deps
// ---------------------------------------------------------------------------

function ArrowIcon({ angle, color, size = 18 }: { angle: number; color: string; size?: number }) {
  const sw = Math.max(2, size * 0.12);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center',
      transform: [{ rotate: `${angle}deg` }] }}>
      {/* Shaft */}
      <View style={{ width: sw, height: size * 0.55, backgroundColor: color,
        borderRadius: sw / 2, marginBottom: -sw }} />
      {/* Arrowhead */}
      <View style={{ width: 0, height: 0,
        borderLeftWidth: size * 0.28, borderRightWidth: size * 0.28,
        borderBottomWidth: size * 0.38,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: color }} />
    </View>
  );
}

function ActionIcon({ action, color, size = 20 }: { action: GestureAction; color: string; size?: number }) {
  const sw = Math.max(1.5, size * 0.09);
  switch (action) {
    case 'none':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.55, height: sw * 1.5, backgroundColor: color, borderRadius: sw, opacity: 0.5 }} />
        </View>
      );
    case 'allApps':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: size * 0.12 }}>
          {[0, 1, 2].map(row => (
            <View key={row} style={{ flexDirection: 'row', gap: size * 0.14 }}>
              {[0, 1, 2].map(col => (
                <View key={col} style={{ width: size * 0.22, height: size * 0.22,
                  backgroundColor: color, borderRadius: size * 0.06 }} />
              ))}
            </View>
          ))}
        </View>
      );
    case 'quickSettings':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.55, height: size * 0.55, borderRadius: size * 0.275,
            borderWidth: sw * 1.6, borderColor: color }} />
          {[0, 60, 120].map(deg => (
            <View key={deg} style={{ position: 'absolute',
              width: sw * 1.8, height: size * 0.82,
              borderRadius: sw,
              backgroundColor: 'transparent',
              borderLeftWidth: sw * 1.5, borderRightWidth: sw * 1.5,
              borderTopWidth: size * 0.09, borderBottomWidth: size * 0.09,
              borderColor: color,
              transform: [{ rotate: `${deg}deg` }] }} />
          ))}
        </View>
      );
    case 'notifications':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.62, height: size * 0.58,
            borderTopLeftRadius: size * 0.31,
            borderTopRightRadius: size * 0.31,
            borderWidth: sw * 1.4, borderColor: color,
            borderBottomWidth: 0 }} />
          <View style={{ width: size * 0.82, height: sw * 1.6, backgroundColor: color,
            borderRadius: sw, marginTop: -sw * 0.5 }} />
          <View style={{ width: size * 0.22, height: size * 0.13,
            borderBottomLeftRadius: size * 0.11,
            borderBottomRightRadius: size * 0.11,
            borderWidth: sw * 1.2, borderTopWidth: 0,
            borderColor: color, marginTop: sw * 0.5 }} />
        </View>
      );
    case 'controlCenter':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.52, height: size * 0.52, borderRadius: size * 0.26,
            borderWidth: sw * 1.6, borderColor: color }} />
          <View style={{ position: 'absolute', width: sw * 1.8, height: size * 0.28,
            backgroundColor: color, borderRadius: sw, top: size * 0.04 }} />
          <View style={{ position: 'absolute', width: sw * 1.8, height: size * 0.28,
            backgroundColor: color, borderRadius: sw, bottom: size * 0.04 }} />
        </View>
      );
    case 'recentApps':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', gap: size * 0.1 }}>
          {[size * 0.9, size * 0.72, size * 0.54].map((w, i) => (
            <View key={i} style={{ width: w, height: sw * 1.8, backgroundColor: color,
              borderRadius: sw, alignSelf: 'flex-start', opacity: 1 - i * 0.15 }} />
          ))}
        </View>
      );
    default:
      return <View style={{ width: size, height: size }} />;
  }
}

// ---------------------------------------------------------------------------
// PhoneDiagram — central phone with 4 directional tap zones
// ---------------------------------------------------------------------------

function PhoneDiagram({
  gestures,
  onDirectionPress,
  accentColor,
  textPrimary,
  textSecondary,
  activeDirection,
}: {
  gestures: GestureBindings;
  onDirectionPress: (d: Direction) => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  activeDirection: Direction | null;
}) {
  const PHONE_W = 90;
  const PHONE_H = 156;
  const ZONE_W  = 100;
  const ZONE_H  = 80;

  const directions: { dir: Direction; top?: number; bottom?: number; left?: number; right?: number }[] = [
    { dir: 'swipeUp',    bottom: PHONE_H / 2 + 8 },
    { dir: 'swipeDown',  top:    PHONE_H / 2 + 8 },
    { dir: 'swipeLeft',  right:  PHONE_W / 2 + 8 },
    { dir: 'swipeRight', left:   PHONE_W / 2 + 8 },
  ];

  return (
    <View style={styles.diagramContainer}>
      {/* Phone shell */}
      <View style={styles.phoneSilhouette}>
        <View style={styles.phoneNotch} />
        <View style={styles.phoneScreen} />
        <View style={styles.phoneHomeBar} />
      </View>

      {/* 4 directional tap zones */}
      {directions.map(({ dir, top, bottom, left, right }) => {
        const isH  = dir === 'swipeLeft' || dir === 'swipeRight';
        const isActive = activeDirection === dir;
        const action   = gestures[dir];
        const meta     = ACTION_META[action];
        const dirMeta  = DIRECTION_META[dir];
        const arrowAngle = dirMeta.angle; // right=0, down=90, left=180, up=270

        return (
          <TouchableOpacity
            key={dir}
            onPress={() => onDirectionPress(dir)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${dirMeta.label}: ${meta.label}`}
            style={[
              styles.dirZone,
              {
                width:  isH ? ZONE_W : PHONE_W,
                height: isH ? PHONE_H : ZONE_H,
                ...(top    !== undefined && { top:    '50%', marginTop:    -(PHONE_H / 2) - ZONE_H + (top    - 8) }),
                ...(bottom !== undefined && { bottom: '50%', marginBottom: -(PHONE_H / 2) - ZONE_H + (bottom - 8) }),
                ...(left   !== undefined && { left:   '50%', marginLeft:   PHONE_W / 2 + 8 }),
                ...(right  !== undefined && { right:  '50%', marginRight:  PHONE_W / 2 + 8 }),
                borderColor: isActive ? accentColor : 'rgba(255,255,255,0.08)',
                backgroundColor: isActive ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
              },
            ]}
          >
            <ArrowIcon
              angle={arrowAngle}
              color={action === 'none' ? textSecondary : isActive ? accentColor : textPrimary}
              size={isH ? 16 : 18}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.zoneLabel,
                {
                  color: action === 'none' ? textSecondary : isActive ? accentColor : textPrimary,
                  fontSize: isH ? 10 : 11,
                },
              ]}
            >
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// BottomSheet — animated action picker
// ---------------------------------------------------------------------------

function BottomSheetPicker({
  direction,
  currentAction,
  onSelect,
  onDismiss,
  accentColor,
  textPrimary,
  textSecondary,
  bg,
  rowBg,
  radius,
}: {
  direction: Direction | null;
  currentAction: GestureAction;
  onSelect: (a: GestureAction) => void;
  onDismiss: () => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  bg: string;
  rowBg: string;
  radius: number;
}) {
  const translateY = useRef(new Animated.Value(400)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const open  = direction !== null;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateY,   { toValue: 0,   tension: 160, friction: 22, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY,   { toValue: 400, tension: 200, friction: 24, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [open, translateY, scrimOpacity]);

  if (!mounted && !open) return null;

  const dirMeta = direction ? DIRECTION_META[direction] : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      {/* Scrim */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrimOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} accessible={false} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: bg, borderTopLeftRadius: radius + 8, borderTopRightRadius: radius + 8,
            transform: [{ translateY }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.sheetHandle}>
          <View style={[styles.handlePill, { backgroundColor: textSecondary }]} />
        </View>

        {/* Title */}
        {dirMeta && (
          <View style={styles.sheetHeader}>
            <ArrowIcon angle={dirMeta.angle} color={accentColor} size={20} />
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>{dirMeta.label}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionList}>
          {ACTIONS.map(action => {
            const meta     = ACTION_META[action];
            const selected = action === currentAction;
            return (
              <TouchableOpacity
                key={action}
                onPress={() => { onSelect(action); onDismiss(); }}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[
                  styles.actionRow,
                  {
                    backgroundColor: selected ? `${accentColor}18` : rowBg,
                    borderRadius: radius * 0.7,
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? accentColor : 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <View style={styles.actionIconBox}>
                  <ActionIcon action={action} color={selected ? accentColor : textSecondary} size={20} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={[styles.actionRowLabel, { color: selected ? accentColor : textPrimary }]}>
                    {meta.label}
                  </Text>
                  <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                    {meta.description}
                  </Text>
                </View>
                {selected && (
                  <View style={[styles.selectedDot, { backgroundColor: accentColor }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// GestureConfigScreen
// ---------------------------------------------------------------------------

export function GestureConfigScreen({ onBack }: { onBack?: () => void }) {
  const { semantics, gestures, setGestureBinding } = useWeftConfig();
  const insets = useSafeAreaInsets();
  const s = semantics;
  const cs = s.surface.customization;

  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);

  // Back handler
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeDirection !== null) { setActiveDirection(null); return true; }
      onBack?.();
      return true;
    });
    return () => sub.remove();
  }, [activeDirection, onBack]);

  const handleSelect = useCallback((action: GestureAction) => {
    if (activeDirection) setGestureBinding(activeDirection, action);
  }, [activeDirection, setGestureBinding]);

  const bg         = cs.background;
  const textPrim   = cs.textPrimary;
  const textSec    = cs.textSecondary;
  const accent     = s.accent.primary;
  const cardBg     = cs.backgroundAlt;
  const tileRadius = s.component.tile.radius;

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          {/* Left-pointing chevron */}
          <View style={[styles.chevronBar, styles.chevronTop, { borderColor: textPrim }]} />
          <View style={[styles.chevronBar, styles.chevronBot, { borderColor: textPrim }]} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: textPrim }]}>Gestures</Text>
          <Text style={[styles.headerSub,   { color: textSec  }]}>
            Tap a direction to change its action
          </Text>
        </View>
      </View>

      {/* ── Phone diagram + direction zones ───────────────────────────── */}
      <View style={styles.diagramArea}>
        <PhoneDiagram
          gestures={gestures}
          onDirectionPress={setActiveDirection}
          accentColor={accent}
          textPrimary={textPrim}
          textSecondary={textSec}
          activeDirection={activeDirection}
        />
      </View>

      {/* ── Legend row ────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        {(Object.keys(DIRECTION_META) as Direction[]).map(dir => {
          const action = gestures[dir];
          const meta   = ACTION_META[action];
          const dMeta  = DIRECTION_META[dir];
          const isActive = activeDirection === dir;
          return (
            <TouchableOpacity
              key={dir}
              onPress={() => setActiveDirection(dir)}
              activeOpacity={0.75}
              style={[
                styles.legendItem,
                {
                  backgroundColor: isActive ? `${accent}20` : cardBg,
                  borderColor: isActive ? accent : 'rgba(255,255,255,0.07)',
                  borderRadius: tileRadius,
                },
              ]}
            >
              <ArrowIcon angle={dMeta.angle} color={isActive ? accent : textSec} size={14} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text numberOfLines={1} style={[styles.legendDir,    { color: isActive ? accent : textSec }]}>
                  {dMeta.label}
                </Text>
                <Text numberOfLines={1} style={[styles.legendAction, { color: isActive ? accent : textPrim }]}>
                  {meta.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Bottom sheet picker ───────────────────────────────────────── */}
      <BottomSheetPicker
        direction={activeDirection}
        currentAction={activeDirection ? gestures[activeDirection] : 'none'}
        onSelect={handleSelect}
        onDismiss={() => setActiveDirection(null)}
        accentColor={accent}
        textPrimary={textPrim}
        textSecondary={textSec}
        bg={cardBg}
        rowBg={bg}
        radius={tileRadius}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBar: {
    position: 'absolute',
    width: 10,
    height: 1.8,
    borderRadius: 1,
    borderBottomWidth: 1.8,
  },
  chevronTop: {
    transform: [{ rotate: '135deg' }, { translateY: -3 }],
  },
  chevronBot: {
    transform: [{ rotate: '-135deg' }, { translateY: 3 }],
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
    opacity: 0.75,
  },

  // Diagram
  diagramArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramContainer: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phoneSilhouette: {
    width: 90,
    height: 156,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  phoneNotch: {
    width: 36,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 10,
  },
  phoneScreen: {
    flex: 1,
    width: '85%',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 8,
  },
  phoneHomeBar: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
  },
  dirZone: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  zoneLabel: {
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  legendItem: {
    width: (SW - 42) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  legendDir: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.75,
  },
  legendAction: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom sheet
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionList: {
    paddingHorizontal: 14,
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextBox: {
    flex: 1,
    gap: 1,
  },
  actionRowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRowSub: {
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.7,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
