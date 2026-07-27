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
  FlatList,
  Image,
  Linking,
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
import { useNotificationBadges } from '../hooks/useNotificationBadges';
import { useGestureHandler } from '../hooks/useGestureHandler';
import { AppIcon } from '../components/AppIcon';
import { AppContextMenu } from '../components/AppContextMenu';
import { AppGridSkeleton } from '../components/AppGridSkeleton';
import { Dock } from '../components/Dock';
import { SectionHeader } from '../components/SectionHeader';
import { WallpaperBackground } from '../components/WallpaperBackground';
import { ClockWidget } from '../components/ClockWidget';
import { WidgetSlot } from '../components/WidgetSlot';
import { AllAppsScreen } from './AllAppsScreen';

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
  badgeCount,
  editMode,
  onLongPress,
}: {
  app: AppDetail;
  iconSize: number;
  cellWidth: number;
  badgeCount: number;
  editMode: boolean;
  onLongPress?: (position: { x: number; y: number; width: number; height: number }) => void;
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
        onLongPressPosition={onLongPress}
        editMode={editMode}
        badgeCount={badgeCount}
      />
    </View>
  );
});

/** Dock slot — resolves pinned apps, falls back to first 4 if none found. */
function DockApps({
  allApps,
  badges,
}: {
  allApps: AppDetail[];
  badges: Map<string, number>;
}) {
  const dockApps = useMemo(() => {
    const byPackage = new Map(allApps.map(a => [a.packageName, a]));
    const pinned = DOCK_PACKAGES
      .map(pkg => byPackage.get(pkg))
      .filter((a): a is AppDetail => a !== undefined);

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
            badgeCount={badges.get(app.packageName) ?? 0}
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
// HomeScreen
// ---------------------------------------------------------------------------

type HomeScreenProps = {
  /** Called when a downward swipe from the top edge is detected. */
  onOpenControlCenter?: () => void;
  /** Called when the user taps the customize gear in the dock. */
  onOpenCustomization?: () => void;
  /** Called when the All Apps drawer should open (swipe-up gesture). */
  onOpenAllApps?: () => void;
  /**
   * Passed a new timestamp by App.tsx whenever the app resumes from background.
   * HomeScreen passes it as the key to WallpaperBackground, forcing a re-read
   * of the wallpaper via WallpaperModule after the user may have changed it.
   * Value of 0 means no refresh needed.
   */
  resumeKey?: number;
};

export function HomeScreen({ onOpenControlCenter, onOpenCustomization, onOpenAllApps, resumeKey = 0 }: HomeScreenProps): React.JSX.Element {
  const { semantics, paradigm } = useWeftConfig();
  const insets = useSafeAreaInsets();
  const { apps, loading, error } = useInstalledApps();
  const { badges, clearBadge } = useNotificationBadges();

  const s = semantics;
  const layout = s.layout;

  // ── Current page tracking ─────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(0);

  // ── Edit mode ─────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);

  // ── Scroll position for parallax ─────────────────────────────────────────
  const scrollX = useRef(new Animated.Value(0)).current;

  // ── All Apps drawer ───────────────────────────────────────────────────────
  const allAppsAnim = useRef(new Animated.Value(0)).current;
  const [isAllAppsOpen, setIsAllAppsOpen] = useState(false);

  // ── Context menu state ────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    packageName: string;
    appLabel: string;
    isSystemApp: boolean;
    anchorPosition: { x: number; y: number; width: number; height: number } | null;
  } | null>(null);

  // ── Back handler ──────────────────────────────────────────────────────────
  // Launchers must swallow the back button — returning true suppresses exit.
  // Edit mode exits on back press before passing through.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (editMode) {
        setEditMode(false);
        return true;
      }
      return true;
    });
    return () => sub.remove();
  }, [editMode]);

  // ── All Apps handlers ─────────────────────────────────────────────────────
  const openAllApps = useCallback(() => {
    setIsAllAppsOpen(true);
    Animated.spring(allAppsAnim, {
      toValue: 1,
      tension: 140,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [allAppsAnim]);

  const closeAllApps = useCallback(() => {
    Animated.spring(allAppsAnim, {
      toValue: 0,
      tension: 160,
      friction: 20,
      useNativeDriver: true,
    }).start(() => setIsAllAppsOpen(false));
  }, [allAppsAnim]);

  // ── Context menu handlers ─────────────────────────────────────────────────
  const handleIconLongPress = useCallback((
    app: AppDetail,
    position: { x: number; y: number; width: number; height: number },
  ) => {
    setContextMenu({
      visible: true,
      packageName: app.packageName,
      appLabel: app.label,
      isSystemApp: false, // react-native-launcher-kit doesn't expose this; default false
      anchorPosition: position,
    });
  }, []);

  const dismissContextMenu = useCallback(() => {
    setContextMenu(prev => (prev ? { ...prev, visible: false } : null));
  }, []);

  // ── Gesture handler — 4-direction swipes with configurable bindings ──────
  const gestureHandler = useGestureHandler({
    onOpenControlCenter,
    onOpenAllApps: openAllApps,
  });

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
              <WidgetSlot />
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
                    badgeCount={badges.get(app.packageName) ?? 0}
                    editMode={editMode}
                    onLongPress={(pos) => handleIconLongPress(app, pos)}
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
      badges,
      editMode,
      handleIconLongPress,
    ],
  );

  const pageKeyExtractor = useCallback((_: AppDetail[], index: number) => String(index), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={[styles.root, { backgroundColor: 'transparent' }]}
      activeOpacity={1}
      onLongPress={() => { if (!editMode) setEditMode(true); }}
      delayLongPress={600}
      accessible={false}
      {...gestureHandler.panHandlers}
    >
      {/* ── Wallpaper layer — sits behind all content ──────────────── */}
      <WallpaperBackground key={resumeKey || undefined} screenWidth={SCREEN_WIDTH} scrollX={scrollX} />

      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle={paradigm === 'skeuo' ? 'dark-content' : 'light-content'}
      />

      {/* ── Loading state — skeleton grid ─────────────────────────────── */}
      {loading && (
        <AppGridSkeleton
          screenWidth={SCREEN_WIDTH}
          paddingLeft={paddingLeft}
          paddingRight={paddingRight}
          topInset={insets.top}
          bottomInset={insets.bottom}
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
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
              useNativeDriver: false,
              listener: handlePageScroll,
            },
          )}
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

      {/* ── Floating customise pill — hidden in edit mode ─────────────── */}
      {!loading && !editMode && (
        <FloatingCustomiseButton
          onPress={onOpenCustomization}
          dockHeight={s.component.dock.height}
          bottomInset={insets.bottom}
          isDark={paradigm !== 'skeuo'}
        />
      )}

      {/* ── Edit mode Done button — replaces customise pill ───────────── */}
      {!loading && editMode && (
        <TouchableOpacity
          onPress={() => setEditMode(false)}
          style={[
            styles.editDoneBtn,
            {
              bottom: insets.bottom + s.component.dock.height + 8,
              backgroundColor: s.accent.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Done editing"
          activeOpacity={0.8}
        >
          <Text style={[styles.editDoneBtnText, { color: s.accent.onAccent }]}>
            Done
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Dock — always rendered, even during app list refresh ─────── */}
      <Dock style={{ paddingBottom: insets.bottom }}>
        <DockApps allApps={apps} badges={badges} />
      </Dock>

      {/* ── Swipe-up handle — hints at the All Apps drawer ────────────── */}
      <View
        pointerEvents="none"
        style={[
          styles.swipeHandle,
          { bottom: insets.bottom + s.component.dock.height + 6 },
        ]}
      >
        <View
          style={[
            styles.swipeHandlePill,
            { backgroundColor: s.surface.home.textSecondary },
          ]}
        />
      </View>

      {/* ── All Apps Drawer ───────────────────────────────────────────── */}
      <AllAppsScreen
        animValue={allAppsAnim}
        isOpen={isAllAppsOpen}
        onDismiss={closeAllApps}
        apps={apps}
      />

      {/* ── App Context Menu ──────────────────────────────────────────── */}
      {contextMenu && (
        <AppContextMenu
          visible={contextMenu.visible}
          packageName={contextMenu.packageName}
          appLabel={contextMenu.appLabel}
          isSystemApp={contextMenu.isSystemApp}
          anchorPosition={contextMenu.anchorPosition}
          onDismiss={dismissContextMenu}
          onOpen={() => {
            RNLauncherKitHelper.launchApplication(contextMenu.packageName);
            dismissContextMenu();
          }}
          onAppInfo={async () => {
            try {
              await Linking.openURL(
                `android-app://com.android.settings/com.android.settings.applications.InstalledAppDetails?inspecting_package=${contextMenu.packageName}`,
              );
            } catch {
              await Linking.openSettings();
            }
            dismissContextMenu();
          }}
          onUninstall={async () => {
            await Linking.openURL(`package:${contextMenu.packageName}`);
            dismissContextMenu();
          }}
          onAddToDock={() => dismissContextMenu()}
          onRemoveFromHome={() => dismissContextMenu()}
        />
      )}
    </TouchableOpacity>
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
  // ── Swipe-up handle ──
  swipeHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // `bottom` applied inline using insets + dock height
  },
  swipeHandlePill: {
    width: 32,
    height: 3,
    borderRadius: 2,
    opacity: 0.35,
  },
  // ── Edit mode ──
  editDoneBtn: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
