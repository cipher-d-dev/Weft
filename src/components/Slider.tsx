/**
 * Weft — Slider
 *
 * Atom component for continuous value input (0–1). PanResponder drag with
 * track/fill/thumb layout. All visual tokens read from semantics.
 * Zero paradigm branching.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SliderProps = {
  /** 0–1 normalised value. */
  value: number;
  onValueChange: (val: number) => void;
  onSlidingComplete?: (val: number) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Slider = memo(function Slider({
  value,
  onValueChange,
  onSlidingComplete,
  disabled = false,
  accessibilityLabel,
  style,
}: SliderProps) {
  const { semantics } = useWeftConfig();
  const sl = semantics.component.slider;

  const [trackWidth, setTrackWidth] = useState(0);

  // Keep mutable refs so PanResponder callbacks (created once) always see
  // the latest values without needing to be re-created.
  const trackWidthRef = useRef(0);
  trackWidthRef.current = trackWidth;

  const valueRef = useRef(value);
  valueRef.current = value;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const onSlidingCompleteRef = useRef(onSlidingComplete);
  onSlidingCompleteRef.current = onSlidingComplete;

  // trackRef is used to measure the track's pageX for accurate touch mapping.
  const trackRef = useRef<View>(null);
  const trackPageXRef = useRef(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const computeValue = useCallback((pageX: number): number => {
    const touchX = pageX - trackPageXRef.current;
    return clamp(touchX / trackWidthRef.current, 0, 1);
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,

      onPanResponderGrant: (e) => {
        // Measure the track's left edge in page coordinates.
        trackRef.current?.measure((_x, _y, _w, _h, px) => {
          trackPageXRef.current = px;
          const newVal = computeValue(e.nativeEvent.pageX);
          onValueChangeRef.current(newVal);
        });
      },

      onPanResponderMove: (e) => {
        if (trackWidthRef.current <= 0) return;
        const newVal = computeValue(e.nativeEvent.pageX);
        onValueChangeRef.current(newVal);
      },

      onPanResponderRelease: () => {
        onSlidingCompleteRef.current?.(clamp(valueRef.current, 0, 1));
      },

      onPanResponderTerminate: () => {
        onSlidingCompleteRef.current?.(clamp(valueRef.current, 0, 1));
      },
    }),
  ).current;

  const tapEnvelopeHeight = sl.trackHeight * 3;
  const thumbSize = sl.thumbSize;
  const thumbOffset = value * Math.max(0, trackWidth - thumbSize);

  return (
    <View
      style={[styles.wrapper, { opacity: disabled ? 0.4 : 1 }, style]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 1, now: value }}
    >
      {/* Tap envelope + track container */}
      <View
        ref={trackRef}
        onLayout={handleLayout}
        style={[styles.trackEnvelope, { height: tapEnvelopeHeight }]}
        {...pan.panHandlers}
      >
        {/* Track pill (background) */}
        <View
          style={[
            styles.trackPill,
            {
              height: sl.trackHeight,
              borderRadius: sl.trackRadius,
              backgroundColor: sl.trackBackground,
            },
          ]}
        />

        {/* Fill (foreground, absolutely positioned) */}
        <View
          style={[
            styles.fill,
            {
              width: value * trackWidth,
              height: sl.trackHeight,
              borderRadius: sl.trackRadius,
              backgroundColor: sl.trackFill,
              top: (tapEnvelopeHeight - sl.trackHeight) / 2,
            },
          ]}
        />

        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: sl.thumbFill,
              borderWidth: 2,
              borderColor: sl.thumbBorder,
              top: (tapEnvelopeHeight - thumbSize) / 2,
              transform: [{ translateX: thumbOffset }],
            },
          ]}
        />
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Structural / layout styles only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  trackEnvelope: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  trackPill: {
    width: '100%',
  },
  fill: {
    position: 'absolute',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    left: 0,
  },
});
