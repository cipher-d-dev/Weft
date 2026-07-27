/**
 * useAppState
 *
 * Phase 7: Listens to React Native's AppState to detect when the launcher
 * returns to the foreground. Used to:
 *   1. Invalidate the WallpaperModule cache so the wallpaper re-reads
 *      if the user changed it while in another app.
 *   2. Refresh the installed apps list after the user installs/removes an app
 *      via the Play Store and returns to the launcher.
 *
 * Returns:
 *   isActive — true when the app is in the foreground
 *   justResumed — flips to true for one render cycle when the app comes
 *                 back from background, then back to false. Subscribe to
 *                 this to trigger one-shot refresh effects.
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, NativeModules } from 'react-native';

const { WallpaperModule } = NativeModules as {
  WallpaperModule?: {
    invalidateCache(): Promise<void>;
  };
};

// ---------------------------------------------------------------------------
// useAppState
// ---------------------------------------------------------------------------

export function useAppState(): {
  isActive: boolean;
  justResumed: boolean;
} {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');
  const [justResumed, setJustResumed] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      const isNowActive = nextState === 'active';

      appState.current = nextState;
      setIsActive(isNowActive);

      if (wasBackground && isNowActive) {
        // App just came back to foreground
        setJustResumed(true);

        // Invalidate wallpaper cache so WallpaperBackground re-reads on resume
        WallpaperModule?.invalidateCache().catch(() => {
          // Non-fatal — wallpaper will just use the cached version
        });

        // Reset justResumed after one render cycle
        // Using setTimeout(0) so consumers see justResumed=true for exactly
        // one effect cycle, then it clears.
        setTimeout(() => setJustResumed(false), 0);
      }
    });

    return () => sub.remove();
  }, []);

  return { isActive, justResumed };
}
