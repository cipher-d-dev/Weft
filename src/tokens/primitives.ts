/**
 * Weft — Primitive Tokens
 *
 * Tier 1 of the three-tier token system. These are raw values with no semantic
 * meaning. Nothing in the UI reads primitives directly — they are referenced
 * exclusively by the semantic layer (semantics.ts) and paradigm factories.
 *
 * Typography sizes follow a 1.25 Major Third modular scale anchored at 16px:
 *   xs  = 10.24   (~10)
 *   sm  = 12.80   (~13)
 *   md  = 16.00   (base)
 *   lg  = 20.00
 *   xl  = 25.00
 *   2xl = 31.25
 *   3xl = 39.06   (~39)
 *   4xl = 48.83   (~49)
 *
 * Font families: place .ttf files at
 *   android/app/src/main/assets/fonts/<filename>.ttf
 * React Native resolves them by PostScript name (the string below).
 * iOS: add to project bundle + Info.plist (Phase 7 concern).
 */

// ---------------------------------------------------------------------------
// Font families
// ---------------------------------------------------------------------------

export const fontFamilies = {
  /** Fraunces — variable serif. Used for hero labels, paradigm names, clocks. */
  display: 'Fraunces-VariableFont_SOFT,WONK,opsz,wght',
  /** Inter — variable sans. Used for tile labels, section headers, body copy. */
  ui: 'Inter-VariableFont_opsz,wght',
  /** JetBrains Mono — fixed-width. Used for time, battery %, data readouts. */
  mono: 'JetBrainsMono-Regular',
} as const;

export type FontFamily = keyof typeof fontFamilies;

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

/**
 * Neutral ramp — warm off-whites → charcoals.
 * Skeuo surfaces and Minimal backgrounds draw from here.
 */
export const neutral = {
  0: '#FFFFFF',
  50: '#F8F6F2',   // warm paper white
  100: '#EDE8DF',  // parchment
  150: '#DDD6C9',
  200: '#C8BFAF',
  300: '#A89D8E',
  400: '#857970',
  500: '#635850',
  600: '#453D36',
  700: '#2E2720',
  800: '#1C1714',
  900: '#0F0C0A',
  950: '#060402',
} as const;

/**
 * Glass ramp — cool blue-greys for frosted surfaces.
 * Used by the Glass paradigm container tints and overlays.
 */
export const glass = {
  0: '#FFFFFF',
  50: '#F0F4F8',
  100: '#DDE6EE',
  200: '#B8CCDC',
  300: '#8AAFC6',
  400: '#5E8FAE',
  500: '#3A6F95',
  600: '#255278',
  700: '#163A58',
  800: '#0B2438',
  900: '#04111C',
  950: '#010609',
} as const;

/**
 * Accent — a single restrained accent per feel.
 * Paradigm factories choose which accent ramp to wire in.
 */
export const accentAmber = {
  100: '#FFF3D6',
  300: '#FFD07A',
  500: '#F5A623',
  700: '#B87800',
  900: '#6B4500',
} as const;

export const accentBlue = {
  100: '#D6ECFF',
  300: '#7FC3FF',
  500: '#2196F3',
  700: '#1565C0',
  900: '#0A2847',
} as const;

export const accentSage = {
  100: '#E8F5E9',
  300: '#A5D6A7',
  500: '#4CAF50',
  700: '#2E7D32',
  900: '#1B5E20',
} as const;

/** Semantic status colors — paradigm-invariant. */
export const status = {
  errorLight: '#FF5449',
  errorDark: '#FF897D',
  warningLight: '#F59E0B',
  warningDark: '#FCD34D',
  successLight: '#22C55E',
  successDark: '#4ADE80',
  infoLight: '#3B82F6',
  infoDark: '#60A5FA',
} as const;

