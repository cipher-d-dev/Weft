/**
 * Weft — useWeftConfig
 *
 * Typed hook that reads from WeftConfigContext. Throws a clear error if called
 * outside a WeftConfigProvider — this catches wiring mistakes at dev time
 * rather than silently returning stale or empty values.
 *
 * @example
 * const { semantics, paradigm, setParadigm, toggleProfile } = useWeftConfig();
 */

import { useContext } from 'react';
import { WeftConfigContext } from '../context/WeftConfigContext';
import type { WeftConfigContextValue } from '../context/WeftConfigContext';

export function useWeftConfig(): WeftConfigContextValue {
  const ctx = useContext(WeftConfigContext);

  if (ctx === null) {
    throw new Error(
      'useWeftConfig must be called inside a <WeftConfigProvider>. ' +
        'Wrap your app root (or the relevant subtree) with WeftConfigProvider.',
    );
  }

  return ctx;
}
