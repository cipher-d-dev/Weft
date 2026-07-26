/**
 * Weft — useInstalledApps
 *
 * Fetches the device's installed app list via react-native-launcher-kit and
 * keeps it live by listening for installs and removals.
 *
 * Returns:
 *   apps    — sorted array of AppDetail (label, packageName, icon file path)
 *   loading — true during the initial fetch
 *   error   — Error object if the fetch failed, null otherwise
 *   refresh — call to manually re-fetch (e.g. after a permission change)
 *
 * The hook wires up install/removal listeners on mount and tears them down
 * on unmount so the grid stays current without a manual refresh.
 *
 * Icon field is a file:// URI string returned by the native layer. Pass it
 * directly to <Image source={{ uri: app.icon }} />.
 */

import { useCallback, useEffect, useState } from 'react';
import { InstalledApps } from 'react-native-launcher-kit';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InstalledAppsState = {
  apps: AppDetail[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInstalledApps(): InstalledAppsState {
  const [apps, setApps] = useState<AppDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // getSortedApps returns apps alphabetically by label.
      // We skip version/accentColor for the initial load — not needed for the
      // grid and avoids unnecessary native work on large app lists.
      const result = await InstalledApps.getSortedApps({
        includeVersion: false,
        includeAccentColor: false,
      });
      setApps(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchApps();

    // Listen for new installs — add to list and re-sort alphabetically
    InstalledApps.startListeningForAppInstallations((newApp: AppDetail) => {
      setApps(prev => {
        const updated = [...prev.filter(a => a.packageName !== newApp.packageName), newApp];
        return updated.sort((a, b) => a.label.localeCompare(b.label));
      });
    });

    // Listen for removals — splice the uninstalled app out
    InstalledApps.startListeningForAppRemovals((packageName: string) => {
      setApps(prev => prev.filter(a => a.packageName !== packageName));
    });

    return () => {
      InstalledApps.stopListeningForAppInstallations();
      InstalledApps.stopListeningForAppRemovals();
    };
  }, [fetchApps]);

  return { apps, loading, error, refresh: fetchApps };
}
