/**
 * Weft — WeatherWidget
 *
 * Displays current weather conditions with an icon and temperature.
 * Mock data for Sprint 4 — real weather API integration in Sprint 5.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { registerWidget } from './WidgetRegistry';
import type { WidgetProps } from './WidgetRegistry';

// ---------------------------------------------------------------------------
// Sun icon — pure View, no emoji
// ---------------------------------------------------------------------------

function SunIcon({ color, size }: { color: string; size: number }) {
  const r = size * 0.28;
  const rays = [0, 45, 90, 135];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Core circle */}
      <View style={{
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: color,
      }} />
      {/* Rays — 4 pairs (0°/180°, 45°/225°, 90°/270°, 135°/315°) */}
      {rays.map(deg => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: size * 0.12,
            height: size,
            alignItems: 'center',
            justifyContent: 'space-between',
            transform: [{ rotate: `${deg}deg` }],
          }}
          pointerEvents="none"
        >
          <View style={{ width: size * 0.1, height: size * 0.14, backgroundColor: color, borderRadius: size * 0.05 }} />
          <View style={{ width: size * 0.1, height: size * 0.14, backgroundColor: color, borderRadius: size * 0.05 }} />
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function WeatherWidget({ settings }: WidgetProps) {
  const { semantics } = useWeftConfig();
  const s = semantics;

  // Mock data — replace with real API call in Sprint 5
  const weatherData = {
    condition: settings.condition || 'Sunny',
    temperature: settings.temperature || 72,
    location: settings.location || 'San Francisco',
  };

  return (
    <View style={styles.container}>
      {/* Left side: icon + temp */}
      <View style={styles.leftSide}>
        <SunIcon color={s.surface.home.textPrimary} size={40} />
        <Text
          style={[
            styles.temperature,
            {
              color: s.surface.home.textPrimary,
              fontFamily: s.component.appIcon.labelType.fontFamily,
            },
          ]}
        >
          {weatherData.temperature}°
        </Text>
      </View>

      {/* Right side: condition + location */}
      <View style={styles.rightSide}>
        <Text
          style={[
            styles.condition,
            {
              color: s.surface.home.textPrimary,
              fontFamily: s.component.appIcon.labelType.fontFamily,
            },
          ]}
        >
          {weatherData.condition}
        </Text>
        <Text
          style={[
            styles.location,
            {
              color: s.surface.home.textSecondary,
              fontFamily: s.component.appIcon.labelType.fontFamily,
            },
          ]}
        >
          {weatherData.location}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  temperature: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: -1,
  },
  rightSide: {
    flex: 1,
    gap: 2,
  },
  condition: {
    fontSize: 16,
    fontWeight: '600',
  },
  location: {
    fontSize: 13,
    fontWeight: '400',
  },
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'weather',
  name: 'Weather',
  icon: 'sun',
  description: 'Current weather conditions',
  defaultSettings: {
    condition: 'Sunny',
    temperature: 72,
    location: 'San Francisco',
  },
  component: WeatherWidget,
});

export { WeatherWidget };
