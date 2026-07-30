/**
 * Weft — AllAppsScreen
 *
 * Full app drawer — a bottom sheet that rises to 94% of screen height.
 * Owned by HomeScreen which passes down an Animated.Value (0=closed, 1=open).
 *
 * Features:
 *   - Animated bottom sheet (translateY on native driver)
 *   - Search bar with real-time filtering + auto-focus on open
 *   - Recently-used row (AsyncStorage, max 8, top 4 displayed)
 *   - Alphabetical sections rendered via a flat array for FlatList so
 *     getItemLayout works precisely (no SectionList)
 *   - Right-edge alphabetical index bar — tap to jump, active letter accented
 *   - AppContextMenu on long-press
 *   - Glass paradigm: BlurView behind the sheet when glassContainer is non-null
 *   - BackHandler closes the drawer when open
 *   - All colours/radii/typography from semantics tokens — zero inline overrides
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RNLauncherKitHelper } from 'react-native-launcher-kit';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';

import { useWeftConfig } from '../hooks/useWeftConfig';
import { AppIcon } from '../components/AppIcon';
import { SectionHeader } from '../components/SectionHeader';
import { AppContextMenu } from '../components/AppContextMenu';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECENT_APPS_KEY = 'weft:recentApps';
const MAX_RECENT = 8;
const RECENT_DISPLAY = 4;

const ALPHA_LETTERS = [
  '#','A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
];

/** Height of each alpha index letter tap zone. */
const INDEX_LETTER_HEIGHT = 18;

/** Height of a section-header row in the flat list. */
const SECTION_HEADER_HEIGHT = 36;

/** Height of the search bar area (input + vertical padding). */
const SEARCH_BAR_HEIGHT = 56;

/** Height of the handle bar area. */
const HANDLE_AREA_HEIGHT = 28;

/** Height of the recently-used horizontal row (including label + padding). */
const RECENT_ROW_HEIGHT = 110;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AllAppsScreenProps = {
  /** 0 = closed, 1 = open. Owned by HomeScreen. */
  animValue: Animated.Value;
  isOpen: boolean;
  onDismiss: () => void;
  /** Pre-loaded app list from HomeScreen's useInstalledApps. */
  apps: AppDetail[];
  /** Called when user picks "Add to Dock" from the context menu. */
  onAddToDock?: (app: AppDetail) => void;
};

// ---------------------------------------------------------------------------
// Flat-list item shapes
// ---------------------------------------------------------------------------

type HeaderItem = { type: 'header'; letter: string; key: string };
type RowItem   = { type: 'row';    apps: AppDetail[]; key: string };
type ListItem  = HeaderItem | RowItem;


// ---------------------------------------------------------------------------
// Helper: build flat section data from a sorted app list
// ---------------------------------------------------------------------------

/**
 * Converts a sorted AppDetail[] into a flat ListItem[] suitable for FlatList.
 * Each letter group becomes: one HeaderItem followed by N RowItems, where N
 * is Math.ceil(apps.length / columns).
 */
function buildSectionData(sortedApps: AppDetail[], columns: number): ListItem[] {
  if (sortedApps.length === 0) return [];

  const grouped = new Map<string, AppDetail[]>();

  for (const app of sortedApps) {
    const firstChar = app.label.trim()[0]?.toUpperCase() ?? '#';
    const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#';
    const bucket = grouped.get(letter);
    if (bucket) {
      bucket.push(app);
    } else {
      grouped.set(letter, [app]);
    }
  }

  // Sort buckets: '#' first, then A-Z
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === '#') return -1;
    if (b === '#') return 1;
    return a.localeCompare(b);
  });

  const items: ListItem[] = [];
  for (const letter of sortedKeys) {
    const bucket = grouped.get(letter)!;
    items.push({ type: 'header', letter, key: `header-${letter}` });
    const rowCount = Math.ceil(bucket.length / columns);
    for (let r = 0; r < rowCount; r++) {
      const slice = bucket.slice(r * columns, (r + 1) * columns);
      items.push({ type: 'row', apps: slice, key: `row-${letter}-${r}` });
    }
  }
  return items;
}

/**
 * Build a flat filtered list (no section headers) for search results.
 * Returns RowItems only.
 */
