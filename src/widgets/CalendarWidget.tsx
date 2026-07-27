/**
 * Weft — CalendarWidget
 *
 * Shows upcoming calendar events. Mock data for Sprint 4.
 * Tapping an event opens the system calendar.
 */

import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { registerWidget } from './WidgetRegistry';
import type { WidgetProps } from './WidgetRegistry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  isToday: boolean;
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Design Review', time: 'Today · 3:00 PM', isToday: true },
  { id: '2', title: 'Team Standup', time: 'Tomorrow · 10:00 AM', isToday: false },
];

// ---------------------------------------------------------------------------
// EventRow sub-component
// ---------------------------------------------------------------------------

function EventRow({
  event,
  accentColor,
  textPrimary,
  textSecondary,
  fontFamily,
}: {
  event: CalendarEvent;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  fontFamily: string;
}) {
  const handlePress = () => {
    // Open system calendar to current time
    Linking.openURL('content://com.android.calendar/time').catch(() => {
      Linking.openURL('https://calendar.google.com').catch(() => {});
    });
  };

  return (
    <TouchableOpacity
      style={styles.eventRow}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.time}`}
    >
      {/* Accent dot */}
      <View style={[styles.dot, { backgroundColor: accentColor }]} />

      {/* Event details */}
      <View style={styles.eventDetails}>
        <Text
          style={[styles.eventTitle, { color: textPrimary, fontFamily }]}
          numberOfLines={1}
        >
          {event.title}
        </Text>
        <Text
          style={[styles.eventTime, { color: textSecondary, fontFamily }]}
          numberOfLines={1}
        >
          {event.time}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CalendarWidget({ settings }: WidgetProps) {
  const { semantics } = useWeftConfig();
  const s = semantics;

  // Settings can override mock events in future
  const events: CalendarEvent[] = settings.events || MOCK_EVENTS;

  return (
    <View style={styles.container}>
      {events.map((event, index) => (
        <React.Fragment key={event.id}>
          <EventRow
            event={event}
            accentColor={s.accent.primary}
            textPrimary={s.surface.home.textPrimary}
            textSecondary={s.surface.home.textSecondary}
            fontFamily={s.component.appIcon.labelType.fontFamily}
          />
          {/* Divider between events, not after last */}
          {index < events.length - 1 && (
            <View
              style={[styles.divider, { backgroundColor: s.surface.home.textSecondary }]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventDetails: {
    flex: 1,
    gap: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '400',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
    opacity: 0.3,
  },
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'calendar',
  name: 'Calendar',
  icon: '📅',
  description: 'Upcoming events at a glance',
  defaultSettings: {},
  component: CalendarWidget,
});

export { CalendarWidget };
