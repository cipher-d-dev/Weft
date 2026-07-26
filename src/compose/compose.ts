/**
 * Weft — Compose Pipeline
 *
 * The single entry point for resolving a (paradigm × activeProfiles) pair
 * into a concrete AppSemantics object. This is the only place in the codebase
 * where paradigm identity and profile membership are examined together.
 *
 * Pipeline:
 *   1. Select paradigm factory → base AppSemantics
 *   2. Apply profile deltas in fixed order: Motor → Vision → Cognitive → OneHanded
 *   3. Apply intersection cascade rules (paradigm-sensitive overrides)
 *   4. Return the final, frozen AppSemantics
 *
 * Callers (WeftConfigContext in Phase 2) call compose() on every config change
 * and store the result. Components never call compose() directly.
 */

import { semanticsSkeuo, semanticsGlass, semanticsMinimal } from '../tokens/paradigms';
import {
  applyMotor,
  applyVision,
  applyCognitive,
  applyOneHanded,
} from '../tokens/profiles';
import type { Paradigm, AccessibilityProfile } from '../context/types';
import type { AppSemantics } from '../tokens/semantics';
import { opacity } from '../tokens/primitives';

// ---------------------------------------------------------------------------
// Paradigm selector
// ---------------------------------------------------------------------------

function selectParadigm(paradigm: Paradigm): AppSemantics {
  switch (paradigm) {
    case 'skeuo':
      return semanticsSkeuo();
    case 'glass':
      return semanticsGlass();
    case 'minimal':
      return semanticsMinimal();
  }
}

// ---------------------------------------------------------------------------
// Fixed-order profile application
// ---------------------------------------------------------------------------

/** Canonical delta order. Must not change — profiles can depend on earlier ones. */
const PROFILE_ORDER: AccessibilityProfile[] = [
  'motor',
  'vision',
  'cognitive',
  'oneHanded',
];

function applyProfiles(
  sem: AppSemantics,
  activeProfiles: AccessibilityProfile[],
): AppSemantics {
  const active = new Set(activeProfiles);

  return PROFILE_ORDER.reduce((acc, profile) => {
    if (!active.has(profile)) return acc;
    switch (profile) {
      case 'motor':     return applyMotor(acc);
      case 'vision':    return applyVision(acc);
      case 'cognitive': return applyCognitive(acc);
      case 'oneHanded': return applyOneHanded(acc);
    }
  }, sem);
}

// ---------------------------------------------------------------------------
// Intersection cascade rules
// ---------------------------------------------------------------------------

/**
 * Glass × Vision cascade.
 *
 * When both the Glass paradigm and the Vision profile are active, the frosted
 * container must transition from decorative transparency to accessibility-grade
 * opacity. Standard glass tints (40–60%) render text illegibly against complex
 * wallpapers. This rule overrides to a near-opaque surface so contrast is
 * guaranteed without sacrificing the glass character entirely.
 *
 * Specific changes:
 * - glassContainer.tint deepens to 92% white (alpha.glass92 equivalent)
 * - glassContainer.blurRadius reduced from 40 → 20 (heavy blur is decorative,
 *   not functional; reducing it speeds up render on mid-range devices)
 * - sectionHeader.plateBackground → transparent (plate becomes redundant when
 *   the container is near-opaque; removing it reduces visual layering)
 * - tile.chipBackground → transparent (chip chrome competes with deepened tint)
 * - tile.chipForeground → same as tile.labelColor (text remains visible)
 */
function applyGlassVisionCascade(sem: AppSemantics): AppSemantics {
  if (sem.component.glassContainer === null) {
    // Safety: if somehow called on a non-glass semantics, return untouched.
    return sem;
  }

  return {
    ...sem,
    component: {
      ...sem.component,
      glassContainer: {
        ...sem.component.glassContainer,
        tint: `rgba(255,255,255,${opacity[92]})`,
        blurRadius: 20,
      },
      sectionHeader: {
        ...sem.component.sectionHeader,
        plateBackground: 'transparent',
      },
      tile: {
        ...sem.component.tile,
        chipBackground: 'transparent',
        chipForeground: sem.component.tile.labelColor,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// compose — public API
// ---------------------------------------------------------------------------

/**
 * Resolves a (paradigm, activeProfiles) pair to a complete AppSemantics.
 *
 * @param paradigm      - 'glass' | 'skeuo' | 'minimal'
 * @param activeProfiles - any subset of AccessibilityProfile, in any order
 * @returns Immutable AppSemantics ready for consumption by UI components
 *
 * @example
 * const semantics = compose('glass', ['vision', 'motor']);
 * // → Glass base + Motor delta + Vision delta + Glass×Vision cascade
 */
export function compose(
  paradigm: Paradigm,
  activeProfiles: AccessibilityProfile[],
): AppSemantics {
  // Step 1: base paradigm
  let sem = selectParadigm(paradigm);

  // Step 2: profile deltas in fixed order
  sem = applyProfiles(sem, activeProfiles);

  // Step 3: intersection cascade rules
  const isGlass = paradigm === 'glass';
  const hasVision = activeProfiles.includes('vision');

  if (isGlass && hasVision) {
    sem = applyGlassVisionCascade(sem);
  }

  return Object.freeze(sem);
}
