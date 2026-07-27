/**
 * Weft — HomeScreen
 *
 * Phase 4: The live launcher home surface. Replaces AtomTestScreen as the
 * app entry point. Renders:
 *   - Real installed app grid (paginated horizontal FlatList, 4 rows per page)
 *   - A ClockWidget + SectionHeader on page 0 only
 *   - Page indicator dots above the floating Customise pill
 *   - A floating 'Customise' pill above the Dock (absolutely positioned)
 *   - A Dock pinned to the bottom with four fixed app shortcuts
 *   - Status bar handled via translucent + useSafeAreaInsets
 *
 * Layout response per accessibility profile (all via semantics tokens):
 *   Motor      — larger touch targets on AppIcon (tile.touchTarget raised)
 *   Vision     — larger icon labels (appIcon.labelType.fontSize raised)
 *   Cognitive  — gridColumns drops to 3, wider gridGap
 *   OneHanded  — content shifts toward thumbSide via asymmetric padding
 *
 * Back button: returning true from hardwareBackPress prevents the launcher
 * from being dismissed — standard behaviour for any Android launcher.
 *
 * Glass paradigm: surface.home.background is 'transparent'. We render a
 * solid dark fallback behind everything so content is legible. Phase 7 will
 * replace this with a real wallpaper layer via WallpaperManager.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  FlatList,
  Image,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RNLauncherKitHelper } from 'react-native-launcher-kit';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';

import { useWeftConfig } from '../hooks/useWeftConfig';
import { useInstalledApps } from '../hooks/useInstalledApps';
import { AppIcon } from '../components/AppIcon';
import { Dock } from '../components/Dock';
import { SectionHeader } from '../components/SectionHeader';
import { WallpaperBackground } from '../components/WallpaperBackground';
import { ClockWidget } from '../components/ClockWidget';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Package names pinned in the dock. If a package isn't installed the slot is
 * silently skipped. Phase 6 will expose a user-editable dock configuration.
 */
