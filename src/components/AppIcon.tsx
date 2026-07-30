/**
 * Weft — AppIcon
 *
 * App icon atom with three animation layers:
 *
 * 1. Press squish — spring to 0.88 on pressIn, back on pressOut
 * 2. Launch transition — on press, scale up to 1.08 then fade out before
 *    launching the app. Gives a satisfying "opening" feel.
 * 3. Wiggle — when editMode=true, a looping ±3° rotation oscillation with
 *    a small random phase offset so icons don't all move in lock-step.
 *
 * Also renders:
 * - Notification badge (top-right) from badgeCount prop
 * - Edit mode delete handle (top-left ✕) when editMode=true
 *
 * Shape clipping:
 *   squircle       — large uniform border radius (0.45 × size)
 *   circle         — border radius = size / 2
 *   rounded-square — moderate border radius (0.22 × size)
 *   teardrop       — three large corners + one tight corner (bottom-right)
 *   hexagon        — two overlapping rotated rectangles clipped to a hex
 *
 * Shadow architecture:
 * - Shadow on the shadowContainer View
 * - overflow:hidden on shadowContainer clips the icon to the shape
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Vibration,
  View,
  type ViewStyle,
} from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';
import type { IconShape } from '../context/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppIconProps = {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onLongPressPosition?: (position: { x: number; y: number; width: number; height: number }) => void;
  style?: ViewStyle;
  /** When true the icon wiggles and shows a delete handle. */
  editMode?: boolean;
  /** 0 = hidden, 1 = dot, >1 = numbered pill. */
  badgeCount?: number;
};

// ---------------------------------------------------------------------------
// Shape clip helpers
// ---------------------------------------------------------------------------

function getShapeRadius(shape: IconShape, size: number): {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
} | null {
  switch (shape) {
    case 'circle':
      return {
        borderTopLeftRadius: size / 2,
        borderTopRightRadius: size / 2,
        borderBottomLeftRadius: size / 2,
        borderBottomRightRadius: size / 2,
      };
    case 'squircle':
      return {
        borderTopLeftRadius: size * 0.45,
        borderTopRightRadius: size * 0.45,
        borderBottomLeftRadius: size * 0.45,
        borderBottomRightRadius: size * 0.45,
      };
    case 'rounded-square':
      return {
        borderTopLeftRadius: size * 0.22,
        borderTopRightRadius: size * 0.22,
        borderBottomLeftRadius: size * 0.22,
        borderBottomRightRadius: size * 0.22,
      };
    case 'teardrop':
      return {
        borderTopLeftRadius: size * 0.44,
        borderTopRightRadius: size * 0.44,
        borderBottomLeftRadius: size * 0.44,
        borderBottomRightRadius: size * 0.08,
      };
    case 'hexagon':
      return null; // handled via HexagonClip
  }
}

