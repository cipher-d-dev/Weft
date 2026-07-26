/**
 * Weft — PreviewCard
 *
 * Miniature live surface preview for the Customization screen.
 * Renders a scaled-down replica of the HomeScreen using LOCAL semantics
 * composed from the passed paradigm + activeProfiles props — completely
 * independent of the live WeftConfigContext.
 *
 * What it renders (at 0.36 scale):
 *   - WallpaperBackground-style base color (per paradigm)
 *   - Live clock (hours:minutes, static for perf — updates on prop change)
 *   - SectionHeader "Apps" label
 *   - 4×2 mock app icon grid with colored squares + label stubs
 *   - Dock strip
 *   - Accent color bar at bottom of the dock
 *
 * Scale math:
 *   Card size: 148 × 268 dp (fits 3-across in a row with gaps)
 *   Inner logical size: 148/0.36 ≈ 411 × 268/0.36 ≈ 744
 *   (Close enough to a real phone screen at 393×851)
 */

import React, { useMemo } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { compose } from '../compose/compose';
import { useWeftConfig } from '../hooks/useWeftConfig';
import type { AccessibilityProfile, Paradigm } from '../context/types';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const CARD_W = 148;
const CARD_H = 268;
const SCALE  = 0.36;

const INNER_W = CARD_W / SCALE;  // ≈ 411
const INNER_H = CARD_H / SCALE;  // ≈ 744

// Center the scaled view inside the card
const OFFSET_TOP  = -((INNER_H - CARD_H) / 2);
const OFFSET_LEFT = -((INNER_W - CARD_W) / 2);

// Mock icon grid
const ICON_SIZE  = 52;
const ICON_GAP   = 14;
const GRID_COLS  = 4;
const ICON_COLORS = ['#E8A838', '#4A90D9', '#E05A5A', '#5CBB7A', '#9B6FD0', '#F07030', '#3DBFBF', '#E8A838'];

// Background colors per paradigm (mirrors WallpaperBackground)
const WALLPAPER_BASE: Record<Paradigm, string> = {
  glass:   '#060E17',
  skeuo:   '#D9CFC2',
  minimal: '#080808',
};

const WALLPAPER_HIGHLIGHT: Record<Paradigm, string> = {
  glass:   '#1A3A5C',
  skeuo:   '#F5F0E8',
  minimal: '#1C1C1C',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PreviewCardProps = {
  paradigm: Paradigm;
  activeProfiles?: AccessibilityProfile[];
  /** Optional Animated.Value (0→1) for a crossfade on paradigm change. */
  fadeAnim?: Animated.Value;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Internal sub-components (all accept explicit color/size args — no context)
// ---------------------------------------------------------------------------

function MockWallpaper({ paradigm }: { paradigm: Paradigm }) {
  const base      = WALLPAPER_BASE[paradigm];
  const highlight = WALLPAPER_HIGHLIGHT[paradigm];
  const hlSize    = INNER_W * 1.3;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]}>
      <View
        style={{
          position: 'absolute',
          width: hlSize,
          height: hlSize,
          borderRadius: hlSize / 2,
          backgroundColor: highlight,
          opacity: 0.5,
          top: -(hlSize * 0.15),
          left: (INNER_W - hlSize) / 2,
        }}
      />
    </View>
  );
}

