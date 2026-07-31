/**
 * Weft — WallpaperPickerSheet (v2)
 *
 * Fixed in this version:
 *  - Bundled swatches: solid-color gradients are set directly via a generated
 *    bitmap (no drawable asset needed) using the WallpaperSet native module
 *  - Gallery picker: calls WallpaperAPI.pickFromGallery() correctly
 *  - Unsplash: tapping a card goes straight to full-screen preview + set;
 *    the set button shows a real download + apply spinner
 *  - Skeleton loader while Unsplash images are fetching
 *  - Download progress overlay on the set button
 *  - All emoji replaced with geometric vector icons
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWeftConfig } from '../hooks/useWeftConfig';
import { WallpaperAPI, type WallpaperTarget } from '../hooks/useWallpaper';

// ---------------------------------------------------------------------------
// Pure-JS base64 encoder (no btoa, no Buffer — both unavailable in Hermes)
// ---------------------------------------------------------------------------
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return result;
}

import { UNSPLASH_ACCESS_KEY } from '@env';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const THUMB_GAP = 8;

type Tab    = 'photos' | 'bundled' | 'unsplash';
type Target = WallpaperTarget;

// ---------------------------------------------------------------------------
// Bundled swatches — set as solid color via WallpaperSet native module
// ---------------------------------------------------------------------------
type Swatch = { id: string; top: string; bottom: string; label: string };

const BUNDLED_SWATCHES: Swatch[] = [
  { id: 'midnight',  top: '#0d0d1a', bottom: '#1a1a3e', label: 'Midnight'  },
  { id: 'forest',    top: '#0a1a0d', bottom: '#1a3a20', label: 'Forest'    },
  { id: 'dusk',      top: '#1a0d2e', bottom: '#3e1a5a', label: 'Dusk'      },
  { id: 'slate',     top: '#1a1f2e', bottom: '#2e3a50', label: 'Slate'     },
  { id: 'amber',     top: '#2e1a00', bottom: '#5a3a00', label: 'Amber'     },
  { id: 'rose',      top: '#2e0d1a', bottom: '#5a1a30', label: 'Rose'      },
  { id: 'ocean',     top: '#001a2e', bottom: '#00305a', label: 'Ocean'     },
  { id: 'sand',      top: '#2e2010', bottom: '#5a4020', label: 'Sand'      },
  { id: 'arctic',    top: '#0d1f2e', bottom: '#1a3a50', label: 'Arctic'    },
  { id: 'ember',     top: '#2e0a00', bottom: '#6b1a00', label: 'Ember'     },
  { id: 'sage',      top: '#0d1f10', bottom: '#1a3a20', label: 'Sage'      },
  { id: 'graphite',  top: '#111111', bottom: '#2a2a2a', label: 'Graphite'  },
];

// ---------------------------------------------------------------------------
// Unsplash types
// ---------------------------------------------------------------------------
type UnsplashPhoto = {
  id: string;
  urls: { small: string; full: string; regular: string };
  alt_description?: string;
  color?: string;
};

// ---------------------------------------------------------------------------
// Preview state
// ---------------------------------------------------------------------------
type PreviewItem =
  | { kind: 'uri';      uri: string;           dominantColor?: string }
  | { kind: 'swatch';   swatch: Swatch                                }
  | { kind: 'unsplash'; photo: UnsplashPhoto                          };

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
// SkeletonCard — pulsing placeholder for loading state
// ---------------------------------------------------------------------------
const SkeletonCard = memo(function SkeletonCard({
  width, height, radius,
}: { width: number; height: number; radius: number }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={{
      width, height, borderRadius: radius,
      backgroundColor: 'rgba(128,128,128,0.18)',
      opacity: pulse,
    }} />
  );
});


// ---------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------
const Chip = memo(function Chip({
  label, active, onPress, chipBg, chipText, accentBg, accentText,
}: {
  label: string; active: boolean; onPress: () => void;
  chipBg: string; chipText: string; accentBg: string; accentText: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.chip, { backgroundColor: active ? accentBg : chipBg }]}
      accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, { color: active ? accentText : chipText }]}>{label}</Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// SwatchCard
// ---------------------------------------------------------------------------
const SwatchCard = memo(function SwatchCard({
  swatch, selected, onPress, selectedBorder, selectedBorderWidth, cardRadius, thumbWidth, thumbHeight,
}: {
  swatch: Swatch; selected: boolean; onPress: () => void;
  selectedBorder: string; selectedBorderWidth: number;
  cardRadius: number; thumbWidth: number; thumbHeight: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[{
        width: thumbWidth, height: thumbHeight, borderRadius: cardRadius, overflow: 'hidden',
        borderWidth: selected ? selectedBorderWidth : 0,
        borderColor: selected ? selectedBorder : 'transparent',
      }]}
      accessibilityLabel={swatch.label}>
      <View style={{ flex: 1, backgroundColor: swatch.top }} />
      <View style={{ flex: 1, backgroundColor: swatch.bottom }} />
      <View style={styles.swatchLabelOverlay}>
        <Text style={styles.swatchLabel} numberOfLines={1}>{swatch.label}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// UnsplashCard — shows skeleton while image loads
// ---------------------------------------------------------------------------
const UnsplashCard = memo(function UnsplashCard({
  photo, selected, onPress, selectedBorder, selectedBorderWidth,
  cardBg, cardRadius, thumbWidth, thumbHeight,
}: {
  photo: UnsplashPhoto; selected: boolean; onPress: () => void;
  selectedBorder: string; selectedBorderWidth: number;
  cardBg: string; cardRadius: number; thumbWidth: number; thumbHeight: number;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={[{
        width: thumbWidth, height: thumbHeight, borderRadius: cardRadius, overflow: 'hidden',
        backgroundColor: cardBg,
        borderWidth: selected ? selectedBorderWidth : 0,
        borderColor: selected ? selectedBorder : 'transparent',
      }]}
      accessibilityLabel={photo.alt_description ?? 'Unsplash photo'}>
      {!loaded && (
        <View style={StyleSheet.absoluteFill}>
          <SkeletonCard width={thumbWidth} height={thumbHeight} radius={cardRadius} />
        </View>
      )}
      <Image
        source={{ uri: photo.urls.small }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
      />
    </TouchableOpacity>
  );
});


// ---------------------------------------------------------------------------
// FullScreenPreview
// ---------------------------------------------------------------------------
const FullScreenPreview = memo(function FullScreenPreview({
  item, target, onTargetChange, onSet, onClose, setting, tokens, accentPrimary, accentOnAccent,
}: {
  item: PreviewItem; target: Target; onTargetChange: (t: Target) => void;
  onSet: () => void; onClose: () => void; setting: boolean;
  tokens: { chipBg: string; chipText: string; cardRadius: number };
  accentPrimary: string; accentOnAccent: string;
}) {
  const TARGET_OPTIONS: { value: Target; label: string }[] = [
    { value: 'home', label: 'Home' },
    { value: 'lock', label: 'Lock' },
    { value: 'both', label: 'Both' },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, styles.previewRoot]}>
      {/* Content */}
      {item.kind === 'uri' && (
        <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {item.kind === 'unsplash' && (
        <>
          {/* Show regular (medium) first for speed, then upgrade to full */}
          <Image source={{ uri: item.photo.urls.regular }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </>
      )}
      {item.kind === 'swatch' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: item.swatch.top }} />
          <View style={{ flex: 1, backgroundColor: item.swatch.bottom }} />
        </View>
      )}

      {/* Scrim */}
      <View style={styles.previewScrim} />

      {/* Close — X icon */}
      <TouchableOpacity style={styles.previewClose} onPress={onClose}
        accessibilityLabel="Close preview">
        <View style={styles.closeX}>
          <View style={[styles.closeBar, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.closeBar, { transform: [{ rotate: '-45deg' }], position: 'absolute' }]} />
        </View>
      </TouchableOpacity>

      {/* Bottom controls */}
      <View style={styles.previewControls}>
        <Text style={styles.previewHint}>
          {item.kind === 'swatch' ? item.swatch.label
            : item.kind === 'unsplash' ? (item.photo.alt_description ?? 'Unsplash')
            : 'Photo'}
        </Text>
        <View style={styles.previewChipRow}>
          {TARGET_OPTIONS.map(opt => (
            <Chip key={opt.value} label={opt.label} active={target === opt.value}
              onPress={() => onTargetChange(opt.value)}
              chipBg={tokens.chipBg} chipText={tokens.chipText}
              accentBg={accentPrimary} accentText={accentOnAccent} />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.setButton, { backgroundColor: accentPrimary, opacity: setting ? 0.7 : 1 }]}
          onPress={onSet} disabled={setting}
          accessibilityLabel="Set wallpaper" accessibilityRole="button">
          {setting
            ? <ActivityIndicator color={accentOnAccent} />
            : <Text style={[styles.setButtonText, { color: accentOnAccent }]}>Set Wallpaper</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
});


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const WallpaperPickerSheet = memo(function WallpaperPickerSheet({
  visible, animValue, onDismiss, onWallpaperSet,
}: WallpaperPickerSheetProps) {
  const { semantics } = useWeftConfig();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const SHEET_HEIGHT  = Math.round(SCREEN_HEIGHT * 0.88);
  const THUMB_WIDTH   = (SCREEN_WIDTH - 32 - THUMB_GAP) / 2;
  const THUMB_HEIGHT  = Math.round(THUMB_WIDTH * 1.6);

  const wp  = semantics.surface.wallpaperPicker;
  const acc = semantics.accent;

  // ── Sheet state ───────────────────────────────────────────────────────────
  const [tab,        setTab]        = useState<Tab>('bundled');
  const [target,     setTarget]     = useState<Target>('both');
  const [preview,    setPreview]    = useState<PreviewItem | null>(null);
  const [setting,    setSetting]    = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Unsplash state ────────────────────────────────────────────────────────
  const [query,           setQuery]           = useState('');
  const [unsplashPhotos,  setUnsplashPhotos]  = useState<UnsplashPhoto[]>([]);
  const [unsplashPage,    setUnsplashPage]    = useState(1);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashHasMore, setUnsplashHasMore] = useState(true);
  const [unsplashError,   setUnsplashError]   = useState('');
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQueryRef = useRef('');

  // ── BackHandler ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (preview) { setPreview(null); return true; }
      onDismiss(); return true;
    });
    return () => sub.remove();
  }, [visible, preview, onDismiss]);

  // ── Trigger initial Unsplash load ─────────────────────────────────────────
  useEffect(() => {
    if (tab === 'unsplash' && UNSPLASH_ACCESS_KEY && unsplashPhotos.length === 0) {
      fetchUnsplash('', 1, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Unsplash fetch ────────────────────────────────────────────────────────
  const fetchUnsplash = useCallback(async (q: string, page: number, reset: boolean) => {
    if (!UNSPLASH_ACCESS_KEY) return;
    setUnsplashLoading(true);
    setUnsplashError('');
    try {
      const ep = q.trim()
        ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=20&page=${page}`
        : `https://api.unsplash.com/photos?client_id=${UNSPLASH_ACCESS_KEY}&per_page=20&page=${page}`;
      const res  = await fetch(ep);

      if (!res.ok) {
        const status = res.status;
        if (status === 403 || status === 401) {
          setUnsplashError('API key invalid or revoked. Get a free key at unsplash.com/developers.');
        } else if (status === 429) {
          setUnsplashError('Rate limit reached (50 req/hr). Try again in a few minutes.');
        } else {
          setUnsplashError(`Unsplash error ${status}. Try again shortly.`);
        }
        setUnsplashLoading(false);
        return;
      }

      const json = await res.json();
      const results: UnsplashPhoto[] = q.trim() ? (json.results ?? []) : (json ?? []);
      setUnsplashPhotos(prev => reset ? results : [...prev, ...results]);
      setUnsplashHasMore(results.length === 20);
      setUnsplashPage(page);
    } catch (e) {
      setUnsplashError('Network error. Check your connection.');
    } finally {
      setUnsplashLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);
    currentQueryRef.current = text;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUnsplash(text, 1, true), 350);
  }, [fetchUnsplash]);

  const handleLoadMore = useCallback(() => {
    if (unsplashLoading || !unsplashHasMore) return;
    fetchUnsplash(currentQueryRef.current, unsplashPage + 1, false);
  }, [unsplashLoading, unsplashHasMore, unsplashPage, fetchUnsplash]);

  // ── Set wallpaper ─────────────────────────────────────────────────────────
  const applyWallpaper = useCallback(async (item: PreviewItem) => {
    setSetting(true);
    try {
      let result: Awaited<ReturnType<typeof WallpaperAPI.setFromUri>>;

      if (item.kind === 'uri') {
        result = await WallpaperAPI.setFromUri(item.uri, target);

      } else if (item.kind === 'swatch') {
        // Generate a simple 2-px tall gradient bitmap as base64 and set it
        // Encode swatch as a minimal 1×2 BMP so we can use setFromBase64
        const topHex    = item.swatch.top.replace('#', '');
        const bottomHex = item.swatch.bottom.replace('#', '');
        const tr  = parseInt(topHex.slice(0, 2), 16);
        const tg  = parseInt(topHex.slice(2, 4), 16);
        const tb  = parseInt(topHex.slice(4, 6), 16);
        const br  = parseInt(bottomHex.slice(0, 2), 16);
        const bg2 = parseInt(bottomHex.slice(2, 4), 16);
        const bb  = parseInt(bottomHex.slice(4, 6), 16);
        const bmpBase64 = buildTwoColorBmp(tr, tg, tb, br, bg2, bb);
        result = await WallpaperAPI.setFromBase64(bmpBase64, target);

      } else {
        // Unsplash — download via fetch, convert ArrayBuffer → base64
        // (FileReader is not available in Hermes; arrayBuffer + manual encode is)
        const resp = await fetch(item.photo.urls.regular);
        const arrayBuf = await resp.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        // btoa is not available in Hermes — use pure-JS encoder
        const base64 = uint8ArrayToBase64(bytes);
        result = await WallpaperAPI.setFromBase64(base64, target);
      }

      if ('success' in result && result.success) {
        const color = item.kind === 'unsplash' ? item.photo.color ?? undefined
          : item.kind === 'uri' ? item.dominantColor : item.swatch.top;
        onWallpaperSet(color);
        setPreview(null);
        ToastAndroid.show('Wallpaper set!', ToastAndroid.SHORT);
      } else {
        const msg = 'error' in result ? result.error : 'Failed to set wallpaper';
        ToastAndroid.show(msg, ToastAndroid.LONG);
      }
    } catch (e) {
      ToastAndroid.show('Error: ' + String(e), ToastAndroid.LONG);
    } finally {
      setSetting(false);
    }
  }, [target, onWallpaperSet]);

  // ── Gallery picker ────────────────────────────────────────────────────────
  const handlePickFromGallery = useCallback(async () => {
    try {
      const uri = await WallpaperAPI.pickFromGallery();
      if (uri) setPreview({ kind: 'uri', uri });
    } catch {
      ToastAndroid.show('Could not open gallery', ToastAndroid.SHORT);
    }
  }, []);

  // ── Animated values ───────────────────────────────────────────────────────
  const translateY = animValue.interpolate({
    inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0], extrapolate: 'clamp',
  });
  const scrimOpacity = animValue.interpolate({
    inputRange: [0, 1], outputRange: [0, 0.55], extrapolate: 'clamp',
  });

  const SOURCE_TABS: { value: Tab; label: string }[] = [
    { value: 'photos',   label: 'Gallery'  },
    { value: 'bundled',  label: 'Bundled'  },
    { value: 'unsplash', label: 'Unsplash' },
  ];
  const TARGET_TABS: { value: Target; label: string }[] = [
    { value: 'home', label: 'Home' },
    { value: 'lock', label: 'Lock' },
    { value: 'both', label: 'Both' },
  ];


  // ── Tab renderers ─────────────────────────────────────────────────────────

  const renderMyPhotos = () => (
    <View style={styles.placeholderContainer}>
      <Text style={[styles.placeholderTitle, { color: wp.searchBarText }]}>Pick from Gallery</Text>
      <Text style={[styles.placeholderBody, { color: wp.categoryChipText }]}>
        Choose any photo from your device.
      </Text>
      <TouchableOpacity style={[styles.setButton, { backgroundColor: acc.primary }]}
        onPress={handlePickFromGallery} accessibilityRole="button">
        <Text style={[styles.setButtonText, { color: acc.onAccent }]}>Open Gallery</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBundled = () => (
    <FlatList<Swatch>
      data={BUNDLED_SWATCHES}
      keyExtractor={item => item.id}
      numColumns={2}
      columnWrapperStyle={[styles.columnWrapper, { gap: THUMB_GAP }]}
      contentContainerStyle={styles.gridContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <SwatchCard
          swatch={item}
          selected={selectedId === item.id}
          onPress={() => { setSelectedId(item.id); setPreview({ kind: 'swatch', swatch: item }); }}
          selectedBorder={wp.selectedBorder}
          selectedBorderWidth={wp.selectedBorderWidth}
          cardRadius={wp.cardRadius}
          thumbWidth={THUMB_WIDTH}
          thumbHeight={THUMB_HEIGHT}
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
            Add a free API key from unsplash.com/developers
          </Text>
        </View>
      );
    }

    if (unsplashError) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderTitle, { color: wp.searchBarText }]}>
            Could not load photos
          </Text>
          <Text style={[styles.placeholderBody, { color: wp.categoryChipText }]}>
            {unsplashError}
          </Text>
          <TouchableOpacity
            style={[styles.setButton, { backgroundColor: acc.primary, marginTop: 8 }]}
            onPress={() => { setUnsplashError(''); fetchUnsplash(query, 1, true); }}
            accessibilityRole="button"
          >
            <Text style={[styles.setButtonText, { color: acc.onAccent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList<UnsplashPhoto>
        data={unsplashPhotos}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={[styles.columnWrapper, { gap: THUMB_GAP }]}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          unsplashLoading ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} width={THUMB_WIDTH} height={THUMB_HEIGHT} radius={wp.cardRadius} />
              ))}
            </View>
          ) : (
            <Text style={[styles.placeholderBody, { color: wp.categoryChipText, textAlign: 'center', marginTop: 40 }]}>
              No results. Try a different search.
            </Text>
          )
        }
        ListFooterComponent={
          unsplashLoading && unsplashPhotos.length > 0 ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={acc.primary} />
          ) : null
        }
        renderItem={({ item }) => (
          <UnsplashCard
            photo={item}
            selected={selectedId === item.id}
            onPress={() => { setSelectedId(item.id); setPreview({ kind: 'unsplash', photo: item }); }}
            selectedBorder={wp.selectedBorder}
            selectedBorderWidth={wp.selectedBorderWidth}
            cardBg={wp.cardBackground}
            cardRadius={wp.cardRadius}
            thumbWidth={THUMB_WIDTH}
            thumbHeight={THUMB_HEIGHT}
          />
        )}
      />
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { pointerEvents: visible ? 'auto' : 'none' }]}>
      {/* Scrim */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrimOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, {
        height: SHEET_HEIGHT, backgroundColor: wp.background,
        paddingBottom: insets.bottom + 16, transform: [{ translateY }],
      }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: wp.categoryChipText }]} />
        </View>

        {/* Header: title + target chips */}
        <View style={styles.headerRow}>
          <Text style={[styles.sheetTitle, { color: wp.searchBarText }]}>Wallpaper</Text>
          <View style={styles.chipRow}>
            {TARGET_TABS.map(opt => (
              <Chip key={opt.value} label={opt.label} active={target === opt.value}
                onPress={() => setTarget(opt.value)}
                chipBg={wp.categoryChipBackground} chipText={wp.categoryChipText}
                accentBg={acc.primary} accentText={acc.onAccent} />
            ))}
          </View>
        </View>

        {/* Source tabs */}
        <View style={[styles.chipRow, styles.sourceTabs]}>
          {SOURCE_TABS.map(opt => (
            <Chip key={opt.value} label={opt.label} active={tab === opt.value}
              onPress={() => setTab(opt.value)}
              chipBg={wp.categoryChipBackground} chipText={wp.categoryChipText}
              accentBg={acc.primary} accentText={acc.onAccent} />
          ))}
        </View>

        {/* Search bar — Unsplash only */}
        {tab === 'unsplash' && UNSPLASH_ACCESS_KEY && (
          <View style={[styles.searchBar, { backgroundColor: wp.searchBarBackground }]}>
            <TextInput
              value={query} onChangeText={handleSearchChange}
              placeholder="Search Unsplash…" placeholderTextColor={wp.categoryChipText}
              style={[styles.searchInput, { color: wp.searchBarText }]}
              returnKeyType="search" autoCorrect={false} autoCapitalize="none" />
          </View>
        )}

        {/* Content */}
        <View style={styles.contentArea}>
          {tab === 'photos'   && renderMyPhotos()}
          {tab === 'bundled'  && renderBundled()}
          {tab === 'unsplash' && renderUnsplash()}
        </View>
      </Animated.View>

      {/* Full-screen preview */}
      {preview && (
        <FullScreenPreview
          item={preview}
          target={target}
          onTargetChange={setTarget}
          onSet={() => applyWallpaper(preview)}
          onClose={() => setPreview(null)}
          setting={setting}
          tokens={{
            chipBg: wp.categoryChipBackground,
            chipText: wp.categoryChipText,
            cardRadius: wp.cardRadius,
          }}
          accentPrimary={acc.primary}
          accentOnAccent={acc.onAccent}
        />
      )}
    </View>
  );
});


