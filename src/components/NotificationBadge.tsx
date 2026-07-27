/**
 * Weft — NotificationBadge
 *
 * Renders a red notification badge over an app icon. Shows:
 * - Nothing when count === 0
 * - A small dot when count === 1
 * - A pill with the number when count > 1
 *
 * Positioned absolutely in the top-right corner of the parent container.
 * Designed to wrap an AppIcon or be placed as a sibling inside a relative
 * container.
 *
 * All visual props read from semantics.component.notificationBadge — the
 * badge color, size, text style, and border are paradigm-specific.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationBadgeProps = {
  /** Notification count. 0 = hidden, 1 = dot, >1 = pill with number. */
  count: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NotificationBadge = memo(function NotificationBadge({
  count,
}: NotificationBadgeProps) {
  const { semantics } = useWeftConfig();
  const nb = semantics.component.notificationBadge;

  // Don't render anything if count is 0
  if (count === 0) return null;

  const isDot = count === 1;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: nb.background,
          borderColor: nb.borderColor,
          borderWidth: nb.borderWidth,
          // Dot: circular, pill: rounded rect
          width: isDot ? nb.size : undefined,
          height: nb.size,
          borderRadius: nb.size / 2,
          minWidth: nb.size,
          paddingHorizontal: isDot ? 0 : 6,
        },
      ]}
      accessible
      accessibilityLabel={`${count} notification${count === 1 ? '' : 's'}`}
      accessibilityRole="text"
    >
      {!isDot && (
        <Text
          style={[
            styles.text,
            {
              color: nb.textColor,
              fontSize: nb.fontSize,
            },
          ]}
          numberOfLines={1}
        >
          {count > 99 ? '99+' : count}
        </Text>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Styles — structural only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure it sits above the app icon
    zIndex: 10,
    elevation: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