const DOCK_PACKAGES = [
  'com.android.dialer',       // Phone
  'com.google.android.apps.messaging', // Messages
  'com.android.chrome',       // Chrome
  'com.android.settings',     // Settings
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single app icon cell rendered inside the page grid. */
const AppGridItem = React.memo(function AppGridItem({
  app,
  iconSize,
  cellWidth,
}: {
  app: AppDetail;
  iconSize: number;
  cellWidth: number;
}) {
  const handlePress = useCallback(() => {
    RNLauncherKitHelper.launchApplication(app.packageName);
  }, [app.packageName]);

  return (
    <View style={[styles.gridCell, { width: cellWidth }]}>
      <AppIcon
        icon={
          <Image
            source={{ uri: app.icon }}
            style={[styles.iconImage, { width: iconSize, height: iconSize, borderRadius: 12 }]}
            resizeMode="cover"
          />
        }
        label={app.label}
        onPress={handlePress}
      />
    </View>
  );
});

/** Dock slot — resolves pinned apps, falls back to first 4 if none found. */
function DockApps({
  allApps,
}: {
  allApps: AppDetail[];
}) {
  const dockApps = useMemo(() => {
    const byPackage = new Map(allApps.map(a => [a.packageName, a]));
    const pinned = DOCK_PACKAGES
      .map(pkg => byPackage.get(pkg))
      .filter((a): a is AppDetail => a !== undefined);

    // If none of the pinned packages are installed (common on emulators
    // which use different package names), fall back to the first 4 apps.
    if (pinned.length === 0 && allApps.length > 0) {
      return allApps.slice(0, 4);
    }
    return pinned;
  }, [allApps]);

  return (
    <>
      {dockApps.map(app => {
        const handlePress = () => RNLauncherKitHelper.launchApplication(app.packageName);
        return (
          <AppIcon
            key={app.packageName}
            icon={
              <Image
                source={{ uri: app.icon }}
                style={styles.dockIconImage}
                resizeMode="cover"
              />
            }
            label={app.label}
            onPress={handlePress}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// FloatingCustomiseButton — pill that floats above the dock
// ---------------------------------------------------------------------------

/**
 * Absolutely-positioned pill centered horizontally, sitting 8dp above the
 * top edge of the dock. Does not affect layout flow.
 */
function FloatingCustomiseButton({
  onPress,
  dockHeight,
  bottomInset,
  isDark,
}: {
  onPress?: () => void;
  dockHeight: number;
  bottomInset: number;
  isDark: boolean;
}) {
  const bottomOffset = bottomInset + dockHeight + 8;

  // Use white or dark pill depending on whether the paradigm has a dark background
  // Using hardcoded rgba instead of hex-appending to variable color strings
  // (which breaks on rgba() values like Glass/Minimal textSecondary)
  const bgColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)';
  const borderColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)';
  const textColor = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.floatingPill,
        {
          bottom: bottomOffset,
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
      accessible
      accessibilityLabel="Customise launcher"
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.floatingPillText,
          { color: textColor },
        ]}
      >
        ✦ Customise
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// PageDots — indicator dots for the horizontal page FlatList
// ---------------------------------------------------------------------------

function PageDots({
  count,
  activeIndex,
  accentColor,
  inactiveColor,
  dockHeight,
  bottomInset,
}: {
  count: number;
  activeIndex: number;
  accentColor: string;
  inactiveColor: string;
  dockHeight: number;
  bottomInset: number;
}) {
  if (count <= 1) {
    return null;
  }

  // Sit 8dp above the FloatingCustomiseButton (which is dockHeight+8+bottomInset from bottom).
  // FloatingCustomiseButton pill height ~28dp. So dots sit at dockHeight+8+bottomInset+28+8.
  const bottomOffset = bottomInset + dockHeight + 8 + 28 + 8;

  return (
    <View
      style={[styles.pageDotsContainer, { bottom: bottomOffset }]}
      accessible
      accessibilityLabel={`Page ${activeIndex + 1} of ${count}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.pageDot,
            {
              backgroundColor: i === activeIndex ? accentColor : inactiveColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonGrid — placeholder shown while apps load
// ---------------------------------------------------------------------------
// SkeletonGrid — left-to-right shimmer placeholder while apps load
// ---------------------------------------------------------------------------

/**
 * Each skeleton cell has a base muted color. A bright shimmer stripe
 * (a narrow white View) translates from -cellWidth to +cellWidth repeatedly,
 * creating the classic left-to-right shimmer effect.
 * All cells share the same translateX anim so they shimmer in sync.
 */
function SkeletonCell({
  width,
  height,
  borderRadius,
  baseColor,
  shimmerX,
}: {
  width: number;
  height: number;
  borderRadius: number;
  baseColor: string;
  shimmerX: Animated.Value;
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
          width: width * 0.5,
          backgroundColor: 'rgba(255,255,255,0.18)',
          transform: [{ translateX: shimmerX }],
        }}
      />
    </View>
  );
}

function SkeletonGrid({
  columns,
  screenWidth,
  paddingH,
  gap,
  iconSize,
  accentColor,
  topInset,
  dockClearance,
}: {
  columns: number;
  screenWidth: number;
  paddingH: number;
  gap: number;
  iconSize: number;
  accentColor: string;
  topInset: number;
  dockClearance: number;
}) {
  const shimmerX = useRef(new Animated.Value(-iconSize)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: iconSize * 1.5,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    return () => shimmerX.stopAnimation();
  }, [shimmerX, iconSize]);

  const cellWidth = (screenWidth - paddingH * 2 - gap * (columns - 1)) / columns;
  const ROWS = 3;
  const cells = Array.from({ length: columns * ROWS });
  // Muted version of accent — skeleton base color
  const baseColor = `${accentColor}28`; // ~16% opacity

  return (
    <View
      style={{
        flex: 1,
        paddingTop: topInset + 80,
        paddingHorizontal: paddingH,
        paddingBottom: dockClearance,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {cells.map((_, i) => (
          <View
            key={i}
            style={{
              width: cellWidth,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <SkeletonCell
              width={iconSize}
              height={iconSize}
              borderRadius={14}
              baseColor={baseColor}
              shimmerX={shimmerX}
            />
            <SkeletonCell
              width={iconSize * 0.6}
              height={7}
              borderRadius={4}
              baseColor={baseColor}
              shimmerX={shimmerX}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

type HomeScreenProps = {
  /** Called when a downward swipe from the top edge is detected. */
  onOpenControlCenter?: () => void;
  /** Called when the user taps the customize gear in the dock. */
  onOpenCustomization?: () => void;
};

export function HomeScreen({ onOpenControlCenter, onOpenCustomization }: HomeScreenProps): React.JSX.Element {
  const { semantics, paradigm } = useWeftConfig();
  const insets = useSafeAreaInsets();
  const { apps, loading, error } = useInstalledApps();

  const s = semantics;
  const layout = s.layout;

  // ── Current page tracking ─────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(0);

  // ── Back handler ──────────────────────────────────────────────────────────
  // Launchers must swallow the back button — returning true suppresses exit.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // ── Swipe-down gesture — opens Control Center ─────────────────────────────
  // We watch for a downward drag that starts within the top-zone (status bar +
  // insets area, roughly the top 80dp) and travels at least 40dp downward.
  // The gesture is only claimed if dy > |dx| (more vertical than horizontal).
  const onOpenRef = useRef(onOpenControlCenter);
  onOpenRef.current = onOpenControlCenter;

  const swipeGesture = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dy, dx, moveY } = gestureState;
        // Only claim downward swipes starting near the top of the screen
        const startedNearTop = moveY < 120;
        const isDownward = dy > 40 && dy > Math.abs(dx) * 1.5;
        return startedNearTop && isDownward;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 40) {
          onOpenRef.current?.();
        }
      },
    }),
  ).current;

  // ── Layout math ───────────────────────────────────────────────────────────
  // One-Handed profile: thumbSide biases padding left or right.
  // 'center' → equal padding both sides (default).
  const oneHandedOffset = 32; // px shift applied to the non-thumb side
  const paddingLeft =
    layout.thumbSide === 'right'
      ? layout.screenPaddingH + oneHandedOffset
      : layout.screenPaddingH;
  const paddingRight =
    layout.thumbSide === 'left'
      ? layout.screenPaddingH + oneHandedOffset
      : layout.screenPaddingH;

  // Use actual screen width so the grid is always centered on any device.
  // Dimensions.get('window') returns the correct dp width accounting for
  // density — no re-render on orientation change since launchers are portrait-locked.
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const availableWidth = SCREEN_WIDTH - paddingLeft - paddingRight;
  const totalGapWidth = layout.gridGap * (layout.gridColumns - 1);
  const cellWidth = (availableWidth - totalGapWidth) / layout.gridColumns;
  const iconSize = s.component.appIcon.containerSize;

  // Dock height + bottom inset — used for floating pill positioning and
  // page content bottom padding.
  const dockClearance = s.component.dock.height + insets.bottom + 8;

  // ── Pagination ────────────────────────────────────────────────────────────
  // 4 rows per page × gridColumns apps per row.
  const appsPerPage = layout.gridColumns * 4;

  const pages = useMemo<AppDetail[][]>(() => {
    if (apps.length === 0) {
      return [];
    }
    const result: AppDetail[][] = [];
    for (let i = 0; i < apps.length; i += appsPerPage) {
      result.push(apps.slice(i, i + appsPerPage));
    }
    return result;
  }, [apps, appsPerPage]);

  // ── Page scroll handler ───────────────────────────────────────────────────
  const handlePageScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentPage(pageIndex);
    },
    [],
  );

  // ── Page renderer ─────────────────────────────────────────────────────────
  const renderPage = useCallback(
    ({ item: pageApps, index: pageIndex }: { item: AppDetail[]; index: number }) => {
      // Build rows of gridColumns items for this page
      const rows: AppDetail[][] = [];
      for (let i = 0; i < pageApps.length; i += layout.gridColumns) {
        rows.push(pageApps.slice(i, i + layout.gridColumns));
      }

      return (
        <View
          style={[
            styles.page,
            {
              width: SCREEN_WIDTH,
              paddingTop: insets.top + 8,
              paddingLeft,
              paddingRight,
              paddingBottom: dockClearance,
            },
          ]}
        >
          {/* Clock and section header only on page 0 */}
          {pageIndex === 0 && (
            <View style={{ marginBottom: layout.sectionGap }}>
              <ClockWidget />
              <View style={{ marginTop: layout.sectionGap * 0.5 }}>
                <SectionHeader label="Apps" />
              </View>
            </View>
          )}

          {/* App grid rows */}
          <View style={styles.pageGrid}>
            {rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={[styles.pageRow, { gap: layout.gridGap, marginBottom: layout.gridGap }]}
              >
                {row.map(app => (
                  <AppGridItem
                    key={app.packageName}
                    app={app}
                    iconSize={iconSize}
                    cellWidth={cellWidth}
                  />
                ))}
                {/* Fill trailing empty cells in the last row */}
                {row.length < layout.gridColumns &&
                  Array.from({ length: layout.gridColumns - row.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={{ width: cellWidth }} />
                  ))}
              </View>
            ))}
          </View>
        </View>
      );
    },
    [
      insets.top,
      paddingLeft,
      paddingRight,
      dockClearance,
      layout.gridColumns,
      layout.gridGap,
      layout.sectionGap,
      iconSize,
      cellWidth,
    ],
  );

  const pageKeyExtractor = useCallback((_: AppDetail[], index: number) => String(index), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={[styles.root, { backgroundColor: 'transparent' }]}
      {...swipeGesture.panHandlers}
    >
      {/* ── Wallpaper layer — sits behind all content ──────────────── */}
      <WallpaperBackground screenWidth={SCREEN_WIDTH} />

      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle={paradigm === 'skeuo' ? 'dark-content' : 'light-content'}
      />

      {/* ── Loading state — skeleton grid ─────────────────────────────── */}
      {loading && (
        <SkeletonGrid
          columns={layout.gridColumns}
          screenWidth={SCREEN_WIDTH}
          paddingH={layout.screenPaddingH}
          gap={layout.gridGap}
          iconSize={iconSize}
          accentColor={s.accent.primary}
          topInset={insets.top}
          dockClearance={dockClearance}
        />
      )}

      {/* ── Error state ───────────────────────────────────────────────── */}
      {!loading && error !== null && (
        <View style={styles.centred}>
          <Text style={[styles.errorText, { color: s.surface.home.textPrimary }]}>
            Could not load apps
          </Text>
          <Text style={[styles.errorSub, { color: s.surface.home.textSecondary }]}>
            {error.message}
          </Text>
        </View>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!loading && error === null && apps.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📱</Text>
          <Text style={[styles.emptyTitle, { color: s.surface.home.textPrimary }]}>
            No apps found
          </Text>
          <Text style={[styles.emptySub, { color: s.surface.home.textSecondary }]}>
            Pull down to refresh
          </Text>
        </View>
      )}

      {/* ── Paginated app grid ────────────────────────────────────────── */}
      {!loading && error === null && pages.length > 0 && (
        <FlatList
          data={pages}
          keyExtractor={pageKeyExtractor}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handlePageScroll}
          scrollEventThrottle={16}
          style={styles.pageFlatList}
          // Re-mount when column count changes (Cognitive profile: 4→3 columns)
          key={`pages-${layout.gridColumns}`}
        />
      )}

      {/* ── Page indicator dots ───────────────────────────────────────── */}
      {!loading && pages.length > 1 && (
        <PageDots
          count={pages.length}
          activeIndex={currentPage}
          accentColor={s.accent.primary}
          inactiveColor={`${s.surface.home.textSecondary}4D`} // 30% opacity ≈ hex 4D
          dockHeight={s.component.dock.height}
          bottomInset={insets.bottom}
        />
      )}

      {/* ── Floating customise pill — above the dock ──────────────────── */}
      {!loading && (
        <FloatingCustomiseButton
          onPress={onOpenCustomization}
          dockHeight={s.component.dock.height}
          bottomInset={insets.bottom}
          isDark={paradigm !== 'skeuo'}
        />
      )}

      {/* ── Dock — always rendered, even during app list refresh ─────── */}
      <Dock style={{ paddingBottom: insets.bottom }}>
        <DockApps allApps={apps} />
      </Dock>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Structural styles only — no colours, radii, or visual tokens
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorSub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  gridCell: {
    alignItems: 'center',
  },
  iconImage: {
    // width/height applied inline from semantics.appIcon.containerSize
  },
  dockIconImage: {
    // Fill the AppIcon container exactly — no white padding showing.
    // The AppIcon clipContainer clips it to the border radius.
    width: '100%',
    height: '100%',
  },
  // ── Paginated grid ──
  pageFlatList: {
    flex: 1,
  },
  page: {
    // width, paddingTop/Left/Right/Bottom applied inline
  },
  pageGrid: {
    // Rows stack vertically; each row is a pageRow
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // ── Floating pill ──
  floatingPill: {
    position: 'absolute',
    alignSelf: 'center',
    // bottom applied inline
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  floatingPillText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  // ── Page dots ──
  pageDotsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    // bottom applied inline
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // ── Empty / error states ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 56,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
});
