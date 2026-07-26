/**
 * Weft — WeftConfigContext
 *
 * Holds the live WeftConfig state (paradigm + activeProfiles) and the
 * AppSemantics object produced by compose(). Any component in the tree
 * reads semantics and dispatches changes through this context.
 *
 * compose() is called once on mount and once on every config change.
 * The result is memoized so referential equality is stable between renders
 * that don't change config.
 */

import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { compose } from '../compose/compose';
import { DEFAULT_CONFIG } from './types';
import type { AccessibilityProfile, Paradigm, WeftConfig } from './types';
import type { AppSemantics } from '../tokens/semantics';

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export type WeftConfigContextValue = {
  /** Fully composed, immutable token set for the current config. */
  semantics: AppSemantics;
  /** Active paradigm name. */
  paradigm: Paradigm;
  /** Currently active accessibility profiles. */
  activeProfiles: AccessibilityProfile[];
  /** Switch to a different paradigm. */
  setParadigm: (paradigm: Paradigm) => void;
  /**
   * Toggle an accessibility profile on or off.
   * Adding a profile appends it; removing it splices it out.
   */
  toggleProfile: (profile: AccessibilityProfile) => void;
};

// ---------------------------------------------------------------------------
// Context — initialised with a sentinel value so mis-use throws clearly
// ---------------------------------------------------------------------------

export const WeftConfigContext = createContext<WeftConfigContextValue | null>(
  null,
);
WeftConfigContext.displayName = 'WeftConfigContext';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
  /** Optional initial config — useful for tests and Storybook. */
  initialConfig?: Partial<WeftConfig>;
};

export function WeftConfigProvider({ children, initialConfig }: Props) {
  const [config, setConfig] = useState<WeftConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  // Recompute semantics whenever config changes.
  // useMemo gives us stable reference equality when config hasn't changed.
  const semantics = useMemo(
    () => compose(config.paradigm, config.activeProfiles),
    [config.paradigm, config.activeProfiles],
  );

  const setParadigm = useCallback((paradigm: Paradigm) => {
    setConfig(prev => ({ ...prev, paradigm }));
  }, []);

  const toggleProfile = useCallback((profile: AccessibilityProfile) => {
    setConfig(prev => {
      const has = prev.activeProfiles.includes(profile);
      return {
        ...prev,
        activeProfiles: has
          ? prev.activeProfiles.filter(p => p !== profile)
          : [...prev.activeProfiles, profile],
      };
    });
  }, []);

  const value = useMemo<WeftConfigContextValue>(
    () => ({
      semantics,
      paradigm: config.paradigm,
      activeProfiles: config.activeProfiles,
      setParadigm,
      toggleProfile,
    }),
    [semantics, config.paradigm, config.activeProfiles, setParadigm, toggleProfile],
  );

  return (
    <WeftConfigContext.Provider value={value}>
      {children}
    </WeftConfigContext.Provider>
  );
}