function HexagonClip({ size, children }: { size: number; children: React.ReactNode }) {
  const w = size;
  const h = size * 0.866;

  return (
    <View style={{ width: w, height: w, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: w, height: h, top: (w - h) / 2, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            width: w * 0.866,
            height: w * 0.866,
            left: w * 0.067,
            top: 0,
            transform: [{ rotate: '30deg' }],
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: w * 0.866,
              height: w * 0.866,
              transform: [{ rotate: '-30deg' }],
              left: -w * 0.067,
              top: -(w - h) / 2,
            }}
          >
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AppIcon = React.memo<AppIconProps>(({
  icon,
  label,
  onPress,
  onLongPress,
  onLongPressPosition,
  style,
  editMode = false,
  badgeCount = 0,
}) => {
  const { semantics, icons } = useWeftConfig();
  const ai   = semantics.component.appIcon;
  const nb   = semantics.component.notificationBadge;
  const size  = ai.containerSize;
  const shape = icons.shape;

  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const opacityAnim  = useRef(new Animated.Value(1)).current;
  const wiggleAnim   = useRef(new Animated.Value(0)).current;
  const wiggleLoop   = useRef<Animated.CompositeAnimation | null>(null);
  const containerRef = useRef<View>(null);

  // ── Wiggle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (editMode) {
      const phaseDelay = Math.random() * 120;
      wiggleLoop.current = Animated.loop(
        Animated.sequence([
          Animated.delay(phaseDelay),
          Animated.timing(wiggleAnim, { toValue: 1,  duration: 100, useNativeDriver: true }),
          Animated.timing(wiggleAnim, { toValue: -1, duration: 200, useNativeDriver: true }),
          Animated.timing(wiggleAnim, { toValue: 0,  duration: 100, useNativeDriver: true }),
        ]),
      );
      wiggleLoop.current.start();
    } else {
      wiggleLoop.current?.stop();
      Animated.spring(wiggleAnim, { toValue: 0, tension: 300, friction: 12, useNativeDriver: true }).start();
    }
    return () => { wiggleLoop.current?.stop(); };
  }, [editMode, wiggleAnim]);

  const wiggleRotate = wiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  // ── Press handlers ────────────────────────────────────────────────────────
  const handlePressIn = useCallback(() => {
    if (editMode) return;
    Animated.spring(scaleAnim, {
      toValue: 0.86,
      tension: 400,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, editMode]);

  const handlePressOut = useCallback(() => {
    if (editMode) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, editMode]);

  const handlePress = useCallback(() => {
    if (editMode || !onPress) return;
    // Brief haptic tap on launch
    Vibration.vibrate(10);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.06,
        tension: 500,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress();
      setTimeout(() => {
        scaleAnim.setValue(1);
        opacityAnim.setValue(1);
      }, 400);
    });
  }, [editMode, onPress, scaleAnim, opacityAnim]);

  const handleLongPress = useCallback(() => {
    Vibration.vibrate(50);
    if (onLongPressPosition && containerRef.current) {
      containerRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        onLongPressPosition({ x: pageX, y: pageY, width, height });
      });
    } else {
      onLongPress?.();
    }
  }, [onLongPress, onLongPressPosition]);

  // ── Shape ─────────────────────────────────────────────────────────────────
  const shapeRadius  = getShapeRadius(shape, size);
  const isHexagon    = shape === 'hexagon';
  const shadowRadius = shapeRadius ? shapeRadius.borderTopLeftRadius : size * 0.45;

  const showBadge = badgeCount > 0;
  const isDot     = badgeCount === 1;

  return (
    <TouchableWithoutFeedback
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityLabel={
        badgeCount > 0
          ? `${label}, ${badgeCount} notification${badgeCount === 1 ? '' : 's'}`
          : label
      }
      accessibilityRole="button"
    >
      <Animated.View
        ref={containerRef}
        style={[
          styles.outer,
          style,
          { transform: [{ scale: scaleAnim }, { rotate: wiggleRotate }], opacity: opacityAnim },
        ]}
      >
        {/* Icon container — shadow + shape clip */}
        <View
          style={[
            styles.shadowContainer,
            {
              width: size,
              height: size,
              borderRadius: shadowRadius,
              elevation: ai.shadow.elevation,
              shadowColor: ai.shadow.shadowColor,
              shadowOffset: ai.shadow.shadowOffset,
              shadowOpacity: ai.shadow.shadowOpacity,
              shadowRadius: ai.shadow.shadowRadius,
              backgroundColor: '#FFFFFF',
            },
            shapeRadius ?? undefined,
          ]}
        >
          {isHexagon
            ? <HexagonClip size={size}>{icon}</HexagonClip>
            : <View style={[styles.clipContainer, shapeRadius ?? { borderRadius: shadowRadius }]}>{icon}</View>
          }
        </View>

        {/* Notification badge */}
        {showBadge && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: nb.background,
                borderColor: nb.borderColor,
                borderWidth: nb.borderWidth,
                height: nb.size,
                minWidth: nb.size,
                borderRadius: nb.size / 2,
                width: isDot ? nb.size : undefined,
                paddingHorizontal: isDot ? 0 : 5,
              },
            ]}
            accessible={false}
          >
            {!isDot && (
              <Text style={[styles.badgeText, { color: nb.textColor, fontSize: nb.fontSize }]} numberOfLines={1}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </Text>
            )}
          </View>
        )}

        {/* Edit mode delete handle — View-based X, no emoji */}
        {editMode && (
          <View style={styles.deleteHandle}>
            <View style={[styles.deleteXBar, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.deleteXBar, { transform: [{ rotate: '-45deg' }] }]} />
          </View>
        )}

        {/* Label */}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              fontFamily: ai.labelType.fontFamily,
              fontSize: ai.labelType.fontSize,
              lineHeight: ai.labelType.lineHeight,
              fontWeight: ai.labelType.fontWeight,
              letterSpacing: ai.labelType.letterSpacing,
              color: ai.labelColor,
              ...(ai.labelTextShadow !== null && {
                textShadowColor: ai.labelTextShadow.color,
                textShadowOffset: ai.labelTextShadow.offset,
                textShadowRadius: ai.labelTextShadow.radius,
              }),
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

AppIcon.displayName = 'AppIcon';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
  },
  shadowContainer: {
    overflow: 'hidden',
  },
  clipContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  label: {
    textAlign: 'center',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlign: 'center',
  },
  deleteHandle: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
  },
  deleteXBar: {
    position: 'absolute',
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#ffffff',
  },
});

export { AppIcon };
