/**
 * useAdaptiveText
 *
 * Derives whether home screen text should be light or dark based on the
 * dominant color extracted from the active wallpaper.
 *
 * Algorithm:
 *   1. Parse the dominant hex color from WeftConfig.wallpaper.dominantColor
 *   2. Compute relative luminance (WCAG 2.1 formula)
 *   3. If luminance > 0.35 the wallpaper is "bright" → use dark text
 *      If luminance ≤ 0.35 the wallpaper is "dark"  → use light text
 *
 * Returns:
 *   textColor       — primary text hex (white or near-black)
 *   textColorSoft   — secondary text (70% opacity variant)
 *   isDark          — true when wallpaper is dark (light text active)
 */

import { useMemo } from 'react';
import { useWeftConfig } from './useWeftConfig';

// ---------------------------------------------------------------------------
// Luminance helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type AdaptiveTextTokens = {
  /** Primary text color adapted to wallpaper brightness */
  textColor: string;
  /** Secondary / muted text color */
  textColorSoft: string;
  /** True when wallpaper is dark → text is light */
  isDark: boolean;
};

export function useAdaptiveText(): AdaptiveTextTokens {
  const { wallpaper, paradigm, semantics } = useWeftConfig();

  return useMemo(() => {
    const dominant = wallpaper.dominantColor;

    // If no dominant color is stored, fall back to the paradigm semantic tokens
    if (!dominant) {
      return {
        textColor:     semantics.surface.home.textPrimary,
        textColorSoft: semantics.surface.home.textSecondary,
        isDark:        paradigm !== 'skeuo',
      };
    }

    const rgb = hexToRgb(dominant);
    if (!rgb) {
      return {
        textColor:     semantics.surface.home.textPrimary,
        textColorSoft: semantics.surface.home.textSecondary,
        isDark:        paradigm !== 'skeuo',
      };
    }

    const lum = relativeLuminance(rgb[0], rgb[1], rgb[2]);
    const isDark = lum <= 0.35;

    return {
      textColor:     isDark ? '#FFFFFF'         : '#0D0D0D',
      textColorSoft: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.55)',
      isDark,
    };
  }, [wallpaper.dominantColor, paradigm, semantics.surface.home]);
}
