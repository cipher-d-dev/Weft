/**
 * Weft — Widget Registry
 *
 * Central registry for all available widgets. Each widget definition includes:
 *   - Metadata (id, name, icon, description)
 *   - Default settings
 *   - Component to render
 *   - Optional config component for widget-specific settings
 *
 * Widgets read from useWeftConfig().widgets[] and render via WidgetSlot.
 */

import type React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WidgetProps = {
  /** Widget-specific settings from WeftConfig.widgets[].settings */
  settings: Record<string, any>;
};

export type WidgetConfigProps = {
  /** Current widget settings */
  settings: Record<string, any>;
  /** Callback to update settings */
  onSettingsChange: (settings: Record<string, any>) => void;
};

export type WidgetDefinition = {
  /** Unique widget ID (e.g. 'weather', 'calendar') */
  id: string;
  /** Display name shown in widget picker */
  name: string;
  /** Emoji or icon identifier */
  icon: string;
  /** Short description for widget picker */
  description: string;
  /** Default settings object */
  defaultSettings: Record<string, any>;
  /** React component that renders the widget */
  component: React.ComponentType<WidgetProps>;
  /** Optional config component for per-widget settings */
  configComponent?: React.ComponentType<WidgetConfigProps>;
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry = new Map<string, WidgetDefinition>();

/**
 * Register a widget definition. Called by each widget module on import.
 */
export function registerWidget(definition: WidgetDefinition): void {
  if (registry.has(definition.id)) {
    console.warn(`[WidgetRegistry] Widget "${definition.id}" already registered, skipping.`);
    return;
  }
  registry.set(definition.id, definition);
}

/**
 * Get a widget definition by ID. Returns undefined if not found.
 */
export function getWidget(id: string): WidgetDefinition | undefined {
  return registry.get(id);
}

/**
 * Get all registered widgets as an array.
 */
export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

/**
 * Check if a widget ID is registered.
 */
export function hasWidget(id: string): boolean {
  return registry.has(id);
}
