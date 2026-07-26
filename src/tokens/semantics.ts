/**
 * Weft — Semantic Token Interface
 *
 * Tier 2 of the three-tier token system. AppSemantics is the contract between
 * the design system and every component. All fields are typed value references
 * — never raw hex strings or magic numbers.
 *
 * Paradigm factories (paradigms.ts) return a concrete object matching this
 * interface. Profile deltas (profiles.ts) accept and return AppSemantics,
 * overriding only the fields relevant to each accessibility concern.
 *
 * Components read exclusively from AppSemantics via useWeftConfig().semantics.
 * They must never branch on Paradigm or AccessibilityProfile.
 */

import type { ShadowToken, TypographyToken } from './primitives';

// ---------------------------------------------------------------------------
// Sub-token shapes
// ---------------------------------------------------------------------------

export type ColorToken = string;
export type SizeToken = number;

export type SurfaceTokens = {
  /** Primary background fill of the surface. */
  background: ColorToken;
  /** Subtle secondary background (nested cards, inset sections). */
  backgroundAlt: ColorToken;
  /** Scrim or overlay when a modal/panel sits on top. */
  scrim: ColorToken;
  /** Border / separator color. */
  border: ColorToken;
  /** Primary text color on this surface. */
  textPrimary: ColorToken;
  /** Secondary / subdued text. */
  textSecondary: ColorToken;
  /** Disabled / placeholder text. */
  textDisabled: ColorToken;
};

export type TileTokens = {
  /** Tile background fill. */
  background: ColorToken;
  /** Tile background when selected/active. */
  backgroundSelected: ColorToken;
  /** Tile background while pressed. */
  backgroundPressed: ColorToken;
  /** Tile background when disabled. */
  backgroundDisabled: ColorToken;
  /** Icon tint color. */
  iconColor: ColorToken;
  /** Primary label color. */
  labelColor: ColorToken;
  /** Status chip background (e.g. "on" indicator). */
  chipBackground: ColorToken;
  /** Status chip text / icon color. */
  chipForeground: ColorToken;
  /** Border color (used in skeuo and minimal; none in glass). */
  border: ColorToken;
  /** Corner radius. */
  radius: SizeToken;
  /** Minimum touch target size (height and width). Raised by Motor profile. */
  touchTarget: SizeToken;
  /** Internal padding. */
  padding: SizeToken;
  /** Drop shadow. */
  shadow: ShadowToken;
  /** Typography for the main tile label. */
  labelType: TypographyToken;
  /** Typography for the status chip text. */
  chipType: TypographyToken;
};

export type SliderTokens = {
  /** Track background (unfilled). */
  trackBackground: ColorToken;
  /** Track fill (the filled portion). */
  trackFill: ColorToken;
  /** Thumb fill color. */
  thumbFill: ColorToken;
  /** Thumb border / ring. */
  thumbBorder: ColorToken;
  /** Track height. Raised by Motor profile. */
  trackHeight: SizeToken;
  /** Thumb diameter. Raised by Motor profile. */
  thumbSize: SizeToken;
  /** Corner radius of the track. */
  trackRadius: SizeToken;
};

export type ToggleTokens = {
  /** Track fill when off. */
  trackOff: ColorToken;
  /** Track fill when on. */
  trackOn: ColorToken;
  /** Thumb color. */
  thumb: ColorToken;
  /** Track width. */
  width: SizeToken;
  /** Track height. */
  height: SizeToken;
  /** Minimum touch target envelope. Raised by Motor profile. */
  touchTarget: SizeToken;
};

export type SectionHeaderTokens = {
  /** Text color. */
  textColor: ColorToken;
  /**
   * Backing plate color. Opacity-driven:
   * - Default: semi-transparent
   * - Glass × Vision cascade: drops to 0 (transparent) for maximum legibility
   */
  plateBackground: ColorToken;
  /** Plate corner radius. */
  plateRadius: SizeToken;
  /** Plate vertical padding. */
  platePaddingV: SizeToken;
  /** Plate horizontal padding. */
  platePaddingH: SizeToken;
  /** Typography for section header label. */
  labelType: TypographyToken;
};

