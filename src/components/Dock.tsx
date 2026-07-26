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

  // Android elevation only renders a shadow when backgroundColor is opaque.
  // For Glass (semi-transparent dock background), we split into two layers:
  //   - outer shadow container: opaque white bg + elevation (shadow source)
  //   - inner visible pill:     dock.background color (may be semi-transparent)
  // For Skeuo/Minimal (opaque backgrounds), a single layer suffices but we
  // use the same two-layer approach for consistency.
  const needsShadow = dock.shadow.elevation > 0;

  return (
    <View style={styles.outerContainer}>
      {needsShadow ? (
        // Two-layer approach: shadow on outer, visual style on inner
        <View
          style={[
            styles.shadowPill,
            {
              height: dock.height,
              borderRadius: dock.radius,
              // Opaque white background — required for Android elevation shadow
              backgroundColor: '#FFFFFF',
              elevation: dock.shadow.elevation,
              shadowColor: dock.shadow.shadowColor,
              shadowOffset: dock.shadow.shadowOffset,
              shadowOpacity: dock.shadow.shadowOpacity,
              shadowRadius: dock.shadow.shadowRadius,
            },
          ]}
        >
          {/* Inner pill — carries the actual visual background */}
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
              },
              style,
            ]}
          >
            {children}
          </View>
        </View>
      ) : (
        // No shadow needed (Minimal) — single layer
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
            },
            style,
          ]}
        >
          {children}
        </View>
      )}
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
    alignItems: 'center',
  },
  shadowPill: {
    alignSelf: 'center',
    overflow: 'hidden',   // clip the inner pill to the rounded corners
  },
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export { Dock };