// ---------------------------------------------------------------------------
// Minimal 2-colour BMP generator (1×2 pixels, 24-bit)
// Returns a base64 string suitable for WallpaperAPI.setFromBase64()
// ---------------------------------------------------------------------------
function buildTwoColorBmp(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): string {
  // BMP stores pixels bottom-to-top, BGR order, rows padded to 4 bytes.
  // 1px wide × 2px tall: each row = 3 bytes + 1 byte padding = 4 bytes.
  // Total data = 8 bytes. File size = 54 (header) + 8 = 62 bytes.
  const buf = new Uint8Array(62);
  // File header
  buf[0]=0x42; buf[1]=0x4D;          // 'BM'
  buf[2]=62;                          // file size (little-endian)
  buf[10]=54;                         // pixel data offset
  // DIB header (BITMAPINFOHEADER, 40 bytes)
  buf[14]=40;                         // header size
  buf[18]=1;                          // width = 1
  buf[22]=2;                          // height = 2 (positive = bottom-to-top)
  buf[26]=1; buf[27]=0;               // colour planes
  buf[28]=24;                         // bits per pixel
  // Pixel data (bottom row first = top color of gradient goes last visually)
  // Row 0 (bottom of file = displayed top): b2,g2,r2 + pad
  buf[54]=b2; buf[55]=g2; buf[56]=r2; buf[57]=0;
  // Row 1 (top of file = displayed bottom): b1,g1,r1 + pad
  buf[58]=b1; buf[59]=g1; buf[60]=r1; buf[61]=0;

  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  // btoa is not available in Hermes — use pure-JS encoder
  return uint8ArrayToBase64(buf);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root:  { zIndex: 200, justifyContent: 'flex-end' },
  scrim: { backgroundColor: '#000000' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2, opacity: 0.4 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceTabs: { paddingHorizontal: 16, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  searchBar: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 10,
    paddingHorizontal: 12, height: 40, justifyContent: 'center',
  },
  searchInput: { fontSize: 14, flex: 1, includeFontPadding: false },
  contentArea: { flex: 1 },
  gridContent: { paddingHorizontal: 16, paddingBottom: 8 },
  columnWrapper: { marginBottom: 8 },
  skeletonGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 8,
  },
  swatchLabelOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  swatchLabel: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  placeholderContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  placeholderTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  placeholderBody: { fontSize: 14, lineHeight: 22, textAlign: 'center', opacity: 0.8 },
  setButton: {
    marginTop: 8, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', minWidth: 200,
  },
  setButtonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  // Full-screen preview
  previewRoot: { zIndex: 300, backgroundColor: '#000000' },
  previewScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewClose: {
    position: 'absolute', top: 52, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  closeBar: {
    position: 'absolute', width: 16, height: 2,
    backgroundColor: '#ffffff', borderRadius: 1,
  },
  previewControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 48, paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 14, alignItems: 'center',
  },
  previewHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13, fontWeight: '500', letterSpacing: 0.2,
  },
  previewChipRow: { flexDirection: 'row', gap: 8 },
});

