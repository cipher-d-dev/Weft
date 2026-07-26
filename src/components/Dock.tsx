import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DockProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Dock = React.memo<DockProps>(({ children, style }) => {
  const { semantics } = useWeftConfig();
  const dock = semantics.component.dock;
  const gridGap = semantics.layout.gridGap;

  return (
    // Outer absolute container — anchors to bottom edge
    <View style={styles.outerContainer}>
      {/* Inner pill */}
      <View
        style={[
          styles.pill,
          {
            height: dock.height,
            paddingHorizontal: dock.paddingH,
            backgroundColor: dock.background,
            borderRadius: dock.radius,
            borderColor: dock.border,
            gap: gridGap,
            // Shadow
            elevation: dock.shadow.elevation,
            shadowColor: dock.shadow.shadowColor,
            shadowOffset: dock.shadow.shadowOffset,
            shadowOpacity: dock.shadow.shadowOpacity,
            shadowRadius: dock.shadow.shadowRadius,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
});

Dock.displayName = 'Dock';

// ---------------------------------------------------------------------------
// Styles — structural props only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export { Dock };
