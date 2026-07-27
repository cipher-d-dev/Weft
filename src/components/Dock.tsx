import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

type DockProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const Dock = React.memo<DockProps>(({ children, style }) => {
  const { semantics } = useWeftConfig();
  const dock = semantics.component.dock;
  const gridGap = semantics.layout.gridGap;

  const hasShadow = dock.shadow.elevation > 0;

  // Horizontal margin gives the pill breathing room on both sides.
  // The pill shrink-wraps to its children — it has no fixed width.
  // The outerContainer is full-width absolute, alignItems:'center' centers
  // the pill within it.
  const PILL_MARGIN_H = 24;

  if (!hasShadow) {
    // Minimal — flat, single layer
    return (
      <View style={styles.outerContainer}>
        <View
          style={[
            styles.pill,
            {
              height: dock.height,
              paddingHorizontal: dock.paddingH,
              backgroundColor: dock.background,
              borderRadius: dock.radius,
              borderWidth: 1,
              borderColor: dock.border,
              gap: gridGap,
              marginHorizontal: PILL_MARGIN_H,
            },
            style,
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  // With shadow: two-layer approach.
  // The shadow carrier must have an opaque backgroundColor for Android
  // elevation to render. We DON'T use overflow:hidden on the carrier —
  // that was clipping children. Instead we clip only the background
  // (not the children) by layering a background View behind the content.
  return (
    <View style={styles.outerContainer}>
      <View
        style={[
          styles.shadowCarrier,
          {
            height: dock.height,
            borderRadius: dock.radius,
            elevation: dock.shadow.elevation,
            shadowColor: dock.shadow.shadowColor,
            shadowOffset: dock.shadow.shadowOffset,
            shadowOpacity: dock.shadow.shadowOpacity,
            shadowRadius: dock.shadow.shadowRadius,
            marginHorizontal: PILL_MARGIN_H,
          },
        ]}
      >
        {/* Background layer — clips to border radius, sits behind content */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: dock.background,
              borderRadius: dock.radius,
              borderWidth: 1,
              borderColor: dock.border,
            },
          ]}
        />

        {/* Content row — not clipped, renders above the background */}
        <View
          style={[
            styles.pill,
            {
              height: dock.height,
              paddingHorizontal: dock.paddingH,
              gap: gridGap,
            },
            style,
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
});

Dock.displayName = 'Dock';

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shadowCarrier: {
    // Opaque white background required for Android elevation shadow.
    // No overflow:hidden — that was clipping children.
    backgroundColor: '#FFFFFF',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export { Dock };
