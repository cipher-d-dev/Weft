/**
 * Weft — Config Types
 *
 * Shared type contracts used by the compose pipeline, context, and hooks.
 * These live in src/context/ so that context (Phase 2) and compose (Phase 1)
 * can both import from one place without a circular dependency.
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
// Base size 60dp but scale slightly for large screens (tablets etc)
const defaultIconSize = SCREEN_W >= 480 ? 72 : 60;

// ---------------------------------------------------------------------------
// Paradigm
// ---------------------------------------------------------------------------

/**
 * The three visual paradigms. Each has its own paradigm factory in
 * src/tokens/paradigms.ts that returns a fully-resolved AppSemantics object.
 *
 * - 'glass'   — frosted translucency, cool blue-greys, 22px radii
 * - 'skeuo'   — warm textures, depth, parchment tones, amber accent
 * - 'minimal' — flat, high contrast, tight spacing, neutral palette
 */
export type Paradigm = 'glass' | 'skeuo' | 'minimal';

// ---------------------------------------------------------------------------
// Accessibility profiles
// ---------------------------------------------------------------------------

/**
 * Each profile is an independent delta applied on top of the base paradigm.
 * Multiple profiles compose in a fixed order (see compose.ts).
 *
 * - 'motor'     — enlarged touch targets, wider spacing between controls
 * - 'vision'    — larger type, higher contrast, reduced translucency
 * - 'cognitive' — reduced visual noise, simplified layouts, less motion
 * - 'oneHanded' — thumb-zone clustering, bottom-biased layout
 */
export type AccessibilityProfile = 'motor' | 'vision' | 'cognitive' | 'oneHanded';

// ---------------------------------------------------------------------------
// Icon customization
// ---------------------------------------------------------------------------

/** Shape variants available in the icon shape picker. */
export type IconShape = 'squircle' | 'circle' | 'rounded-square' | 'teardrop' | 'hexagon';

/** Icon customization config. */
export type IconConfig = {
  size: number;                    // dp, range 48–80, default 60
  shape: IconShape;
  packPackageName: string | null;  // null = use system icons
  labelVisible: boolean;
};

// ---------------------------------------------------------------------------
// Typography customization
// ---------------------------------------------------------------------------

/** Font family choices available in the picker. */
export type FontChoice = 'inter' | 'fraunces' | 'jetbrains-mono' | 'system';

/** Typography customization config. */
export type FontConfig = {
  family: FontChoice;
  scale: number;  // 0.85–1.3, multiplier applied to all type sizes
};

// ---------------------------------------------------------------------------
// Wallpaper
// ---------------------------------------------------------------------------

/** Where the wallpaper originates from. */
export type WallpaperSource = 'system' | 'gallery' | 'unsplash' | 'bundled';

/** Wallpaper configuration. */
export type WallpaperConfig = {
  source: WallpaperSource;
  uri?: string;           // local file URI or Unsplash photo URI
  dominantColor?: string; // hex color extracted by Palette API
};

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

/** Individual widget instance configuration. */
export type WidgetConfig = {
  id: string;           // e.g. 'weather', 'calendar', 'quicknotes'
  enabled: boolean;
  order: number;        // 0-indexed position in the widget stack
  settings: Record<string, any>; // widget-specific config (location, note text, etc.)
};

// ---------------------------------------------------------------------------
// Gestures
// ---------------------------------------------------------------------------

/** Actions that can be bound to swipe gestures. */
export type GestureAction =
  | 'none'
  | 'controlCenter'
  | 'allApps'
  | 'notifications'         // Android notification shade
  | 'quickSettings'         // Android quick settings panel
  | 'recentApps';           // Recent apps switcher

/** Gesture bindings for 4 swipe directions. */
export type GestureBindings = {
  swipeDown: GestureAction;
  swipeUp: GestureAction;
  swipeLeft: GestureAction;
  swipeRight: GestureAction;
};

// ---------------------------------------------------------------------------
// WeftConfig
// ---------------------------------------------------------------------------

/**
 * The complete user configuration state. Held in WeftConfigContext (Phase 2)
 * and fed into compose() on every change.
 */
export type WeftConfig = {
  paradigm: Paradigm;
  activeProfiles: AccessibilityProfile[];
  icons: IconConfig;
  font: FontConfig;
  wallpaper: WallpaperConfig;
  widgets: WidgetConfig[];
  gestures: GestureBindings;
  /**
   * Ordered list of package names pinned to the home grid.
   * Empty array = home screen is intentionally empty (default).
   * The user adds apps via "Add to Home" from the All Apps drawer.
   */
  pinnedApps: string[];
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: WeftConfig = {
  paradigm: 'skeuo',
  activeProfiles: [],
  icons: {
    size: defaultIconSize,
    shape: 'squircle',
    packPackageName: null,
    labelVisible: true,
  },
  font: {
    family: 'inter',
    scale: 1.0,
  },
  wallpaper: {
    source: 'system',
  },
  widgets: [],
  gestures: {
    swipeDown: 'quickSettings',
    swipeUp: 'allApps',
    swipeLeft: 'none',
    swipeRight: 'none',
  },
  pinnedApps: [],
};
