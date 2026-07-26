import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppIconProps = {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AppIcon = React.memo<AppIconProps>(({ icon, label, onPress, onLongPress, style }) => {
  const { semantics } = useWeftConfig();
  const ai = semantics.component.appIcon;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.outer, style]}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {/* Icon container — size and shape are paradigm-invariant */}
      <View
        style={[
          styles.iconContainer,
          {
            width: ai.containerSize,
            height: ai.containerSize,
            borderRadius: ai.radius,
            // Shadow chrome from semantics (differs per paradigm)
            elevation: ai.shadow.elevation,
            shadowColor: ai.shadow.shadowColor,
            shadowOffset: ai.shadow.shadowOffset,
            shadowOpacity: ai.shadow.shadowOpacity,
            shadowRadius: ai.shadow.shadowRadius,
          },
        ]}
      >
        {/* Icon fills the container completely */}
        <View style={styles.iconFill}>{icon}</View>
      </View>

      {/* Label */}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            // Full typography token spread
            fontFamily: ai.labelType.fontFamily,
            fontSize: ai.labelType.fontSize,
            lineHeight: ai.labelType.lineHeight,
            fontWeight: ai.labelType.fontWeight,
            letterSpacing: ai.labelType.letterSpacing,
            color: ai.labelColor,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

AppIcon.displayName = 'AppIcon';

// ---------------------------------------------------------------------------
// Styles — structural props only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
  },
  iconContainer: {
    overflow: 'hidden',
  },
  iconFill: {
    flex: 1,
  },
  label: {
    textAlign: 'center',
    marginTop: 4,
  },
});

export { AppIcon };
