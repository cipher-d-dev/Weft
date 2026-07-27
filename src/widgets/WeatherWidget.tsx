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
    icon: '☀️', // Could map condition → emoji
  };

  return (
    <View style={styles.container}>
      {/* Left side: icon + temp */}
      <View style={styles.leftSide}>
        <Text style={styles.weatherIcon}>{weatherData.icon}</Text>
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
  weatherIcon: {
    fontSize: 40,
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
  icon: '☀️',
  description: 'Current weather conditions',
  defaultSettings: {
    condition: 'Sunny',
    temperature: 72,
    location: 'San Francisco',
  },
  component: WeatherWidget,
});

export { WeatherWidget };
