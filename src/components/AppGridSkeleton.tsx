/**
 * Weft — AppGridSkeleton
 *
 * Full-screen loading placeholder that mirrors the real HomeScreen layout
 * pixel-for-pixel:
 *
 *   ┌──────────────────────────────────┐
 *   │  [clock block  ~96dp tall]        │  ← SkeletonClockBlock
 *   │  [section header bar]             │  ← SkeletonBar (narrow)
 *   │  □ □ □ □   row 1                  │  ← SkeletonRow × ROWS
 *   │  □ □ □ □   row 2                  │
 *   │  □ □ □ □   row 3                  │
 *   │  □ □ □ □   row 4 (partial)        │
 *   │                                   │
 *   │  [ dock: □ □ □ □ ]               │  ← SkeletonDock
 *   └──────────────────────────────────┘
 *
 * A single Animated.Value drives a left-to-right shimmer stripe across every
 * cell simultaneously — they all pulse in sync.
 *
 * All sizing reads from semantics tokens so the skeleton responds correctly to
 * any active accessibility profile (Motor → bigger icons, Cognitive → 3 cols).
 *
 * Props:
 *   screenWidth   — Dimensions.get('window').width
 *   paddingLeft   — left content padding (may be asymmetric for OneHanded)
 *   paddingRight  — right content padding
 *   topInset      — useSafeAreaInsets().top
 *   bottomInset   — useSafeAreaInsets().bottom
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of app grid rows shown in the skeleton — matches real page layout. */
const GRID_ROWS = 4;

/** Number of dock slots shown in the skeleton. */
const DOCK_SLOTS = 4;

/** How wide the shimmer stripe is relative to the cell width. */
const SHIMMER_WIDTH_RATIO = 0.55;

/** Duration of one shimmer sweep in ms. */
const SHIMMER_DURATION_MS = 1100;

// ---------------------------------------------------------------------------
// SkeletonCell
// ---------------------------------------------------------------------------

/**
 * A single shimmer rectangle — reused for icon squares, label bars, and the
 * dock icon slots.
 */