/** Pure transparency helpers. */
export const alpha = {
  glass40: 'rgba(255,255,255,0.40)',
  glass60: 'rgba(255,255,255,0.60)',
  glass92: 'rgba(255,255,255,0.92)',
  dark20: 'rgba(0,0,0,0.20)',
  dark40: 'rgba(0,0,0,0.40)',
  dark60: 'rgba(0,0,0,0.60)',
  dark80: 'rgba(0,0,0,0.80)',
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4px base grid
// ---------------------------------------------------------------------------

export const spacing = {
  0: 0,
  1: 4,    // 4
  2: 8,    // 8
  3: 12,   // 12
  4: 16,   // 16 — standard component padding
  5: 20,   // 20
  6: 24,   // 24
  7: 28,   // 28
  8: 32,   // 32
  10: 40,  // 40
  12: 48,  // 48
  14: 56,  // 56
  16: 64,  // 64
  20: 80,  // 80
  24: 96,  // 96
} as const;

export type SpacingKey = keyof typeof spacing;

// ---------------------------------------------------------------------------
// Corner radii
// ---------------------------------------------------------------------------

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,    // default tile / card radius
  xl: 22,    // glass variant tile radius
  '2xl': 28,
  full: 9999, // pill / circle
} as const;

export type RadiusKey = keyof typeof radii;

// ---------------------------------------------------------------------------
// Elevation / shadows
// Apply as StyleSheet shadow props + Android elevation.
// ---------------------------------------------------------------------------

export type ShadowToken = {
  /** Android */
  elevation: number;
  /** iOS / cross-platform shadow */
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
};

export const elevation = {
  none: {
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  xs: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  sm: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  md: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  lg: {
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  xl: {
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
  },
} as const satisfies Record<string, ShadowToken>;

export type ElevationKey = keyof typeof elevation;

// ---------------------------------------------------------------------------
// Opacity
// ---------------------------------------------------------------------------

export const opacity = {
  0: 0,
  5: 0.05,
  10: 0.10,
  20: 0.20,
  30: 0.30,
  40: 0.40,
  50: 0.50,
  60: 0.60,
  70: 0.70,
  80: 0.80,
  90: 0.90,
  92: 0.92,
  95: 0.95,
  100: 1,
} as const;

export type OpacityKey = keyof typeof opacity;

// ---------------------------------------------------------------------------
// Typography scale — 1.25 Major Third, anchored at 16px
// ---------------------------------------------------------------------------

export type TypographyToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  letterSpacing: number;
};

export const typography = {
  /**
   * Display / Hero sizes — Fraunces
   * Tight letterspacing, heavy weight. Paradigm names, clocks, splash labels.
   */
  display4xl: {
    fontFamily: fontFamilies.display,
    fontSize: 49,
    lineHeight: 56,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  display3xl: {
    fontFamily: fontFamilies.display,
    fontSize: 39,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1.0,
  },
  display2xl: {
    fontFamily: fontFamilies.display,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  displayXl: {
    fontFamily: fontFamilies.display,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.25,
  },

  /**
   * UI sizes — Inter
   * Used for labels, section headers, body copy, status chips.
   */
  labelLg: {
    fontFamily: fontFamilies.ui,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 0,
  },
  labelMd: {
    fontFamily: fontFamilies.ui,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0,
  },
  labelSm: {
    fontFamily: fontFamilies.ui,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  bodyMd: {
    fontFamily: fontFamilies.ui,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: fontFamilies.ui,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  captionMd: {
    fontFamily: fontFamilies.ui,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  /**
   * Mono sizes — JetBrains Mono
   * Time display, battery %, numeric readouts.
   */
  monoLg: {
    fontFamily: fontFamilies.mono,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  monoMd: {
    fontFamily: fontFamilies.mono,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.25,
  },
  monoSm: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0,
  },
} as const satisfies Record<string, TypographyToken>;

export type TypographyKey = keyof typeof typography;

// ---------------------------------------------------------------------------
// Motion — duration + easing constants
// ---------------------------------------------------------------------------

export const duration = {
  instant: 0,
  fast: 120,
  normal: 200,
  relaxed: 280,
  slow: 400,
} as const;

export const easing = {
  /** Standard spring feel — most interactions. */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Gentle ease-out — surface transitions. */
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Linear — progress indicators only. */
  linear: 'linear',
} as const;
