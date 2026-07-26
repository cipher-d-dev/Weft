import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WidgetCardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const WidgetCard = React.memo<WidgetCardProps>(({ children, style }) => {
  const { semantics } = useWeftConfig();
  const wc = semantics.component.widgetCard;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: wc.background,
          borderRadius: wc.radius,
          borderColor: wc.border,
          padding: wc.padding,
          // Shadow — spread all shadow props from the token
          elevation: wc.shadow.elevation,
          shadowColor: wc.shadow.shadowColor,
          shadowOffset: wc.shadow.shadowOffset,
          shadowOpacity: wc.shadow.shadowOpacity,
          shadowRadius: wc.shadow.shadowRadius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

WidgetCard.displayName = 'WidgetCard';

// ---------------------------------------------------------------------------
// Styles — structural props only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export { WidgetCard };
