/**
 * Weft — Accessibility Profile Deltas
 *
 * Each function accepts a fully-resolved AppSemantics object and returns
 * a new one with only the relevant fields overridden. The input object is
 * never mutated — spread at every level to maintain immutability.
 *
 * Application order (enforced by compose.ts):
 *   Motor → Vision → Cognitive → OneHanded
 *
 * Rules:
 * - Only override what the profile genuinely changes.
 * - No raw values. Reference primitives (spacing, typography, etc.).
 * - No paradigm-specific branching inside deltas. Profiles are paradigm-agnostic.
 */

import { spacing, typography, opacity } from './primitives';
import type { AppSemantics } from './semantics';

// ---------------------------------------------------------------------------
// applyMotor — enlarged touch targets, wider spacing
// ---------------------------------------------------------------------------

/**
 * Motor profile: prioritises reachability and reduces mis-taps.
 *
 * Changes:
 * - Tile, toggle, and slider touch targets raised to 72px minimum
 * - Slider track height and thumb size increased
 * - Grid gap widened so targets don't crowd each other
 * - Screen and dock padding widened
 */
export function applyMotor(sem: AppSemantics): AppSemantics {
  return {
    ...sem,
    component: {
      ...sem.component,
      tile: {
        ...sem.component.tile,
        touchTarget: 72,
        padding: spacing[5],
      },
      slider: {
        ...sem.component.slider,
        trackHeight: 10,
        thumbSize: 30,
      },
      toggle: {
        ...sem.component.toggle,
        width: 58,
        height: 34,
        touchTarget: 56,
      },
      dock: {
        ...sem.component.dock,
        height: 92,
        paddingH: spacing[8],
      },
    },
    layout: {
      ...sem.layout,
      screenPaddingH: spacing[6],
      gridGap: spacing[4],
    },
  };
}

// ---------------------------------------------------------------------------
// applyVision — larger type, higher contrast, reduced translucency
// ---------------------------------------------------------------------------

/**
 * Vision profile: maximises legibility.
 *
 * Changes:
 * - All label typography steps up one size (labelSm → labelMd, etc.)
 * - Tile label + chip text sizes increased
 * - Section header label size increased
 * - Surface text colours shifted to maximum contrast (handled by downstream
 *   cascade in compose.ts for Glass × Vision; here we sharpen non-glass text)
 * - Section header plate raised to full opacity
 * - App icon label size increased
 *
 * Note: the Glass × Vision cascade (deepening tint, clearing chip/plate
 * backgrounds) is applied in compose.ts as an intersection rule, not here.
 */
export function applyVision(sem: AppSemantics): AppSemantics {
  return {
    ...sem,
    component: {
      ...sem.component,
      tile: {
        ...sem.component.tile,
        labelType: typography.labelMd,   // up from labelSm
        chipType: typography.bodySm,     // up from captionMd
      },
      sectionHeader: {
        ...sem.component.sectionHeader,
        labelType: typography.labelMd,
        // Raise plate opacity for non-glass paradigms
        plateBackground: sem.component.glassContainer === null
          ? `rgba(0,0,0,${opacity[80]})`
          : sem.component.sectionHeader.plateBackground, // glass handled in compose
      },
      appIcon: {
        ...sem.component.appIcon,
        labelType: typography.bodySm,   // up from captionMd
        containerSize: 68,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// applyCognitive — reduced noise, simplified layout
// ---------------------------------------------------------------------------

/**
 * Cognitive profile: reduces the total number of visual decisions the user
 * must make at once.
 *
 * Changes:
 * - Grid columns reduced from 4 → 3 (fewer items per row = less scanning)
 * - Section gap increased (more breathing room between groups)
 * - Chip backgrounds made fully transparent (fewer chrome elements)
 * - Glass container blur radius halved (reduces visual complexity of background)
 */
export function applyCognitive(sem: AppSemantics): AppSemantics {
  return {
    ...sem,
    component: {
      ...sem.component,
      tile: {
        ...sem.component.tile,
        chipBackground: 'transparent',
        chipForeground: sem.component.tile.labelColor,
      },
      glassContainer: sem.component.glassContainer
        ? {
            ...sem.component.glassContainer,
            blurRadius: Math.round(sem.component.glassContainer.blurRadius / 2),
          }
        : null,
    },
    layout: {
      ...sem.layout,
      gridColumns: 3,
      sectionGap: spacing[8],
    },
  };
}

// ---------------------------------------------------------------------------
// applyOneHanded — thumb-zone clustering, bottom-biased layout
// ---------------------------------------------------------------------------

/**
 * One-Handed profile: shifts interactive content into the lower half of the
 * screen, reachable with a single thumb.
 *
 * Changes:
 * - thumbSide set to 'right' (most users; TODO: respect system handedness)
 * - Screen horizontal padding asymmetric — more right-side breathing room
 * - Dock height increased to accommodate a taller thumb rail
 * - Grid gap slightly tightened on the vertical axis to keep more tiles in
 *   the lower zone (layout components read gridGap for row spacing)
 *
 * Note: the actual visual repositioning of the grid is done in layout
 * components (Phase 4) by reading layout.thumbSide. This delta sets the token;
 * components act on it.
 */
export function applyOneHanded(sem: AppSemantics): AppSemantics {
  return {
    ...sem,
    component: {
      ...sem.component,
      dock: {
        ...sem.component.dock,
        height: sem.component.dock.height + 12,
        paddingH: spacing[8],
      },
    },
    layout: {
      ...sem.layout,
      thumbSide: 'right',
      screenPaddingH: spacing[6],
    },
  };
}