function MockClock({
  textPrimary,
  textSecondary,
  fontFamily,
}: {
  textPrimary: string;
  textSecondary: string;
  fontFamily: string;
}) {
  const now   = new Date();
  let h       = now.getHours();
  const m     = now.getMinutes();
  const ampm  = h >= 12 ? 'PM' : 'AM';
  h           = h % 12 || 12;
  const time  = `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
  const day   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()];

  return (
    <View style={{ paddingTop: INNER_H * 0.07, paddingLeft: 32 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ color: textPrimary, fontFamily, fontSize: 96, fontWeight: '300', letterSpacing: -3, includeFontPadding: false, lineHeight: 100 }}>
          {time}
        </Text>
        <Text style={{ color: textSecondary, fontFamily, fontSize: 22, fontWeight: '500', marginBottom: 14, includeFontPadding: false }}>
          {ampm}
        </Text>
      </View>
      <Text style={{ color: textSecondary, fontFamily, fontSize: 22, fontWeight: '400', marginTop: 4, includeFontPadding: false }}>
        {day}, {month} {now.getDate()}
      </Text>
    </View>
  );
}

function MockSectionHeader({
  label,
  textColor,
  plateBackground,
  fontFamily,
}: {
  label: string;
  textColor: string;
  plateBackground: string;
  fontFamily: string;
}) {
  const showPlate = plateBackground !== 'transparent';

  const textNode = (
    <Text style={{ color: textColor, fontFamily, fontSize: 20, fontWeight: '600', letterSpacing: 1, includeFontPadding: false }}>
      {label}
    </Text>
  );

  if (showPlate) {
    return (
      <View style={{ alignSelf: 'flex-start', backgroundColor: plateBackground, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 16, marginLeft: 32 }}>
        {textNode}
      </View>
    );
  }
  return <View style={{ marginBottom: 16, marginLeft: 32 }}>{textNode}</View>;
}

function MockIconGrid({
  tileBg,
  tileRadius,
  labelColor,
  fontFamily,
  columns,
  gap,
}: {
  tileBg: string;
  tileRadius: number;
  labelColor: string;
  fontFamily: string;
  columns: number;
  gap: number;
}) {
  // Render 2 rows
  const count = columns * 2;

  return (
    <View style={{ paddingHorizontal: 32, flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ alignItems: 'center', gap: 6, width: ICON_SIZE }}>
          {/* Icon square */}
          <View
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              borderRadius: tileRadius,
              backgroundColor: ICON_COLORS[i % ICON_COLORS.length],
              opacity: 0.82,
            }}
          />
          {/* Label stub */}
          <View
            style={{
              width: ICON_SIZE * 0.7,
              height: 7,
              borderRadius: 4,
              backgroundColor: labelColor,
              opacity: 0.35,
            }}
          />
        </View>
      ))}
    </View>
  );
}

function MockDock({
  dockBg,
  dockRadius,
  accentColor,
  border,
}: {
  dockBg: string;
  dockRadius: number;
  accentColor: string;
  border: string;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        backgroundColor: dockBg,
        borderTopLeftRadius: dockRadius,
        borderTopRightRadius: dockRadius,
        borderTopWidth: 1,
        borderTopColor: border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        paddingHorizontal: 28,
      }}
    >
      {/* 3 mock dock icons */}
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: i === 1 ? accentColor : ICON_COLORS[i * 2],
            opacity: 0.85,
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PreviewCard
// ---------------------------------------------------------------------------

const PreviewCard = React.memo<PreviewCardProps>(({
  paradigm,
  activeProfiles,
  fadeAnim,
  style,
}) => {
  // LOCAL semantics — independent of the live context
  const local = useMemo(
    () => compose(paradigm, activeProfiles ?? []),
    [paradigm, activeProfiles],
  );

  // Outer shadow from current context (not the preview's paradigm)
  const { semantics: ctx } = useWeftConfig();
  const outerShadow = ctx.component.widgetCard.shadow;

  const tile   = local.component.tile;
  const dock   = local.component.dock;
  const sh     = local.component.sectionHeader;
  const ff     = local.component.appIcon.labelType.fontFamily;

  const container = (
    <View
      style={[
        styles.outerContainer,
        {
          elevation: outerShadow.elevation + 4,
          shadowColor: outerShadow.shadowColor,
          shadowOffset: outerShadow.shadowOffset,
          shadowOpacity: outerShadow.shadowOpacity,
          shadowRadius: outerShadow.shadowRadius,
        },
        style,
      ]}
    >
      {/* Clip container */}
      <View style={styles.clipContainer}>
        {/* Scaled inner content */}
        <View
          style={[
            styles.scaledContent,
            {
              width: INNER_W,
              height: INNER_H,
              top: OFFSET_TOP,
              left: OFFSET_LEFT,
              transform: [{ scale: SCALE }],
            },
          ]}
        >
          {/* 1 — Wallpaper */}
          <MockWallpaper paradigm={paradigm} />

          {/* 2 — Clock */}
          <MockClock
            textPrimary={local.surface.home.textPrimary}
            textSecondary={local.surface.home.textSecondary}
            fontFamily={ff}
          />

          {/* 3 — Section header */}
          <MockSectionHeader
            label="Apps"
            textColor={sh.textColor}
            plateBackground={sh.plateBackground}
            fontFamily={ff}
          />

          {/* 4 — Icon grid */}
          <MockIconGrid
            tileBg={tile.background}
            tileRadius={tile.radius}
            labelColor={local.surface.home.textPrimary}
            fontFamily={ff}
            columns={local.layout.gridColumns}
            gap={ICON_GAP}
          />

          {/* 5 — Dock */}
          <MockDock
            dockBg={dock.background}
            dockRadius={dock.radius}
            accentColor={local.accent.primary}
            border={dock.border}
          />
        </View>
      </View>
    </View>
  );

  // Wrap in Animated.View if fadeAnim is provided
  if (fadeAnim) {
    return (
      <Animated.View style={[styles.animWrapper, { opacity: fadeAnim }]}>
        {container}
      </Animated.View>
    );
  }

  return container;
});

PreviewCard.displayName = 'PreviewCard';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  animWrapper: {
    // Wraps the card for fade animation
  },
  outerContainer: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: 'hidden',
  },
  clipContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  scaledContent: {
    position: 'absolute',
  },
});

export { PreviewCard };
