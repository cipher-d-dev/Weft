/**
 * @tokens — Token system barrel export
 *
 * Consumers import from '@tokens' (alias wired in babel.config.js + tsconfig).
 * Import only what you need — tree-shaking handles the rest.
 *
 * @example
 * import { compose } from '@compose';
 * import type { AppSemantics } from '@tokens';
 */

// Tier 1 — Primitives
export * from './primitives';

// Tier 2 — Semantic interface
export type {
  AppSemantics,
  ColorToken,
  SizeToken,
  SurfaceTokens,
  TileTokens,
  SliderTokens,
  ToggleTokens,
  SectionHeaderTokens,
  WidgetCardTokens,
  DockTokens,
  AppIconTokens,
  GlassContainerTokens,
  TileStateTokens,
} from './semantics';

// Tier 3a — Paradigm factories
export { semanticsSkeuo, semanticsGlass, semanticsMinimal } from './paradigms';

// Tier 3b — Profile deltas
export { applyMotor, applyVision, applyCognitive, applyOneHanded } from './profiles';
