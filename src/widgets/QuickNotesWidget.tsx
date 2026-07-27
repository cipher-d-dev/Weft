/**
 * Weft — QuickNotesWidget
 *
 * Single-line text input that persists to widget settings.
 * Quick jot-down for reminders, links, or short notes.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { registerWidget } from './WidgetRegistry';
import type { WidgetProps } from './WidgetRegistry';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function QuickNotesWidget({ settings }: WidgetProps) {
  const { semantics, setWidgetSettings } = useWeftConfig();
  const s = semantics;

  const [localText, setLocalText] = useState(settings.noteText || '');

  const handleBlur = useCallback(() => {
    // Persist to config only on blur to avoid excessive writes
    if (localText !== settings.noteText) {
      setWidgetSettings('quicknotes', { noteText: localText });
    }
  }, [localText, settings.noteText, setWidgetSettings]);

  return (
    <TextInput
      style={[
        styles.input,
        {
          color: s.surface.home.textPrimary,
          fontFamily: s.component.appIcon.labelType.fontFamily,
          borderColor: s.surface.home.textSecondary,
        },
      ]}
      placeholder="Tap to add a note..."
      placeholderTextColor={s.surface.home.textSecondary}
      value={localText}
      onChangeText={setLocalText}
      onBlur={handleBlur}
      multiline
      numberOfLines={2}
      maxLength={120}
      returnKeyType="done"
      blurOnSubmit
      accessible
      accessibilityLabel="Quick notes input"
      accessibilityHint="Type a short note or reminder"
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  input: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    minHeight: 44,
    textAlignVertical: 'top',
  },
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'quicknotes',
  name: 'Quick Notes',
  icon: '📝',
  description: 'Jot down quick reminders',
  defaultSettings: {
    noteText: '',
  },
  component: QuickNotesWidget,
});

export { QuickNotesWidget };
