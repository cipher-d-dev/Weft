/**
 * Weft — ClockWidget
 *
 * A live time + date display rendered inside the WidgetCard slot on the
 * HomeScreen. Updates every second via setInterval.
 *
 * This is the primary premium signal that differentiates Weft from an app
 * drawer — a real launcher always shows the time front and center.
 *
 * Typography:
 *   - Time: display2xl (Fraunces 31pt) — large, unhurried, premium
 *   - Date: labelSm (Inter 13pt) — readable, clean secondary line
 *
 * The time uses the mono font for the hour:minute digits so the colon
 * separator doesn't jump horizontally as digits change width.
 *
 * Colors read from semantics — works across all three paradigms.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTime(d: Date): { hours: string; minutes: string; ampm: string } {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { hours: pad(h), minutes: pad(m), ampm };
}

function formatDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ClockWidget = memo(function ClockWidget() {
  const { semantics } = useWeftConfig();
  const s = semantics;

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Tick every second
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Entrance animation: slide down from -20 + fade in
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { hours, minutes, ampm } = formatTime(now);
  const dateStr = formatDate(now);

  const textPrimary = s.surface.home.textPrimary;
  const textSecondary = s.surface.home.textSecondary;

  return (
    <Animated.View style={[styles.root, { opacity, transform: [{ translateY }] }]}>
      {/* Time row */}
      <View style={styles.timeRow}>
        <Text
          style={[
            styles.timeDigits,
            {
              color: textPrimary,
              fontFamily: s.component.appIcon.labelType.fontFamily,
              fontSize: 56,
              lineHeight: 60,
              fontWeight: '300',
              letterSpacing: -2,
              // Subtle shadow so the clock reads on ANY wallpaper — dark or light
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 8,
            },
          ]}
          allowFontScaling={false}
        >
          {hours}:{minutes}
        </Text>
        <Text
          style={[
            styles.ampm,
            {
              color: textSecondary,
              fontFamily: s.component.appIcon.labelType.fontFamily,
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: 0.5,
              textShadowColor: 'rgba(0,0,0,0.25)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            },
          ]}
          allowFontScaling={false}
        >
          {ampm}
        </Text>
      </View>

      {/* Date line */}
      <Text
        style={[
          styles.date,
          {
            color: textSecondary,
            fontFamily: s.component.appIcon.labelType.fontFamily,
            fontSize: 13,
            fontWeight: '400',
            letterSpacing: 0.3,
            textShadowColor: 'rgba(0,0,0,0.25)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          },
        ]}
        allowFontScaling={false}
      >
        {dateStr}
      </Text>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  timeDigits: {
    includeFontPadding: false,
  },
  ampm: {
    marginBottom: 8,
    includeFontPadding: false,
    textTransform: 'uppercase',
  },
  date: {
    marginTop: 2,
    includeFontPadding: false,
  },
});