export type WidgetCardTokens = {
  /** Card background. */
  background: ColorToken;
  /** Card border. */
  border: ColorToken;
  /** Card corner radius. */
  radius: SizeToken;
  /** Internal padding. */
  padding: SizeToken;
  /** Drop shadow. */
  shadow: ShadowToken;
};

export type DockTokens = {
  /** Dock container background. */
  background: ColorToken;
  /** Dock container border. */
  border: ColorToken;
  /** Dock corner radius (top corners). */
  radius: SizeToken;
  /** Dock height. */
  height: SizeToken;
  /** Internal horizontal padding. */
  paddingH: SizeToken;
  /** Drop shadow. */
  shadow: ShadowToken;
};

export type AppIconTokens = {
  /**
   * Icon container size. Paradigm-invariant — icon image itself is
   * always the same size. Only the shadow/badge chrome around it changes.
   */
  containerSize: SizeToken;
  /** Corner radius of the icon container (system icon shape). */
  radius: SizeToken;
  /** Drop shadow on the icon chrome. Reduced/none in Minimal paradigm. */
  shadow: ShadowToken;
  /** Label color below icon. */
  labelColor: ColorToken;
  /** Typography for the icon label. */
  labelType: TypographyToken;
};

/**
 * Glass paradigm-specific: the frosted container that sits between
 * the wallpaper and the tile layer. Present on all glass surfaces.
 */
export type GlassContainerTokens = {
  /** Tint color (semi-transparent white/grey). */
  tint: ColorToken;
  /**
   * Blur radius in points. Rendered via @react-native-community/blur or
   * equivalent. Glass × Vision cascade deepens tint instead of blur.
   */
  blurRadius: SizeToken;
  /** Corner radius of the glass container panel. */
  radius: SizeToken;
};

// ---------------------------------------------------------------------------
// Tile interaction states
// ---------------------------------------------------------------------------

export type TileStateTokens = {
  enabled: Pick<TileTokens, 'background' | 'border' | 'iconColor' | 'labelColor'>;
  selected: Pick<TileTokens, 'background' | 'border' | 'iconColor' | 'labelColor'>;
  pressed: Pick<TileTokens, 'background' | 'border' | 'iconColor' | 'labelColor'>;
  disabled: Pick<TileTokens, 'background' | 'border' | 'iconColor' | 'labelColor'>;
  focused: Pick<TileTokens, 'background' | 'border' | 'iconColor' | 'labelColor'>;
};

// ---------------------------------------------------------------------------
// AppSemantics — the full contract
// ---------------------------------------------------------------------------

export type AppSemantics = {
  // ── Surfaces ─────────────────────────────────────────────────────────────
  surface: {
    home: SurfaceTokens;
    controlCenter: SurfaceTokens;
    customization: SurfaceTokens;
  };

  // ── Components ────────────────────────────────────────────────────────────
  component: {
    tile: TileTokens;
    slider: SliderTokens;
    toggle: ToggleTokens;
    sectionHeader: SectionHeaderTokens;
    widgetCard: WidgetCardTokens;
    dock: DockTokens;
    appIcon: AppIconTokens;
    /**
     * Only present when paradigm === 'glass'. Paradigm factories for skeuo/
     * minimal set this to null; compose.ts consumers must check before using.
     */
    glassContainer: GlassContainerTokens | null;
  };

  // ── State overrides ───────────────────────────────────────────────────────
  state: {
    tile: TileStateTokens;
  };

  // ── Accent ───────────────────────────────────────────────────────────────
  accent: {
    /** Primary accent color for interactive elements. */
    primary: ColorToken;
    /** Lighter variant for backgrounds / chips. */
    subtle: ColorToken;
    /** On-accent text / icon color. */
    onAccent: ColorToken;
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  layout: {
    /**
     * Screen-edge horizontal padding.
     * Raised by OneHanded profile to bias content toward thumb side.
     */
    screenPaddingH: SizeToken;
    /** Standard vertical gap between sections. */
    sectionGap: SizeToken;
    /** Gap between tiles in the app grid. */
    gridGap: SizeToken;
    /** Number of grid columns. May reduce to 3 under Cognitive profile. */
    gridColumns: number;
    /**
     * When OneHanded is active, content shifts toward this side.
     * Not a visual token — used by layout components to offset positioning.
     */
    thumbSide: 'left' | 'right' | 'center';
  };
};
