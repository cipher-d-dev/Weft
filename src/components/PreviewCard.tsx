import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { compose } from '../compose/compose';
import { useWeftConfig } from '../hooks/useWeftConfig';
import type { AccessibilityProfile, Paradigm } from '../context/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTER_WIDTH = 160;
const OUTER_HEIGHT = 280;
const SCALE = 0.38;

// Full logical dimensions before scaling
const INNER_WIDTH = OUTER_WIDTH / SCALE;   // ≈ 421
const INNER_HEIGHT = OUTER_HEIGHT / SCALE; // ≈ 737

// Negative offsets to centre the scaled View inside the clipping container
const OFFSET_TOP = -((INNER_HEIGHT - OUTER_HEIGHT) / 2);  // ≈ -228.5
const OFFSET_LEFT = -((INNER_WIDTH - OUTER_WIDTH) / 2);   // ≈ -130.5

// Mock grid tile dimensions (rendered at full logical scale, looks small after 0.38)
const TILE_SIZE = 80;
const TILE_GAP = 12;

// Mock dock dimensions
const MOCK_DOCK_HEIGHT = 72;

// Accent dot
const DOT_SIZE = 20;

// Fallback background when surface.home.background is 'transparent'
const FALLBACK_BG = '#0B2438';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PreviewCardProps = {
  paradigm: Paradigm;
  activeProfiles?: AccessibilityProfile[];
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PreviewCard = React.memo<PreviewCardProps>(({ paradigm, activeProfiles, style }) => {
  // LOCAL semantics — composed from the props, not the live context.
  // This is what lets the Customization screen render non-active paradigms.
  const local = useMemo(
    () => compose(paradigm, activeProfiles ?? []),
    [paradigm, activeProfiles],
  );

  // CURRENT context semantics — only used for the outer chrome shadow.
  const { semantics: ctx } = useWeftConfig();
  const outerShadow = ctx.component.widgetCard.shadow;

  // Resolve background — treat 'transparent' as the deep-navy fallback
  const bgColor =
    local.surface.home.background === 'transparent'
      ? FALLBACK_BG
      : local.surface.home.background;

  // Tile values from local semantics
  const tileBg = local.component.tile.background;
  const tileRadius = local.component.tile.radius / 2; // scaled-down feel

  // Dock value from local semantics
  const dockBg = local.component.dock.background;

  // Accent dot color
  const accentDot = local.accent.primary;

  return (
    // Outer chrome — uses CURRENT context widgetCard shadow + fixed border radius
    <View
      style={[
        styles.outerContainer,
        {
          elevation: outerShadow.elevation,
          shadowColor: outerShadow.shadowColor,
          shadowOffset: outerShadow.shadowOffset,
          shadowOpacity: outerShadow.shadowOpacity,
          shadowRadius: outerShadow.shadowRadius,
        },
        style,
      ]}
    >
      {/* Inner clipping container with local background */}
      <View style={[styles.clipContainer, { backgroundColor: bgColor }]}>
        {/* Scaled content — transform origin is top-left so we offset to centre */}
        <View
          style={[
            styles.scaledContent,
            {
              width: INNER_WIDTH,
              height: INNER_HEIGHT,
              top: OFFSET_TOP,
              left: OFFSET_LEFT,
              transform: [{ scale: SCALE }],
            },
          ]}
        >
          {/* Mock 2×2 app grid */}
          <View style={styles.mockGrid}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  styles.mockTile,
                  {
                    backgroundColor: tileBg,
                    borderRadius: tileRadius,
                  },
                ]}
              />
            ))}
          </View>

          {/* Mock dock strip */}
          <View
            style={[
              styles.mockDock,
              {
                backgroundColor: dockBg,
                height: MOCK_DOCK_HEIGHT,
              },
            ]}
          />

          {/* Accent dot — top-right corner indicator */}
          <View
            style={[
              styles.accentDot,
              { backgroundColor: accentDot },
            ]}
          />
        </View>
      </View>
    </View>
  );
});

PreviewCard.displayName = 'PreviewCard';

// ---------------------------------------------------------------------------
// Styles — structural props only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outerContainer: {
    width: OUTER_WIDTH,
    height: OUTER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  clipContainer: {
    width: OUTER_WIDTH,
    height: OUTER_HEIGHT,
    overflow: 'hidden',
  },
  scaledContent: {
    position: 'absolute',
  },
  mockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
    padding: TILE_GAP * 2,
    marginTop: INNER_HEIGHT * 0.18, // push grid into the upper-middle portion
  },
  mockTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mockDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  accentDot: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});

export { PreviewCard };
