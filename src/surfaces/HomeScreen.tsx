/**
 * Weft — HomeScreen
 *
 * Phase 4: The live launcher home surface. Replaces AtomTestScreen as the
 * app entry point. Renders:
 *   - Real installed app grid (FlatList, numColumns from semantics)
 *   - A WidgetCard placeholder slot at the top
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

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RNLauncherKitHelper } from 'react-native-launcher-kit';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';

import { useWeftConfig } from '../hooks/useWeftConfig';
import { useInstalledApps } from '../hooks/useInstalledApps';
import { AppIcon } from '../components/AppIcon';
import { Dock } from '../components/Dock';
import { WidgetCard } from '../components/WidgetCard';
import { SectionHeader } from '../components/SectionHeader';

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

// Glass paradigm wallpaper fallback — deep blue-grey that reads well under
// glass tints. Swapped for a real WallpaperManager layer in Phase 7.
const GLASS_FALLBACK_BG = '#0B2438';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single app icon cell rendered inside the FlatList grid. */
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

/** Dock slot — resolves app from the full installed list by package name. */
function DockApps({
  allApps,
}: {
  allApps: AppDetail[];
}) {
  const dockApps = useMemo(() => {
    const byPackage = new Map(allApps.map(a => [a.packageName, a]));
    return DOCK_PACKAGES.map(pkg => byPackage.get(pkg)).filter(
      (a): a is AppDetail => a !== undefined,
    );
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
// HomeScreen
// ---------------------------------------------------------------------------

type HomeScreenProps = {
  /** Called when a downward swipe from the top edge is detected. */
  onOpenControlCenter?: () => void;
};

export function HomeScreen({ onOpenControlCenter }: HomeScreenProps): React.JSX.Element {
  const { semantics, paradigm } = useWeftConfig();
  const insets = useSafeAreaInsets();
  const { apps, loading, error } = useInstalledApps();

  const s = semantics;
  const layout = s.layout;

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

  // ── Background ────────────────────────────────────────────────────────────
  // Glass background is 'transparent' — use the fallback so content is legible
  // until Phase 7 wires up the real wallpaper layer.
  const surfaceBg =
    s.surface.home.background === 'transparent'
      ? GLASS_FALLBACK_BG
      : s.surface.home.background;

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

  // Grid cell width — divide available width equally across columns with gaps.
  // We use a fixed screen width estimate here; Dimensions.get() would be more
  // precise but introduces a re-render on orientation change. Fine for Phase 4.
  const SCREEN_WIDTH = 393; // dp — typical Android density-independent width
  const availableWidth = SCREEN_WIDTH - paddingLeft - paddingRight;
  const totalGapWidth = layout.gridGap * (layout.gridColumns - 1);
  const cellWidth = (availableWidth - totalGapWidth) / layout.gridColumns;
  const iconSize = s.component.appIcon.containerSize;

  // ── FlatList key extractor & renderer ─────────────────────────────────────
  const keyExtractor = useCallback((item: AppDetail) => item.packageName, []);

  const renderItem = useCallback(
    ({ item }: { item: AppDetail }) => (
      <AppGridItem app={item} iconSize={iconSize} cellWidth={cellWidth} />
    ),
    [iconSize, cellWidth],
  );

  // Dock height + bottom inset — scroll content stops above the dock
  const dockClearance = s.component.dock.height + insets.bottom + 8;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={[styles.root, { backgroundColor: surfaceBg }]}
      {...swipeGesture.panHandlers}
    >
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {loading && (
        <View style={styles.centred}>
          <ActivityIndicator color={s.accent.primary} size="large" />
          <Text style={[styles.loadingText, { color: s.surface.home.textSecondary }]}>
            Loading apps…
          </Text>
        </View>
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

      {/* ── App grid ──────────────────────────────────────────────────── */}
      {!loading && error === null && (
        <FlatList
          data={apps}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={layout.gridColumns}
          // key prop forces FlatList to re-mount when column count changes
          // (Cognitive profile reduces columns from 4 → 3)
          key={layout.gridColumns}
          contentContainerStyle={[
            styles.gridContent,
            {
              paddingTop: insets.top + 8,
              paddingLeft,
              paddingRight,
              paddingBottom: dockClearance,
              gap: layout.gridGap,
            },
          ]}
          columnWrapperStyle={
            layout.gridColumns > 1
              ? { gap: layout.gridGap }
              : undefined
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ marginBottom: layout.sectionGap }}>
              {/* ── Widget card placeholder ─────────────────────────── */}
              <SectionHeader label="Widgets" />
              <WidgetCard>
                <Text
                  style={[
                    styles.widgetPlaceholder,
                    {
                      color: s.surface.home.textSecondary,
                      fontFamily: s.component.appIcon.labelType.fontFamily,
                      fontSize: s.component.appIcon.labelType.fontSize,
                    },
                  ]}
                >
                  Widget slot — Phase 7
                </Text>
              </WidgetCard>
              {/* ── Apps section header ─────────────────────────────── */}
              <View style={{ marginTop: layout.sectionGap }}>
                <SectionHeader label="Apps" />
              </View>
            </View>
          }
        />
      )}

      {/* ── Dock ──────────────────────────────────────────────────────── */}
      {!loading && (
        <Dock style={{ paddingBottom: insets.bottom }}>
          <DockApps allApps={apps} />
        </Dock>
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
  gridContent: {
    // paddingTop/Bottom/Left/Right applied inline from insets + semantics
  },
  gridCell: {
    alignItems: 'center',
  },
  iconImage: {
    // width/height applied inline from semantics.appIcon.containerSize
  },
  dockIconImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  widgetPlaceholder: {
    textAlign: 'center',
    paddingVertical: 24,
  },
});