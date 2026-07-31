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
  FlatList,
  Image,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RNLauncherKitHelper } from 'react-native-launcher-kit';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';

import { useWeftConfig } from '../hooks/useWeftConfig';
import { useInstalledApps } from '../hooks/useInstalledApps';
import { useNotificationBadges } from '../hooks/useNotificationBadges';
import { useGestureHandler } from '../hooks/useGestureHandler';
import { useAdaptiveText } from '../hooks/useAdaptiveText';
import { AppIcon } from '../components/AppIcon';
import { AppContextMenu } from '../components/AppContextMenu';
import { AppGridSkeleton } from '../components/AppGridSkeleton';
import { FolderIcon } from '../components/FolderIcon';
import { FolderModal } from '../components/FolderModal';
import { Dock } from '../components/Dock';
import { SectionHeader } from '../components/SectionHeader';
import { WallpaperBackground } from '../components/WallpaperBackground';
import { ClockWidget } from '../components/ClockWidget';
import { buildInitialFolders, findFolderForPackage } from '../utils/appCategories';
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

  // Sit 10dp above the dock pill top edge
  const bottomOffset = bottomInset + dockHeight + 10;

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

export function HomeScreen({ onOpenCustomization, onOpenAllApps, resumeKey = 0 }: HomeScreenProps): React.JSX.Element {
  const { semantics, pinnedApps, setPinnedApps, folders, setFolders, upsertFolder, moveAppToFolder, seedVersion, setSeedVersion } = useWeftConfig();
  const insets = useSafeAreaInsets();
  const { apps, loading, error } = useInstalledApps();
  const { badges, clearBadge } = useNotificationBadges();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const adaptiveText = useAdaptiveText();

  const s = semantics;
  const layout = s.layout;

  // ── Home screen seeding ───────────────────────────────────────────────────
  // SEED_VERSION: bump this number whenever the seeding logic changes so
  // existing users with stale data get re-seeded on next launch.
  const SEED_VERSION = 2;

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (loading) return;
    if (apps.length === 0) return;
    // Re-seed if seedVersion in persisted config is older than current code
    if (seedVersion >= SEED_VERSION) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    const { folders: newFolders, pinnedApps: newPinned } =
      buildInitialFolders(apps.map(a => a.packageName));
    setFolders(newFolders);
    setPinnedApps(newPinned);
    setSeedVersion(SEED_VERSION);
  }, [loading, apps, seedVersion, setFolders, setPinnedApps, setSeedVersion]);

  // ── Auto-add newly installed apps to the right folder or home grid ────────
  const prevAppsRef = useRef<string[]>([]);
  useEffect(() => {
    if (loading) return;
    const currentPkgs = apps.map(a => a.packageName);
    const prev = prevAppsRef.current;
    if (prev.length === 0) {
      prevAppsRef.current = currentPkgs;
      return;
    }
    const prevSet = new Set(prev);
    const newPkgs = currentPkgs.filter(p => !prevSet.has(p));
    if (newPkgs.length > 0) {
      newPkgs.forEach(pkg => {
        const folderId = findFolderForPackage(pkg, folders);
        if (folderId) {
          moveAppToFolder(pkg, folderId);
        } else {
          setPinnedApps(current => {
            const existing = new Set(current);
            return existing.has(pkg) ? current : [...current, pkg];
          });
        }
      });
    }
    prevAppsRef.current = currentPkgs;
  }, [apps, loading, folders, moveAppToFolder, setPinnedApps]);

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

  // ── Folder modal state ────────────────────────────────────────────────────
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const openFolder = useCallback((id: string) => setOpenFolderId(id), []);
  const closeFolder = useCallback(() => setOpenFolderId(null), []);

  // ── Folder picker state (move app to folder) ──────────────────────────────
  const [folderPickerPkg, setFolderPickerPkg] = useState<string | null>(null);

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
    if (!editMode) {
      setEditMode(true);
    }
    setContextMenu({
      visible: true,
      packageName: app.packageName,
      appLabel: app.label,
      isSystemApp: false,
      anchorPosition: position,
    });
  }, [editMode]);

  const dismissContextMenu = useCallback(() => {
    setContextMenu(prev => (prev ? { ...prev, visible: false } : null));
  }, []);

  // ── Gesture handler — 4-direction swipes + background long-press ────────
  const { panHandlers } = useGestureHandler({
    onOpenAllApps: openAllApps,
    onLongPressBackground: onOpenCustomization,
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
  // useWindowDimensions() returns the correct dp width accounting for
  // density and reacts to orientation/resize changes.
  const availableWidth = SCREEN_WIDTH - paddingLeft - paddingRight;
  const totalGapWidth = layout.gridGap * (layout.gridColumns - 1);
  const cellWidth = (availableWidth - totalGapWidth) / layout.gridColumns;
  const iconSize = s.component.appIcon.containerSize;

  // Dock height + bottom inset — used for floating pill positioning and
  // page content bottom padding.
  const dockClearance = s.component.dock.height + insets.bottom + 8;

  // ── Pagination ────────────────────────────────────────────────────────────
  // 4 rows per page × gridColumns items per row.
  // Each item is either an AppDetail (package name) or a folder sentinel.
  type GridItem =
    | { kind: 'app'; app: AppDetail }
    | { kind: 'folder'; folderId: string };

  const appsPerPage = layout.gridColumns * 4;

  const gridItems = useMemo<GridItem[]>(() => {
    const byPkg = new Map(apps.map(a => [a.packageName, a]));
    return pinnedApps
      .map(entry => {
        if (entry.startsWith('folder:')) {
          return { kind: 'folder' as const, folderId: entry.slice(7) };
        }
        const app = byPkg.get(entry);
        return app ? { kind: 'app' as const, app } : null;
      })
      .filter((x): x is GridItem => x !== null);
  }, [pinnedApps, apps]);

  const pages = useMemo<GridItem[][]>(() => {
    if (gridItems.length === 0) return [];
    const result: GridItem[][] = [];
    for (let i = 0; i < gridItems.length; i += appsPerPage) {
      result.push(gridItems.slice(i, i + appsPerPage));
    }
    return result;
  }, [gridItems, appsPerPage]);

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
    ({ item: pageItems, index: pageIndex }: { item: GridItem[]; index: number }) => {
      // Build rows of gridColumns items
      const rows: GridItem[][] = [];
      for (let i = 0; i < pageItems.length; i += layout.gridColumns) {
        rows.push(pageItems.slice(i, i + layout.gridColumns));
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

          {/* Grid rows */}
          <View style={styles.pageGrid}>
            {rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={[styles.pageRow, { gap: layout.gridGap, marginBottom: layout.gridGap }]}
              >
                {row.map((item, colIndex) => {
                  if (item.kind === 'folder') {
                    const folder = folders.find(f => f.id === item.folderId);
                    if (!folder) return <View key={item.folderId} style={{ width: cellWidth }} />;
                    return (
                      <View key={item.folderId} style={[styles.gridCell, { width: cellWidth }]}>
                        <FolderIcon
                          folder={folder}
                          apps={apps}
                          onOpen={() => openFolder(folder.id)}
                          editMode={editMode}
                          onLongPressPosition={(pos) => {
                            if (!editMode) setEditMode(true);
                            // folder long-press just enters edit mode — no context menu yet
                          }}
                        />
                      </View>
                    );
                  }
                  return (
                    <AppGridItem
                      key={item.app.packageName}
                      app={item.app}
                      iconSize={iconSize}
                      cellWidth={cellWidth}
                      badgeCount={badges.get(item.app.packageName) ?? 0}
                      editMode={editMode}
                      onLongPress={(pos) => handleIconLongPress(item.app, pos)}
                    />
                  );
                })}
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
      folders,
      apps,
      openFolder,
    ],
  );

  const pageKeyExtractor = useCallback((_: GridItem[], index: number) => String(index), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={[styles.root, { backgroundColor: 'transparent' }]}
      accessible={false}
      {...panHandlers}
    >
      {/* ── Wallpaper layer ───────────────────────────────────────────── */}
      <WallpaperBackground key={String(resumeKey)} screenWidth={SCREEN_WIDTH} scrollX={scrollX} />

      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle={adaptiveText.isDark ? 'light-content' : 'dark-content'}
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
          <Text style={[styles.errorText, { color: adaptiveText.textColor }]}>
            Could not load apps
          </Text>
          <Text style={[styles.errorSub, { color: adaptiveText.textColorSoft }]}>
            {error.message}
          </Text>
        </View>
      )}

      {/* ── Empty home state ──────────────────────────────────────────── */}
      {!loading && error === null && gridItems.length === 0 && (
        <View style={styles.emptyState}>
          <View style={[styles.emptyPhoneOuter, { borderColor: adaptiveText.textColorSoft }]}>
            <View style={[styles.emptyPhoneScreen, { backgroundColor: adaptiveText.textColorSoft }]} />
            <View style={[styles.emptyPhoneBtn,   { backgroundColor: adaptiveText.textColorSoft }]} />
          </View>
          <Text style={[styles.emptyTitle, { color: adaptiveText.textColor }]}>
            Home is empty
          </Text>
          <Text style={[styles.emptySub, { color: adaptiveText.textColorSoft }]}>
            Swipe up to open All Apps{'\n'}then long-press any app to add it here
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
          inactiveColor={`${s.surface.home.textSecondary}4D`}
          dockHeight={s.component.dock.height}
          bottomInset={insets.bottom}
        />
      )}

      {/* ── Dock — always rendered, even during app list refresh ─────── */}
      <Dock style={{ paddingBottom: insets.bottom }}>
        <DockApps allApps={apps} badges={badges} />
        {/* Done button — only visible in edit mode */}
        {editMode && (
          <TouchableOpacity
            onPress={() => setEditMode(false)}
            style={[styles.dockDoneBtn, { backgroundColor: s.accent.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Done editing"
            activeOpacity={0.8}
          >
            <Text style={[styles.dockDoneBtnText, { color: s.accent.onAccent }]}>
              Done
            </Text>
          </TouchableOpacity>
        )}
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
        onAddToDock={(app) => {
          // Pin app to home grid (avoid duplicates)
          setPinnedApps(
            pinnedApps.includes(app.packageName)
              ? pinnedApps
              : [...pinnedApps, app.packageName],
          );
        }}
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
          onAddToDock={() => {
            setPinnedApps(
              pinnedApps.includes(contextMenu.packageName)
                ? pinnedApps
                : [...pinnedApps, contextMenu.packageName],
            );
            dismissContextMenu();
          }}
          onRemoveFromHome={() => {
            setPinnedApps(pinnedApps.filter(p => p !== contextMenu.packageName));
            dismissContextMenu();
          }}
          onMoveToFolder={folders.length > 0 ? () => {
            setFolderPickerPkg(contextMenu.packageName);
            dismissContextMenu();
          } : undefined}
        />
      )}

      {/* ── Folder Modal ──────────────────────────────────────────────── */}
      {openFolderId && (() => {
        const folder = folders.find(f => f.id === openFolderId);
        if (!folder) return null;
        return (
          <FolderModal
            key={folder.id}
            folder={folder}
            apps={apps}
            visible={openFolderId === folder.id}
            onClose={closeFolder}
          />
        );
      })()}

      {/* ── Folder Picker — "Move to Folder" from context menu ────────── */}
      {folderPickerPkg !== null && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, styles.folderPickerScrim]}
          activeOpacity={1}
          onPress={() => setFolderPickerPkg(null)}
          accessible={false}
        >
          <View
            style={[
              styles.folderPickerCard,
              {
                backgroundColor: s.surface.home.backgroundAlt,
                borderColor: s.surface.home.border,
              },
            ]}
          >
            <Text style={[styles.folderPickerTitle, { color: s.surface.home.textPrimary }]}>
              Move to Folder
            </Text>
            {folders.map(folder => (
              <TouchableOpacity
                key={folder.id}
                style={[styles.folderPickerItem, { borderTopColor: s.surface.home.border }]}
                onPress={() => {
                  moveAppToFolder(folderPickerPkg, folder.id);
                  setFolderPickerPkg(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={folder.name}
                activeOpacity={0.7}
              >
                <Text style={[styles.folderPickerItemText, { color: s.surface.home.textPrimary }]}>
                  {folder.name}
                </Text>
                <Text style={[styles.folderPickerItemCount, { color: s.surface.home.textSecondary }]}>
                  {folder.packageNames.length} apps
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
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
  // ── Dock done button (edit mode) ──
  dockDoneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    marginLeft: 4,
  },
  dockDoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  emptyPhoneOuter: {
    width: 44,
    height: 72,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    opacity: 0.55,
    marginBottom: 4,
  },
  emptyPhoneScreen: {
    width: 24,
    height: 28,
    borderRadius: 3,
    opacity: 0.6,
  },
  emptyPhoneBtn: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.5,
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
  // ── Folder picker ──
  folderPickerScrim: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  folderPickerCard: {
    width: '78%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: 4,
  },
  folderPickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    opacity: 0.5,
    paddingVertical: 14,
  },
  folderPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  folderPickerItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  folderPickerItemCount: {
    fontSize: 13,
  },
});
