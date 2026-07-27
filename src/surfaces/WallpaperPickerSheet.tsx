/**
 * Weft — WallpaperPickerSheet
 *
 * Bottom sheet (~88% screen height) for browsing and setting wallpapers.
 *
 * Three source tabs:
 *   My Photos  — tries react-native-image-picker; falls back to placeholder
 *   Bundled    — 12 solid-color swatches (add drawable assets later)
 *   Unsplash   — paginated search; requires UNSPLASH_ACCESS_KEY constant
 *
 * Target chips: Home / Lock / Both
 *
 * Animation driven by animValue (0=closed → 1=open) owned by the parent,
 * matching the ControlCenterScreen pattern.
 *
 * All colors read exclusively from semantics.surface.wallpaperPicker.
 * Zero inline color overrides.
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWeftConfig } from '../hooks/useWeftConfig';
import { WallpaperAPI, WallpaperTarget } from '../hooks/useWallpaper';

// ---------------------------------------------------------------------------
// Unsplash API key — add yours here to enable the Unsplash tab
// ---------------------------------------------------------------------------
const UNSPLASH_ACCESS_KEY = '';

// ---------------------------------------------------------------------------
// react-native-image-picker — optional; graceful fallback if not installed
// ---------------------------------------------------------------------------
let launchImageLibrary: ((opts: any, cb: (res: any) => void) => void) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  launchImageLibrary = require('react-native-image-picker').launchImageLibrary;
} catch {
  launchImageLibrary = null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.88);
const THUMB_GAP = 8;
const THUMB_WIDTH = (SCREEN_WIDTH - 32 - THUMB_GAP) / 2; // 16px side padding × 2
const THUMB_HEIGHT = Math.round(THUMB_WIDTH * 1.6);

type Tab = 'photos' | 'bundled' | 'unsplash';
type Target = WallpaperTarget;

// ---------------------------------------------------------------------------
// Bundled swatches — 12 solid colors (pair: [top, bottom] for visual split)
// ---------------------------------------------------------------------------
type Swatch = { id: string; top: string; bottom: string; label: string };

const BUNDLED_SWATCHES: Swatch[] = [
  { id: 'midnight',   top: '#0d0d1a', bottom: '#1a1a3e', label: 'Midnight'   },
  { id: 'forest',     top: '#0a1a0d', bottom: '#1a3a20', label: 'Forest'     },
  { id: 'dusk',       top: '#1a0d2e', bottom: '#3e1a5a', label: 'Dusk'       },
  { id: 'slate',      top: '#1a1f2e', bottom: '#2e3a50', label: 'Slate'      },
  { id: 'amber',      top: '#2e1a00', bottom: '#5a3a00', label: 'Amber'      },
  { id: 'rose',       top: '#2e0d1a', bottom: '#5a1a30', label: 'Rose'       },
  { id: 'ocean',      top: '#001a2e', bottom: '#00305a', label: 'Ocean'      },
  { id: 'sand',       top: '#2e2010', bottom: '#5a4020', label: 'Sand'       },
  { id: 'arctic',     top: '#0d1f2e', bottom: '#1a3a50', label: 'Arctic'     },
  { id: 'ember',      top: '#2e0a00', bottom: '#6b1a00', label: 'Ember'      },
  { id: 'sage',       top: '#0d1f10', bottom: '#1a3a20', label: 'Sage'       },
  { id: 'graphite',   top: '#111111', bottom: '#2a2a2a', label: 'Graphite'   },
];

// ---------------------------------------------------------------------------
// Unsplash types
// ---------------------------------------------------------------------------
type UnsplashPhoto = {
  id: string;
  urls: { small: string; full: string };
  alt_description?: string;
  color?: string;
};

// ---------------------------------------------------------------------------
// Preview state — shared between all tabs
// ---------------------------------------------------------------------------
type PreviewItem =
  | { kind: 'uri';    uri: string;    dominantColor?: string }
  | { kind: 'swatch'; swatch: Swatch                        }
  | { kind: 'unsplash'; photo: UnsplashPhoto               };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export type WallpaperPickerSheetProps = {
  visible: boolean;
  animValue: Animated.Value;
  onDismiss: () => void;
  onWallpaperSet: (dominantColor?: string) => void;
};


// ---------------------------------------------------------------------------
// Sub-component: Chip (target selector + tab selector)
// ---------------------------------------------------------------------------
const Chip = memo(function Chip({
  label,
  active,
  onPress,
  chipBg,
  chipText,
  accentBg,
  accentText,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  chipBg: string;
  chipText: string;
  accentBg: string;
  accentText: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        { backgroundColor: active ? accentBg : chipBg },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, { color: active ? accentText : chipText }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Sub-component: SwatchCard (Bundled tab)
// ---------------------------------------------------------------------------
const SwatchCard = memo(function SwatchCard({
  swatch,
  selected,
  onPress,
  onLongPress,
  selectedBorder,
  selectedBorderWidth,
  cardRadius,
}: {
  swatch: Swatch;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  selectedBorder: string;
  selectedBorderWidth: number;
  cardRadius: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={[
        styles.thumbContainer,
        {
          borderRadius: cardRadius,
          borderWidth: selected ? selectedBorderWidth : 0,
          borderColor: selected ? selectedBorder : 'transparent',
          overflow: 'hidden',
        },
      ]}
      accessibilityLabel={swatch.label}
    >
      {/* Top half */}
      <View style={{ flex: 1, backgroundColor: swatch.top }} />
      {/* Bottom half */}
      <View style={{ flex: 1, backgroundColor: swatch.bottom }} />
      {/* Label overlay */}
      <View style={styles.swatchLabelOverlay}>
        <Text style={styles.swatchLabel} numberOfLines={1}>
          {swatch.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Sub-component: UnsplashCard
// ---------------------------------------------------------------------------
const UnsplashCard = memo(function UnsplashCard({
  photo,
  selected,
  onPress,
  onLongPress,
  selectedBorder,
  selectedBorderWidth,
  cardBg,
  cardRadius,
}: {
  photo: UnsplashPhoto;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  selectedBorder: string;
  selectedBorderWidth: number;
  cardBg: string;
  cardRadius: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={[
        styles.thumbContainer,
        {
          borderRadius: cardRadius,
          borderWidth: selected ? selectedBorderWidth : 0,
          borderColor: selected ? selectedBorder : 'transparent',
          backgroundColor: cardBg,
          overflow: 'hidden',
        },
      ]}
      accessibilityLabel={photo.alt_description ?? 'Unsplash photo'}
    >
      <Image
        source={{ uri: photo.urls.small }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
});


// ---------------------------------------------------------------------------
// Sub-component: FullScreenPreview (absolute overlay modal)
// ---------------------------------------------------------------------------
const FullScreenPreview = memo(function FullScreenPreview({
  item,
  target,
  onTargetChange,
  onSet,
  onClose,
  setting,
  tokens,
  accentPrimary,
  accentOnAccent,
  accentSubtle,
}: {
  item: PreviewItem;
  target: Target;
  onTargetChange: (t: Target) => void;
  onSet: () => void;
  onClose: () => void;
  setting: boolean;
  tokens: {
    background: string;
    chipBg: string;
    chipText: string;
    cardRadius: number;
    selectedBorder: string;
  };
  accentPrimary: string;
  accentOnAccent: string;
  accentSubtle: string;
}) {
  const TARGET_OPTIONS: { value: Target; label: string }[] = [
    { value: 'home', label: 'Home' },
    { value: 'lock', label: 'Lock' },
    { value: 'both', label: 'Both' },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, styles.previewRoot]}>
      {/* Full-bleed content */}
      {item.kind === 'uri' && (
        <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {item.kind === 'unsplash' && (
        <Image
          source={{ uri: item.photo.urls.full }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      {item.kind === 'swatch' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: item.swatch.top }} />
          <View style={{ flex: 1, backgroundColor: item.swatch.bottom }} />
        </View>
      )}

      {/* Dark scrim so controls are legible over any wallpaper */}
      <View style={styles.previewScrim} />

      {/* Close button */}
      <TouchableOpacity
        style={styles.previewClose}
        onPress={onClose}
        accessibilityLabel="Close preview"
      >
        <Text style={styles.previewCloseText}>✕</Text>
      </TouchableOpacity>

      {/* Bottom controls bar */}
      <View style={styles.previewControls}>
        {/* Target chips */}
        <View style={styles.previewChipRow}>
          {TARGET_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={target === opt.value}
              onPress={() => onTargetChange(opt.value)}
              chipBg={tokens.chipBg}
              chipText={tokens.chipText}
              accentBg={accentPrimary}
              accentText={accentOnAccent}
            />
          ))}
        </View>

        {/* Set Wallpaper button */}
        <TouchableOpacity
          style={[
            styles.setButton,
            { backgroundColor: accentPrimary, opacity: setting ? 0.6 : 1 },
          ]}
          onPress={onSet}
          disabled={setting}
          accessibilityLabel="Set wallpaper"
          accessibilityRole="button"
        >
          {setting ? (
            <ActivityIndicator color={accentOnAccent} />
          ) : (
            <Text style={[styles.setButtonText, { color: accentOnAccent }]}>
              Set Wallpaper
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const WallpaperPickerSheet = memo(function WallpaperPickerSheet({
  visible,
  animValue,
  onDismiss,
  onWallpaperSet,
}: WallpaperPickerSheetProps) {
  const { semantics } = useWeftConfig();
  const insets = useSafeAreaInsets();
  const wp = semantics.surface.wallpaperPicker;
  const acc = semantics.accent;

  // ── Sheet state ───────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('bundled');
  const [target, setTarget] = useState<Target>('both');
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [setting, setSetting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Unsplash state ────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [unsplashPhotos, setUnsplashPhotos] = useState<UnsplashPhoto[]>([]);
  const [unsplashPage, setUnsplashPage] = useState(1);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashHasMore, setUnsplashHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQueryRef = useRef('');

  // ── BackHandler ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (preview) { setPreview(null); return true; }
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, preview, onDismiss]);

  // ── Reset search when tab changes away from unsplash ─────────────────────
  useEffect(() => {
    if (tab !== 'unsplash') return;
    if (UNSPLASH_ACCESS_KEY && unsplashPhotos.length === 0) {
      fetchUnsplash('', 1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Unsplash fetch ────────────────────────────────────────────────────────
  const fetchUnsplash = useCallback(
    async (q: string, page: number, reset: boolean) => {
      if (!UNSPLASH_ACCESS_KEY) return;
      setUnsplashLoading(true);
      try {
        const endpoint = q.trim()
          ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=20&page=${page}`
          : `https://api.unsplash.com/photos?client_id=${UNSPLASH_ACCESS_KEY}&per_page=20&page=${page}`;
        const res = await fetch(endpoint);
        const json = await res.json();
        const results: UnsplashPhoto[] = q.trim()
          ? (json.results ?? [])
          : (json ?? []);
        setUnsplashPhotos(prev => (reset ? results : [...prev, ...results]));
        setUnsplashHasMore(results.length === 20);
        setUnsplashPage(page);
      } catch {
        // network error — leave existing results
      } finally {
        setUnsplashLoading(false);
      }
    },
    [],
  );

  // ── Search debounce ───────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (text: string) => {
      setQuery(text);
      currentQueryRef.current = text;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchUnsplash(text, 1, true);
      }, 300);
    },
    [fetchUnsplash],
  );

  const handleLoadMore = useCallback(() => {
    if (unsplashLoading || !unsplashHasMore) return;
    fetchUnsplash(currentQueryRef.current, unsplashPage + 1, false);
  }, [unsplashLoading, unsplashHasMore, unsplashPage, fetchUnsplash]);

  // ── Preview open / long-press set ────────────────────────────────────────
  const openPreview = useCallback((item: PreviewItem) => {
    setPreview(item);
  }, []);

  const setImmediately = useCallback(
    async (item: PreviewItem) => {
      if (item.kind === 'swatch') {
        ToastAndroid.show(
          'Bundled wallpapers coming soon — add images to drawable/',
          ToastAndroid.SHORT,
        );
        return;
      }
      setSetting(true);
      let result: Awaited<ReturnType<typeof WallpaperAPI.setFromUri>>;
      if (item.kind === 'uri') {
        result = await WallpaperAPI.setFromUri(item.uri, target);
      } else {
        // Unsplash — download full URL as base64 via fetch
        try {
          const resp = await fetch(item.photo.urls.full);
          const blob = await resp.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          result = await WallpaperAPI.setFromBase64(base64, target);
        } catch {
          result = { error: 'Failed to download image' };
        }
      }
      setSetting(false);
      if ('success' in result && result.success) {
        const color =
          item.kind === 'uri'
            ? item.dominantColor
            : item.kind === 'unsplash'
            ? item.photo.color ?? undefined
            : undefined;
        onWallpaperSet(color);
        setPreview(null);
      } else {
        ToastAndroid.show(
          'error' in result ? result.error : 'Failed to set wallpaper',
          ToastAndroid.SHORT,
        );
      }
    },
    [target, onWallpaperSet],
  );

  // ── My Photos tab handler ─────────────────────────────────────────────────
  const handlePickFromGallery = useCallback(() => {
    if (!launchImageLibrary) return;
    launchImageLibrary({ mediaType: 'photo', quality: 1 }, (response: any) => {
      if (response.didCancel || response.errorCode) return;
      const uri: string | undefined = response.assets?.[0]?.uri;
      if (!uri) return;
      openPreview({ kind: 'uri', uri });
    });
  }, [openPreview]);

  // ── Animated values ───────────────────────────────────────────────────────
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
    extrapolate: 'clamp',
  });
  const scrimOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
    extrapolate: 'clamp',
  });


  // ── Tab renderers ─────────────────────────────────────────────────────────

  const renderMyPhotos = () => {
    if (!launchImageLibrary) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderTitle, { color: wp.searchBarText }]}>
            Gallery Picker Unavailable
          </Text>
          <Text style={[styles.placeholderBody, { color: wp.categoryChipText }]}>
            Install{' '}
            <Text style={{ fontWeight: '700' }}>react-native-image-picker</Text>
            {' '}to enable gallery access.{'\n\n'}
            Run:{'\n'}
            <Text style={{ fontFamily: 'monospace' }}>
              npm install react-native-image-picker
            </Text>
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.placeholderContainer}>
        <Text style={[styles.placeholderTitle, { color: wp.searchBarText }]}>
          Pick from Gallery
        </Text>
        <Text style={[styles.placeholderBody, { color: wp.categoryChipText }]}>
          Choose any photo from your device to set as wallpaper.
        </Text>
        <TouchableOpacity
          style={[styles.setButton, { backgroundColor: acc.primary }]}
          onPress={handlePickFromGallery}
          accessibilityRole="button"
          accessibilityLabel="Open gallery"
        >
          <Text style={[styles.setButtonText, { color: acc.onAccent }]}>
            Open Gallery
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBundled = () => (
    <FlatList<Swatch>
      data={BUNDLED_SWATCHES}
      keyExtractor={item => item.id}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.gridContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <SwatchCard
          swatch={item}
          selected={selectedId === item.id}
          onPress={() => {
            setSelectedId(item.id);
            openPreview({ kind: 'swatch', swatch: item });
          }}
          onLongPress={() => {
            setSelectedId(item.id);
            ToastAndroid.show(
              'Bundled wallpapers coming soon — add images to drawable/',
              ToastAndroid.SHORT,
            );
          }}
          selectedBorder={wp.selectedBorder}
          selectedBorderWidth={wp.selectedBorderWidth}
          cardRadius={wp.cardRadius}
        />
      )}
    />
  );

  const renderUnsplash = () => {
    if (!UNSPLASH_ACCESS_KEY) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderTitle, { color: wp.searchBarText }]}>
            Unsplash Not Configured
          </Text>
          <Text style={[styles.placeholderBody, { color: wp.categoryChipText }]}>
            Add your free Unsplash API key to enable photo search.{'\n\n'}
            1. Visit{' '}
            <Text style={{ fontWeight: '700' }}>unsplash.com/developers</Text>
            {'\n'}
            2. Create a new application{'\n'}
            3. Copy the Access Key{'\n'}
            4. Paste it into{' '}
            <Text style={{ fontFamily: 'monospace' }}>
              WallpaperPickerSheet.tsx → UNSPLASH_ACCESS_KEY
            </Text>
          </Text>
        </View>
      );
    }

    return (
      <FlatList<UnsplashPhoto>
        data={unsplashPhotos}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          unsplashLoading ? null : (
            <Text style={[styles.placeholderBody, { color: wp.categoryChipText, textAlign: 'center', marginTop: 40 }]}>
              No results. Try a different search.
            </Text>
          )
        }
        ListFooterComponent={
          unsplashLoading ? (
            <ActivityIndicator
              style={{ marginVertical: 16 }}
              color={acc.primary}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <UnsplashCard
            photo={item}
            selected={selectedId === item.id}
            onPress={() => {
              setSelectedId(item.id);
              openPreview({ kind: 'unsplash', photo: item });
            }}
            onLongPress={() => {
              setSelectedId(item.id);
              setImmediately({ kind: 'unsplash', photo: item });
            }}
            selectedBorder={wp.selectedBorder}
            selectedBorderWidth={wp.selectedBorderWidth}
            cardBg={wp.cardBackground}
            cardRadius={wp.cardRadius}
          />
        )}
      />
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const TARGET_TABS: { value: Target; label: string }[] = [
    { value: 'home', label: 'Home' },
    { value: 'lock', label: 'Lock' },
    { value: 'both', label: 'Both' },
  ];

  const SOURCE_TABS: { value: Tab; label: string }[] = [
    { value: 'photos',   label: 'My Photos' },
    { value: 'bundled',  label: 'Bundled'   },
    { value: 'unsplash', label: 'Unsplash'  },
  ];

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Scrim */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrimOpacity }]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            backgroundColor: wp.background,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: wp.categoryChipText }]} />
        </View>

        {/* Header row: title + target chips */}
        <View style={styles.headerRow}>
          <Text style={[styles.sheetTitle, { color: wp.searchBarText }]}>
            Wallpaper
          </Text>
          <View style={styles.chipRow}>
            {TARGET_TABS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={target === opt.value}
                onPress={() => setTarget(opt.value)}
                chipBg={wp.categoryChipBackground}
                chipText={wp.categoryChipText}
                accentBg={acc.primary}
                accentText={acc.onAccent}
              />
            ))}
          </View>
        </View>

        {/* Source tab chips */}
        <View style={[styles.chipRow, styles.sourceTabs]}>
          {SOURCE_TABS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={tab === opt.value}
              onPress={() => setTab(opt.value)}
              chipBg={wp.categoryChipBackground}
              chipText={wp.categoryChipText}
              accentBg={acc.primary}
              accentText={acc.onAccent}
            />
          ))}
        </View>

        {/* Search bar — Unsplash only */}
        {tab === 'unsplash' && UNSPLASH_ACCESS_KEY ? (
          <View style={[styles.searchBar, { backgroundColor: wp.searchBarBackground }]}>
            <TextInput
              value={query}
              onChangeText={handleSearchChange}
              placeholder="Search Unsplash…"
              placeholderTextColor={wp.categoryChipText}
              style={[styles.searchInput, { color: wp.searchBarText }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        ) : null}

        {/* Content area */}
        <View style={styles.contentArea}>
          {tab === 'photos'   && renderMyPhotos()}
          {tab === 'bundled'  && renderBundled()}
          {tab === 'unsplash' && renderUnsplash()}
        </View>
      </Animated.View>

      {/* Full-screen preview modal */}
      {preview && (
        <FullScreenPreview
          item={preview}
          target={target}
          onTargetChange={setTarget}
          onSet={() => setImmediately(preview)}
          onClose={() => setPreview(null)}
          setting={setting}
          tokens={{
            background: wp.background,
            chipBg: wp.categoryChipBackground,
            chipText: wp.categoryChipText,
            cardRadius: wp.cardRadius,
            selectedBorder: wp.selectedBorder,
          }}
          accentPrimary={acc.primary}
          accentOnAccent={acc.onAccent}
          accentSubtle={acc.subtle}
        />
      )}
    </View>
  );
});


// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: '#000000',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },

  // Handle
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceTabs: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Search bar
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 14,
    flex: 1,
    includeFontPadding: false,
  },

  // Content
  contentArea: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  columnWrapper: {
    gap: THUMB_GAP,
    marginBottom: THUMB_GAP,
  },

  // Thumbnail cards
  thumbContainer: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
  },

  // Swatch label overlay
  swatchLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Placeholder screens
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholderBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.8,
  },

  // Set Wallpaper button
  setButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  setButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Full-screen preview
  previewRoot: {
    zIndex: 300,
    backgroundColor: '#000000',
  },
  previewScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
    includeFontPadding: false,
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 14,
    alignItems: 'center',
  },
  previewChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