function SkeletonCell({
  width,
  height,
  borderRadius,
  baseColor,
  shimmerX,
  shimmerWidth,
}: {
  width: number;
  height: number;
  borderRadius: number;
  baseColor: string;
  shimmerX: Animated.Value;
  shimmerWidth: number;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: baseColor,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: shimmerWidth,
          backgroundColor: 'rgba(255,255,255,0.18)',
          transform: [{ translateX: shimmerX }],
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonClockBlock
// ---------------------------------------------------------------------------

/**
 * Placeholder that matches the real ClockWidget's height and position.
 * Two bars: a wide tall one (time digits) and a narrow short one (date line).
 */
function SkeletonClockBlock({
  baseColor,
  shimmerX,
  shimmerWidth,
}: {
  baseColor: string;
  shimmerX: Animated.Value;
  shimmerWidth: number;
}) {
  return (
    <View style={styles.clockBlock}>
      {/* Time digits bar (~56pt high, matches ClockWidget time text) */}
      <SkeletonCell
        width={160}
        height={52}
        borderRadius={10}
        baseColor={baseColor}
        shimmerX={shimmerX}
        shimmerWidth={shimmerWidth}
      />
      {/* Date line bar */}
      <View style={{ marginTop: 8 }}>
        <SkeletonCell
          width={110}
          height={12}
          borderRadius={6}
          baseColor={baseColor}
          shimmerX={shimmerX}
          shimmerWidth={shimmerWidth}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonSectionHeader
// ---------------------------------------------------------------------------

/**
 * Matches the SectionHeader "Apps" label bar height + margin.
 */
function SkeletonSectionHeader({
  baseColor,
  shimmerX,
  shimmerWidth,
}: {
  baseColor: string;
  shimmerX: Animated.Value;
  shimmerWidth: number;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <SkeletonCell
        width={48}
        height={10}
        borderRadius={5}
        baseColor={baseColor}
        shimmerX={shimmerX}
        shimmerWidth={shimmerWidth}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonIconRow
// ---------------------------------------------------------------------------

/**
 * One row of icon + label pairs, matching a real app grid row.
 */
function SkeletonIconRow({
  columns,
  cellWidth,
  iconSize,
  gridGap,
  baseColor,
  shimmerX,
  shimmerWidth,
}: {
  columns: number;
  cellWidth: number;
  iconSize: number;
  gridGap: number;
  baseColor: string;
  shimmerX: Animated.Value;
  shimmerWidth: number;
}) {
  return (
    <View style={[styles.iconRow, { gap: gridGap, marginBottom: gridGap }]}>
      {Array.from({ length: columns }).map((_, i) => (
        <View
          key={i}
          style={[styles.iconCell, { width: cellWidth }]}
        >
          <SkeletonCell
            width={iconSize}
            height={iconSize}
            borderRadius={14}
            baseColor={baseColor}
            shimmerX={shimmerX}
            shimmerWidth={shimmerWidth}
          />
          {/* Icon label bar */}
          <View style={{ marginTop: 5 }}>
            <SkeletonCell
              width={iconSize * 0.6}
              height={7}
              borderRadius={4}
              baseColor={baseColor}
              shimmerX={shimmerX}
              shimmerWidth={shimmerWidth}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonDock
// ---------------------------------------------------------------------------

/**
 * Matches the real Dock pill at the bottom of the screen — same height,
 * radius, and icon slot count.
 */
function SkeletonDock({
  dockHeight,
  dockRadius,
  dockPaddingH,
  dockBackground,
  iconSize,
  gridGap,
  bottomInset,
  baseColor,
  shimmerX,
  shimmerWidth,
}: {
  dockHeight: number;
  dockRadius: number;
  dockPaddingH: number;
  dockBackground: string;
  iconSize: number;
  gridGap: number;
  bottomInset: number;
  baseColor: string;
  shimmerX: Animated.Value;
  shimmerWidth: number;
}) {
  return (
    <View
      style={[
        styles.dockOuter,
        { bottom: bottomInset },
      ]}
    >
      <View
        style={[
          styles.dockPill,
          {
            height: dockHeight,
            borderRadius: dockRadius,
            backgroundColor: dockBackground,
            paddingHorizontal: dockPaddingH,
            gap: gridGap,
          },
        ]}
      >
        {Array.from({ length: DOCK_SLOTS }).map((_, i) => (
          <SkeletonCell
            key={i}
            width={iconSize}
            height={iconSize}
            borderRadius={14}
            baseColor={baseColor}
            shimmerX={shimmerX}
            shimmerWidth={shimmerWidth}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AppGridSkeleton — main export
// ---------------------------------------------------------------------------

export type AppGridSkeletonProps = {
  screenWidth: number;
  paddingLeft: number;
  paddingRight: number;
  topInset: number;
  bottomInset: number;
};

export function AppGridSkeleton({
  screenWidth,
  paddingLeft,
  paddingRight,
  topInset,
  bottomInset,
}: AppGridSkeletonProps) {
  const { semantics } = useWeftConfig();
  const s = semantics;
  const layout = s.layout;
  const dock = s.component.dock;
  const appIcon = s.component.appIcon;

  // ── Layout math (mirrors HomeScreen exactly) ───────────────────────────
  const availableWidth = screenWidth - paddingLeft - paddingRight;
  const totalGapWidth = layout.gridGap * (layout.gridColumns - 1);
  const cellWidth = (availableWidth - totalGapWidth) / layout.gridColumns;
  const iconSize = appIcon.containerSize;

  // Shimmer travels from off-screen left to off-screen right
  const shimmerWidth = iconSize * SHIMMER_WIDTH_RATIO;
  const shimmerX = useRef(new Animated.Value(-shimmerWidth)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: screenWidth,
        duration: SHIMMER_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    return () => shimmerX.stopAnimation();
  }, [shimmerX, screenWidth]);

  // Base color: accent at ~14% opacity — visible on any paradigm background
  const baseColor = `${s.accent.primary}24`;

  // Dock clearance used as paddingBottom on the scroll area
  const dockClearance = dock.height + bottomInset + 8;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ── Scrollable content area ──────────────────────────────────── */}
      <View
        style={{
          flex: 1,
          paddingTop: topInset + 8,
          paddingLeft,
          paddingRight,
          paddingBottom: dockClearance,
        }}
      >
        {/* Clock placeholder */}
        <SkeletonClockBlock
          baseColor={baseColor}
          shimmerX={shimmerX}
          shimmerWidth={shimmerWidth}
        />

        {/* "Apps" section header placeholder */}
        <SkeletonSectionHeader
          baseColor={baseColor}
          shimmerX={shimmerX}
          shimmerWidth={shimmerWidth}
        />

        {/* App icon grid rows */}
        {Array.from({ length: GRID_ROWS }).map((_, row) => (
          <SkeletonIconRow
            key={row}
            columns={layout.gridColumns}
            cellWidth={cellWidth}
            iconSize={iconSize}
            gridGap={layout.gridGap}
            baseColor={baseColor}
            shimmerX={shimmerX}
            shimmerWidth={shimmerWidth}
          />
        ))}
      </View>

      {/* ── Dock placeholder ─────────────────────────────────────────── */}
      <SkeletonDock
        dockHeight={dock.height}
        dockRadius={dock.radius}
        dockPaddingH={dock.paddingH}
        dockBackground={dock.background}
        iconSize={iconSize}
        gridGap={layout.gridGap}
        bottomInset={bottomInset}
        baseColor={baseColor}
        shimmerX={shimmerX}
        shimmerWidth={shimmerWidth}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  clockBlock: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
  },
  sectionHeaderRow: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCell: {
    alignItems: 'center',
  },
  dockOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
  },
});
