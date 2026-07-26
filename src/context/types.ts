/**
 * Weft — Config Types
 *
 * Shared type contracts used by the compose pipeline, context, and hooks.
 * These live in src/context/ so that context (Phase 2) and compose (Phase 1)
 * can both import from one place without a circular dependency.
 */

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
// WeftConfig
// ---------------------------------------------------------------------------

/**
 * The complete user configuration state. Held in WeftConfigContext (Phase 2)
 * and fed into compose() on every change.
 */
export type WeftConfig = {
  paradigm: Paradigm;
  activeProfiles: AccessibilityProfile[];
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: WeftConfig = {
  paradigm: 'skeuo',
  activeProfiles: [],
};
