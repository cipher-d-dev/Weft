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
 * Shadow architecture:
 * - Shadow on outer un-clipped View (overflow:hidden kills Android elevation)
 * - overflow:hidden on an inner child View for icon clipping
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
  const { semantics } = useWeftConfig();
  const ai = semantics.component.appIcon;
  const nb = semantics.component.notificationBadge;

  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const opacityAnim  = useRef(new Animated.Value(1)).current;
  const wiggleAnim   = useRef(new Animated.Value(0)).current;
  const wiggleLoop   = useRef<Animated.CompositeAnimation | null>(null);
  const containerRef = useRef<View>(null);

  // ── Wiggle on editMode change ─────────────────────────────────────────────
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

  // ── Press squish ──────────────────────────────────────────────────────────
  const handlePressIn = useCallback(() => {
    if (editMode) return;
    Animated.spring(scaleAnim, { toValue: 0.88, tension: 300, friction: 10, useNativeDriver: true }).start();
  }, [scaleAnim, editMode]);

  const handlePressOut = useCallback(() => {
    if (editMode) return;
    Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 12, useNativeDriver: true }).start();
  }, [scaleAnim, editMode]);

  // ── Launch transition ─────────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    if (editMode || !onPress) return;
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.08, tension: 400, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      onPress();
      setTimeout(() => {
        scaleAnim.setValue(1);
        opacityAnim.setValue(1);
      }, 400);
    });
  }, [editMode, onPress, scaleAnim, opacityAnim]);

  // ── Long press ────────────────────────────────────────────────────────────
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
        {/* Shadow carrier — no overflow:hidden so Android elevation renders */}
        <View
          style={[
            styles.shadowContainer,
            {
              width: ai.containerSize,
              height: ai.containerSize,
              borderRadius: ai.radius,
              elevation: ai.shadow.elevation,
              shadowColor: ai.shadow.shadowColor,
              shadowOffset: ai.shadow.shadowOffset,
              shadowOpacity: ai.shadow.shadowOpacity,
              shadowRadius: ai.shadow.shadowRadius,
              backgroundColor: '#FFFFFF',
            },
          ]}
        >
          {/* Clip container — overflow:hidden here clips the icon image */}
          <View style={[styles.clipContainer, { borderRadius: ai.radius }]}>
            {icon}
          </View>
        </View>

        {/* Notification badge — top-right */}
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
              <Text
                style={[styles.badgeText, { color: nb.textColor, fontSize: nb.fontSize }]}
                numberOfLines={1}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </Text>
            )}
          </View>
        )}

        {/* Edit mode delete handle — top-left */}
        {editMode && (
          <View style={styles.deleteHandle}>
            <Text style={styles.deleteText}>✕</Text>
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
    backgroundColor: 'transparent',
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
  deleteText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    includeFontPadding: false,
  },
});

export { AppIcon };
