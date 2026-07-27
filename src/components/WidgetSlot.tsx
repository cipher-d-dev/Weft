/**
 * Weft — WidgetSlot
 *
 * Container that renders active widgets in a vertical stack. Reads from
 * WeftConfig.widgets[], filters enabled widgets, sorts by order, and wraps
 * each in a WidgetCard.
 *
 * Error boundaries around each widget prevent one broken widget from crashing
 * the entire home screen.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { WidgetCard } from './WidgetCard';
import { ErrorBoundary } from './ErrorBoundary';
import { getWidget } from '../widgets/WidgetRegistry';

// Import widgets to trigger registration
import '../widgets/WeatherWidget';
import '../widgets/CalendarWidget';
import '../widgets/QuickNotesWidget';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WidgetSlot() {
  const { widgets, semantics } = useWeftConfig();
  const layout = semantics.layout;

  // Filter enabled, sort by order, map to definitions
  const activeWidgets = widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order)
    .map(w => ({ config: w, definition: getWidget(w.id) }))
    .filter((item): item is { config: typeof widgets[0]; definition: NonNullable<ReturnType<typeof getWidget>> } =>
      item.definition !== undefined
    );

  if (activeWidgets.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { gap: layout.sectionGap }]}>
      {activeWidgets.map(({ config, definition }) => {
        const WidgetComponent = definition.component;
        return (
          <ErrorBoundary key={config.id} fallback={null}>
            <WidgetCard>
              <WidgetComponent settings={config.settings} />
            </WidgetCard>
          </ErrorBoundary>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    // gap applied inline from semantics.layout.sectionGap
  },
});
