/**
 * Weft — Toggle
 *
 * Atom component for boolean controls. Animated track + thumb with spring
 * physics. All visual tokens read from semantics — no hardcoded values.
 * Zero paradigm branching.
 */

import React, { memo, useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToggleProps = {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Toggle = memo(function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  style,
}: ToggleProps) {
  const { semantics } = useWeftConfig();
  const tog = semantics.component.toggle;

  const thumbDiameter = tog.height - 6;
  // Travel: from 3px (off) to (width - height + 3)px (on)
  const thumbOffX = 3;
  const thumbOnX = tog.width - tog.height + 3;

  // Animated value: 0 = off, 1 = on
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value ? 1 : 0,
      tension: 180,
      friction: 12,
      useNativeDriver: false, // background color interpolation requires JS driver
    }).start();
  }, [value, animValue]);

  // Interpolate track background color
  const trackBackground = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [tog.trackOff, tog.trackOn],
  });

  // Interpolate thumb translateX
  const thumbTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbOffX, thumbOnX],
  });

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={1}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.touchTarget,
        {
          width: tog.touchTarget,
          height: tog.touchTarget,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {/* Track */}
      <Animated.View
        style={[
          styles.track,
          {
            width: tog.width,
            height: tog.height,
            borderRadius: tog.height / 2,
            backgroundColor: trackBackground,
          },
        ]}
      >
        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbDiameter,
              height: thumbDiameter,
              borderRadius: thumbDiameter / 2,
              backgroundColor: tog.thumb,
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Structural / layout styles only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    top: 3,
  },
});