function buildFilteredData(filteredApps: AppDetail[], columns: number): ListItem[] {
  if (filteredApps.length === 0) return [];
  const items: ListItem[] = [];
  const rowCount = Math.ceil(filteredApps.length / columns);
  for (let r = 0; r < rowCount; r++) {
    const slice = filteredApps.slice(r * columns, (r + 1) * columns);
    items.push({ type: 'row', apps: slice, key: `filtered-row-${r}` });
  }
  return items;
}

/**
 * Derive the set of letters that actually have data, for the index bar.
 */
function getActiveLetters(items: ListItem[]): Set<string> {
  const s = new Set<string>();
  for (const item of items) {
    if (item.type === 'header') s.add(item.letter);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Helper: build a letter → flat-list index map for scrollToIndex
// ---------------------------------------------------------------------------

function buildLetterIndexMap(items: ListItem[]): Map<string, number> {
  const map = new Map<string, number>();
  items.forEach((item, idx) => {
    if (item.type === 'header') map.set(item.letter, idx);
  });
  return map;
}


// ---------------------------------------------------------------------------
// AppRow — memoised row of AppIcon cells
// ---------------------------------------------------------------------------

type AppRowProps = {
  apps: AppDetail[];
  columns: number;
  iconSize: number;
  gridGap: number;
  screenPaddingH: number;
  screenWidth: number;
  cognitiveMode: boolean;
  onPress: (app: AppDetail) => void;
  onLongPressPosition: (app: AppDetail, pos: { x: number; y: number; width: number; height: number }) => void;
};

const AppRow = React.memo<AppRowProps>(({
  apps,
  columns,
  iconSize,
  gridGap,
  screenPaddingH,
  screenWidth,
  cognitiveMode,
  onPress,
  onLongPressPosition,
}) => {
  const cellWidth = cognitiveMode
    ? undefined
    : (screenWidth - screenPaddingH * 2 - gridGap * (columns - 1)) / columns;

  return (
    <View style={[styles.rowContainer, { gap: gridGap, paddingHorizontal: screenPaddingH }]}>
      {apps.map(app => (
        <View
          key={app.packageName}
          style={cognitiveMode
            ? styles.cognitiveCell
            : { width: cellWidth, alignItems: 'center' }
          }
        >
          <AppIcon
            icon={
              <Image
                source={{ uri: app.icon }}
                style={{ width: iconSize, height: iconSize }}
                resizeMode="contain"
              />
            }
            label={app.label}
            onPress={() => onPress(app)}
            onLongPressPosition={pos => onLongPressPosition(app, pos)}
          />
        </View>
      ))}
    </View>
  );
});
AppRow.displayName = 'AppRow';

// ---------------------------------------------------------------------------
// RecentRow — memoised horizontal strip of recently-used apps
// ---------------------------------------------------------------------------

type RecentRowProps = {
  recentApps: AppDetail[];
  iconSize: number;
  screenPaddingH: number;
  onPress: (app: AppDetail) => void;
  onLongPressPosition: (app: AppDetail, pos: { x: number; y: number; width: number; height: number }) => void;
};

const RecentRow = React.memo<RecentRowProps>(({
  recentApps,
  iconSize,
  screenPaddingH,
  onPress,
  onLongPressPosition,
}) => {
  if (recentApps.length === 0) return null;

  return (
    <View style={{ height: RECENT_ROW_HEIGHT }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.recentScroll,
          { paddingHorizontal: screenPaddingH },
        ]}
      >
        {recentApps.map(app => (
          <View key={app.packageName} style={styles.recentCell}>
            <AppIcon
              icon={
                <Image
                  source={{ uri: app.icon }}
                  style={{ width: iconSize, height: iconSize }}
                  resizeMode="contain"
                />
              }
              label={app.label}
              onPress={() => onPress(app)}
              onLongPressPosition={pos => onLongPressPosition(app, pos)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});
RecentRow.displayName = 'RecentRow';


// ---------------------------------------------------------------------------
// SearchIcon — magnifier lens (pure View, no emoji)
// ---------------------------------------------------------------------------
function SearchIcon({ color, size }: { color: string; size: number }) {
  const r = size * 0.38;
  const sw = size * 0.12;
  return (
    <View style={{ width: size, height: size, marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: r * 2, height: r * 2, borderRadius: r,
        borderWidth: sw, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, right: size * 0.05,
        width: sw * 1.2, height: size * 0.3, borderRadius: sw,
        backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// AllAppsScreen — main component
// ---------------------------------------------------------------------------

const AllAppsScreen = React.memo<AllAppsScreenProps>(({
  animValue,
  isOpen,
  onDismiss,
  apps,
  onAddToDock,
}) => {
  const { semantics, activeProfiles } = useWeftConfig();
  const insets = useSafeAreaInsets();

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();
  /** The sheet occupies 94% of screen height. */
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.94;

  const s  = semantics.surface.allApps;
  const ai = semantics.component.appIcon;
  const layout = semantics.layout;

  const isCognitive = activeProfiles.includes('cognitive');
  const columns = isCognitive ? 1 : layout.gridColumns;

  // ── Search ────────────────────────────────────────────────────────────────

  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  // Auto-focus when the drawer opens, blur/clear when it closes.
  useEffect(() => {
    if (isOpen) {
      // Small delay so the sheet animation has started before keyboard appears.
      const timer = setTimeout(() => searchRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    } else {
      searchRef.current?.blur();
      setQuery('');
    }
  }, [isOpen]);

  // ── Recently used ─────────────────────────────────────────────────────────

  const [recentPackageNames, setRecentPackageNames] = useState<string[]>([]);

  // Load recent apps from AsyncStorage on mount.
  useEffect(() => {
    AsyncStorage.getItem(RECENT_APPS_KEY)
      .then(raw => {
        if (raw) setRecentPackageNames(JSON.parse(raw) as string[]);
      })
      .catch(() => {/* ignore */});
  }, []);

  const recentApps = useMemo((): AppDetail[] => {
    return recentPackageNames
      .slice(0, RECENT_DISPLAY)
      .map(pkg => apps.find(a => a.packageName === pkg))
      .filter((a): a is AppDetail => a !== undefined);
  }, [recentPackageNames, apps]);

  const recordRecent = useCallback(async (packageName: string) => {
    setRecentPackageNames(prev => {
      const next = [packageName, ...prev.filter(p => p !== packageName)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_APPS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // ── Section / filtered data ───────────────────────────────────────────────

  const isSearching = query.trim().length > 0;

  const sectionData = useMemo((): ListItem[] => {
    return buildSectionData(apps, columns);
  }, [apps, columns]);

  const filteredData = useMemo((): ListItem[] => {
    if (!isSearching) return sectionData;
    const q = query.trim().toLowerCase();
    const matched = apps.filter(a => a.label.toLowerCase().includes(q));
    return buildFilteredData(matched, columns);
  }, [isSearching, query, apps, columns, sectionData]);

  const letterIndexMap = useMemo(() => buildLetterIndexMap(sectionData), [sectionData]);
  const activeLetters  = useMemo(() => getActiveLetters(sectionData),    [sectionData]);

  // ── FlatList row height ───────────────────────────────────────────────────

  // App icon cell height = container + label + margin
  const ROW_HEIGHT = ai.containerSize + 4 /* margin top of label */ + (ai.labelType.lineHeight ?? 14) + 12 /* row vertical padding */;

  const getItemLayout = useCallback(
    (_: ArrayLike<ListItem> | null | undefined, index: number) => {
      const item = filteredData[index];
      const height = item?.type === 'header' ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;

      // Walk previous items to compute offset.
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += filteredData[i]?.type === 'header' ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;
      }
      return { length: height, offset, index };
    },
    [filteredData, ROW_HEIGHT],
  );

  // ── FlatList ref + alpha index scroll ────────────────────────────────────

  const flatListRef = useRef<FlatList<ListItem>>(null);

  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const scrollToLetter = useCallback((letter: string) => {
    const idx = letterIndexMap.get(letter);
    if (idx !== undefined) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewOffset: 0 });
      setActiveLetter(letter);
    }
  }, [letterIndexMap]);

  // ── Context menu state ────────────────────────────────────────────────────

  const [menuApp, setMenuApp] = useState<AppDetail | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleLongPressPosition = useCallback((app: AppDetail, pos: { x: number; y: number; width: number; height: number }) => {
    setMenuApp(app);
    setMenuAnchor(pos);
  }, []);

  const dismissMenu = useCallback(() => {
    setMenuApp(null);
    setMenuAnchor(null);
  }, []);

  // ── App launch helpers ────────────────────────────────────────────────────

  const launchApp = useCallback((app: AppDetail) => {
    recordRecent(app.packageName);
    RNLauncherKitHelper.launchApplication(app.packageName);
    onDismiss();
  }, [recordRecent, onDismiss]);

  const openAppInfo = useCallback((packageName: string) => {
    Linking.openURL(`android.settings.APPLICATION_DETAILS_SETTINGS:${packageName}`).catch(() => {
      Linking.openSettings();
    });
  }, []);

  const uninstallApp = useCallback((packageName: string) => {
    Linking.openURL(`package:${packageName}`).catch(() => {});
  }, []);

  // ── BackHandler ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, onDismiss]);

  // ── Animation: translateY ─────────────────────────────────────────────────

  const translateY = animValue.interpolate({
    inputRange:  [0, 1],
    // When closed (0) the sheet must translate DOWN by its full height so it
    // sits completely off screen — not just 6%, which left 88% covering Home.
    outputRange: [SHEET_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  // ── Glass blur (lazy require, same pattern as ControlCenterScreen) ────────

  const glassContainer = semantics.component.glassContainer;
  let BlurView: React.ComponentType<{ blurType: string; blurAmount: number; style: object }> | null = null;
  if (glassContainer !== null) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      BlurView = require('@react-native-community/blur').BlurView;
    } catch {
      BlurView = null;
    }
  }


  // ── renderItem ────────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={{ height: SECTION_HEADER_HEIGHT, justifyContent: 'center' }}>
          <SectionHeader label={item.letter} />
        </View>
      );
    }
    return (
      <AppRow
        apps={item.apps}
        columns={columns}
        iconSize={ai.containerSize}
        gridGap={layout.gridGap}
        screenPaddingH={layout.screenPaddingH}
        screenWidth={SCREEN_WIDTH}
        cognitiveMode={isCognitive}
        onPress={launchApp}
        onLongPressPosition={handleLongPressPosition}
      />
    );
  }, [columns, ai.containerSize, layout.gridGap, layout.screenPaddingH, SCREEN_WIDTH, isCognitive, launchApp, handleLongPressPosition]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: SHEET_HEIGHT,
          backgroundColor: s.background,
          // Bottom inset so content isn't cut off by nav bar.
          paddingBottom: insets.bottom,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {/* Glass blur layer — behind everything else on the sheet */}
      {glassContainer !== null && BlurView !== null && (
        <BlurView
          blurType="dark"
          blurAmount={glassContainer.blurRadius}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ── Handle + header ────────────────────────────────────────────── */}
      <View style={[styles.handleArea, { height: HANDLE_AREA_HEIGHT }]}>
        <View style={[styles.handle, { backgroundColor: s.handleColor }]} />
      </View>
      <View style={[styles.sheetHeader, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text style={[styles.sheetTitle, { color: s.searchBarText }]}>All Apps</Text>
        <Text style={[styles.appCount, { color: s.searchBarPlaceholder }]}>
          {apps.length} apps
        </Text>
      </View>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.searchContainer,
          {
            height: SEARCH_BAR_HEIGHT,
            paddingHorizontal: layout.screenPaddingH,
          },
        ]}
      >
        <View
          style={[
            styles.searchInner,
            {
              backgroundColor: s.searchBarBackground,
              borderColor: s.searchBarBorder,
              flex: 1,
            },
          ]}
        >
          <SearchIcon color={s.searchBarPlaceholder} size={16} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search apps…"
            placeholderTextColor={s.searchBarPlaceholder}
            style={[
              styles.searchInput,
              { color: s.searchBarText },
            ]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessible
            accessibilityLabel="Search apps"
            accessibilityRole="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              accessible
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.clearIconView}>
                <View style={[styles.clearBar, { backgroundColor: s.searchBarPlaceholder, transform: [{ rotate: '45deg' }] }]} />
                <View style={[styles.clearBar, { backgroundColor: s.searchBarPlaceholder, transform: [{ rotate: '-45deg' }], position: 'absolute' }]} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Body: FlatList + alpha index ───────────────────────────────── */}
      <View style={styles.body}>
        {/* Recently-used row — shown only when not searching */}
        {!isSearching && recentApps.length > 0 && (
          <>
            <SectionHeader label="Recent" />
            <RecentRow
              recentApps={recentApps}
              iconSize={ai.containerSize}
              screenPaddingH={layout.screenPaddingH}
              onPress={launchApp}
              onLongPressPosition={handleLongPressPosition}
            />
          </>
        )}

        <FlatList<ListItem>
          ref={flatListRef}
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.flatList}
          contentContainerStyle={{ paddingBottom: 16 }}
        />

        {/* Alpha index bar — hidden while searching */}
        {!isSearching && (
          <View style={[styles.indexBar, { top: insets.top }]}>
            {ALPHA_LETTERS.map(letter => {
              const hasData = activeLetters.has(letter);
              const isActive = letter === activeLetter;
              return (
                <TouchableOpacity
                  key={letter}
                  onPress={() => hasData && scrollToLetter(letter)}
                  style={[styles.indexLetter, { height: INDEX_LETTER_HEIGHT }]}
                  accessible
                  accessibilityLabel={letter === '#' ? 'Other' : letter}
                  accessibilityRole="button"
                  activeOpacity={hasData ? 0.6 : 1}
                >
                  <Text
                    style={[
                      styles.indexLetterText,
                      {
                        color: isActive
                          ? semantics.accent.primary
                          : hasData
                            ? s.indexBarText
                            : s.indexBarActiveText + '40', // dim letters with no apps
                        fontWeight: isActive ? '700' : '400',
                      },
                    ]}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── App context menu (absolute overlay inside the sheet) ────────── */}
      {menuApp !== null && (
        <AppContextMenu
          visible={menuApp !== null}
          packageName={menuApp.packageName}
          appLabel={menuApp.label}
          isSystemApp={false}
          anchorPosition={menuAnchor}
          onDismiss={dismissMenu}
          onOpen={() => launchApp(menuApp)}
          onAppInfo={() => openAppInfo(menuApp.packageName)}
          onUninstall={() => uninstallApp(menuApp.packageName)}
          onAddToDock={() => {
            onAddToDock?.(menuApp);
            dismissMenu();
          }}
          onRemoveFromHome={() => {
            // App drawer shows all apps — "Remove from Home" is not applicable here.
            // The pin state is managed from the home grid's own context menu.
            dismissMenu();
          }}
        />
      )}
    </Animated.View>
  );
});

AllAppsScreen.displayName = 'AllAppsScreen';


// ---------------------------------------------------------------------------
// Styles — structural / layout only; no colours, radii, or visual tokens
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // ── Sheet container ──────────────────────────────────────────────────────
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // ── Handle ───────────────────────────────────────────────────────────────
  handleArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },

  // ── Search bar ───────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    height: 40,
  },
  clearIcon: {
    fontSize: 14,
    marginLeft: 8,
    paddingHorizontal: 4,
  },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    position: 'relative',
  },
  flatList: {
    flex: 1,
  },

  // ── App rows ─────────────────────────────────────────────────────────────
  rowContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingVertical: 6,
  },
  cognitiveCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },

  // ── Recently used ─────────────────────────────────────────────────────────
  recentScroll: {
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 8,
  },
  recentCell: {
    alignItems: 'center',
  },

  // ── Alpha index bar ──────────────────────────────────────────────────────
  indexBar: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  indexLetter: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexLetterText: {
    fontSize: 10,
    lineHeight: INDEX_LETTER_HEIGHT,
    textAlign: 'center',
  },

  // ── Sheet header ─────────────────────────────────────────────────────────
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  appCount: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Clear icon (X) ───────────────────────────────────────────────────────
  clearIconView: {
    width: 16, height: 16,
    marginLeft: 8, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  clearBar: {
    width: 12, height: 2, borderRadius: 1,
  },
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export { AllAppsScreen };
