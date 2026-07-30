/**
 * Weft — WallpaperBackground
 *
 * Renders the device's actual system wallpaper as the launcher background,
 * making Weft look like it truly owns the phone screen rather than sitting
 * on top of a fake gradient.
 *
 * Rendering strategy (in priority order):
 *   1. Real wallpaper — fetched from WallpaperModule (native Kotlin module)
 *      as a base64 JPEG data URI. Rendered as an ImageBackground filling
 *      the entire screen edge-to-edge.
 *   2. JS fallback — if the native module is unavailable (emulator without
 *      a wallpaper set, permission denied, module not linked) we fall back
 *      to the per-paradigm gradient simulation used before Phase 7.
 *
 * Paradigm overlay:
 *   Regardless of which source the wallpaper comes from, a subtle per-paradigm
 *   tint overlay sits on top of the wallpaper to give each paradigm its
 *   distinct character while still showing the real photo behind it.
 *   - Skeuo:   warm cream tint at 25% opacity — warms and softens the photo
 *   - Glass:   dark blue tint at 35% opacity — deepens for glass contrast
 *   - Minimal: pure black tint at 50% opacity — maximises contrast for flat UI
 *
 * Refresh:
 *   The native cache is invalidated when AppState returns to 'active' so if
 *   the user changes their wallpaper and comes back, Weft picks it up.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Image,
  NativeModules,
  StyleSheet,
  View,
} from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const { WallpaperModule, WeftSystemUI } = NativeModules;

type WallpaperBackgroundProps = {
  screenWidth?: number;
  /**
   * Animated.Value from the horizontal page FlatList scroll position.
   * When provided the wallpaper translates at -scrollX * 0.15 for a subtle
   * parallax depth effect.
   */
  scrollX?: Animated.Value;
};

// ---------------------------------------------------------------------------
// Per-paradigm tint overlay + JS fallback background
// ---------------------------------------------------------------------------

type ParadigmStyle = {
  /** Color of the tint overlay on top of the real wallpaper. */
  tint: string;
  /** JS fallback base color (used when real wallpaper unavailable). */
  base: string;
  /** JS fallback highlight circle color. */
  highlight: string;
  highlightOpacity: number;
  /** Nav bar should use light icons (white)? */
  lightNavIcons: boolean;
  /** Status bar light icons? */
  lightStatusIcons: boolean;
};

const PARADIGM_STYLES: Record<'glass' | 'skeuo' | 'minimal', ParadigmStyle> = {
  glass: {
    // Deep blue-black base so the wallpaper photo reads as a dark cinematic
    // backdrop. The liquid glass UI layers float on top. More opacity than
    // before so low-contrast wallpapers still give crisp white text.
    tint: 'rgba(4, 10, 22, 0.52)',
    base: '#060E17',
    highlight: '#1A3A5C',
    highlightOpacity: 0.7,
    lightNavIcons: false,
    lightStatusIcons: false,
  },
  skeuo: {
    tint: 'rgba(237, 224, 196, 0.25)',
    base: '#D9CFC2',
    highlight: '#F5F0E8',
    highlightOpacity: 0.55,
    lightNavIcons: true,
    lightStatusIcons: true,
  },
  minimal: {
    tint: 'rgba(0, 0, 0, 0.50)',
    base: '#080808',
    highlight: '#1C1C1C',
    highlightOpacity: 0.6,
    lightNavIcons: false,
    lightStatusIcons: false,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const WallpaperBackground = memo(function WallpaperBackground({
  screenWidth = 393,
  scrollX,
}: WallpaperBackgroundProps) {
  const { paradigm } = useWeftConfig();
  const def = PARADIGM_STYLES[paradigm];

  // Real wallpaper data URI from native module (null = not loaded yet)
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [wallpaperLoaded, setWallpaperLoaded] = useState(false);

  // Track previous paradigm for crossfade
  const prevParadigm = useRef(paradigm);
  const [activeDef, setActiveDef] = useState(def);

  // Crossfade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch wallpaper from native module ─────────────────────────────────
  const fetchWallpaper = async () => {
    if (!WallpaperModule) {
      // Native module not available — use JS fallback silently
      return;
    }
    try {
      const uri: string | null = await WallpaperModule.getWallpaperBase64();
      if (uri) {
        setWallpaperUri(uri);
      }
    } catch {
      // Non-fatal — JS fallback will render
    }
  };

  // ── Mount: fetch wallpaper and set up AppState listener ────────────────
  useEffect(() => {
    fetchWallpaper();

    // When user returns to the launcher after potentially changing wallpaper,
    // invalidate the native cache and re-fetch
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        if (WallpaperModule) {
          try {
            await WallpaperModule.invalidateCache();
          } catch { /* ignore */ }
        }
        fetchWallpaper();
      }
    });

    return () => sub.remove();
  }, []);

  // ── Fade in on first load ──────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Crossfade on paradigm change ──────────────────────────────────────
  // Two-layer crossfade: keep the outgoing tint visible while fading in the
  // new tint on top, so there's never a flash to the raw wallpaper between
  // paradigm switches.
  const [prevActiveDef, setPrevActiveDef] = useState<typeof activeDef | null>(null);
  const outgoingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prevParadigm.current === paradigm) return;
    prevParadigm.current = paradigm;

    // Snapshot the outgoing tint, show it as an overlay, switch the base
    // layer, then fade the overlay out.
    setPrevActiveDef(activeDef);
    outgoingOpacity.setValue(1);
    setActiveDef(PARADIGM_STYLES[paradigm]);
    Animated.timing(outgoingOpacity, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start(() => {
      setPrevActiveDef(null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paradigm]);

  // ── Update system UI to match paradigm ───────────────────────────────
  useEffect(() => {
    if (!WeftSystemUI) return;
    const style = PARADIGM_STYLES[paradigm];
    // Always transparent nav bar — just control the icon tint
    WeftSystemUI.setNavigationBar('#00000000', style.lightNavIcons)
      .catch(() => { /* non-fatal */ });
    WeftSystemUI.setStatusBarStyle(style.lightStatusIcons)
      .catch(() => { /* non-fatal */ });
  }, [paradigm]);

  // ── Render ────────────────────────────────────────────────────────────
  const hlSize = screenWidth * 1.3;
  const hlTop = -(hlSize * 0.15);
  const hlLeft = (screenWidth - hlSize) / 2;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { opacity: fadeAnim },
      ]}
    >
      {wallpaperUri ? (
        /* ── Real system wallpaper ─────────────────────────────────── */
        <>
          <Image
            source={{ uri: wallpaperUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onLoad={() => setWallpaperLoaded(true)}
            fadeDuration={0}
          />
          {/* Active paradigm tint */}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: activeDef.tint }]}
          />
          {/* Outgoing paradigm tint — fades out during crossfade */}
          {prevActiveDef !== null && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: prevActiveDef.tint, opacity: outgoingOpacity },
              ]}
            />
          )}
        </>
      ) : (
        /* ── JS fallback gradient simulation ───────────────────────── */
        <View style={[StyleSheet.absoluteFill, { backgroundColor: activeDef.base }]}>
          <View
            style={{
              position: 'absolute',
              width: hlSize,
              height: hlSize,
              borderRadius: hlSize / 2,
              backgroundColor: activeDef.highlight,
              opacity: activeDef.highlightOpacity,
              top: hlTop,
              left: hlLeft,
            }}
          />
          {/* Outgoing paradigm overlay for fallback mode too */}
          {prevActiveDef !== null && (
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: prevActiveDef.base, opacity: outgoingOpacity }]}
            />
          )}
        </View>
      )}
    </Animated.View>
  );
});
