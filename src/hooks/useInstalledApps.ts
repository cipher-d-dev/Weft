/**
 * Weft — useInstalledApps
 *
 * Fetches the device's installed app list via react-native-launcher-kit and
 * keeps it live by listening for installs and removals.
 *
 * Returns:
 *   apps    — sorted array of AppDetail (label, packageName, icon file path)
 *   loading — true only during the very first fetch (cache miss)
 *   error   — Error object if the fetch failed, null otherwise
 *   refresh — call to manually re-fetch (e.g. after a permission change)
 *
 * ## Caching
 * A module-level cache is shared across every component that mounts this
 * hook in the same JS runtime. This means:
 *   - The second mount (e.g. HomeScreen re-mounting after navigation) gets
 *     the cached list synchronously with loading=false — no spinner flash.
 *   - The cache is invalidated automatically when an app is installed or
 *     removed, so the next fetch always reflects the current app list.
 *   - A TTL (CACHE_TTL_MS) is applied so a very long session still refreshes
 *     the list periodically in case silent system installs occurred.
 *
 * Icon field is a file:// URI string returned by the native layer. Pass it
 * directly to <Image source={{ uri: app.icon }} />.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { InstalledApps } from 'react-native-launcher-kit';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';

// ---------------------------------------------------------------------------
// Module-level cache — persists for the lifetime of the JS bundle
// ---------------------------------------------------------------------------

/** How long the cached list is considered fresh (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Maximum time (ms) we allow a fetch to be "in flight" before declaring it
 * dead and allowing a new one to start. Protects against the hot-reload
 * resurrection bug where fetchInFlight stays true across a Fast Refresh
 * cycle and leaves all waiters hanging forever.
 */
const FETCH_TIMEOUT_MS = 15_000;

type AppCache = {
  apps: AppDetail[];
  fetchedAt: number; // Date.now() timestamp
};

/** Shared cache across all hook instances. Null = not yet populated. */
let moduleCache: AppCache | null = null;

/** True while a fetch is already in flight — prevents duplicate parallel requests. */
let fetchInFlight = false;

/**
 * Timestamp (Date.now()) when the most recent in-flight fetch started.
 * Used to detect stale fetchInFlight=true states after a hot-reload where
 * the previous fetch promise was abandoned but the flag was never reset.
 */
let fetchStartedAt = 0;

/**
 * Callbacks registered by each mounted hook instance.
 * When the in-flight fetch resolves, all waiters are notified.
 */
type FetchWaiter = (apps: AppDetail[], err: Error | null) => void;
const fetchWaiters: FetchWaiter[] = [];

// ---------------------------------------------------------------------------
// Stuck-state recovery
// ---------------------------------------------------------------------------

/**
 * Returns true if fetchInFlight is set but the fetch has been running longer
 * than FETCH_TIMEOUT_MS — meaning it was abandoned (e.g. by a hot reload).
 * In that case we reset the flag so a fresh fetch can be started.
 */
function isFetchStuck(): boolean {
  if (!fetchInFlight) return false;
  return Date.now() - fetchStartedAt > FETCH_TIMEOUT_MS;
}

/**
 * Resets the in-flight state and drains any waiting callbacks with an empty
 * result so they don't wait forever. Called when a stuck fetch is detected.
 */
function recoverStuckFetch(): void {
  fetchInFlight = false;
  fetchStartedAt = 0;
  const waiting = fetchWaiters.splice(0);
  for (const waiter of waiting) {
    waiter([], new Error('Fetch timed out — retrying'));
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function isCacheFresh(): boolean {
  if (!moduleCache) {
    return false;
  }
  return Date.now() - moduleCache.fetchedAt < CACHE_TTL_MS;
}

function invalidateCache(): void {
  moduleCache = null;
}

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
  // Initialise synchronously from cache so components that mount after the
  // first load never see a loading flash.
  const [apps, setApps] = useState<AppDetail[]>(
    () => (moduleCache ? moduleCache.apps : []),
  );
  const [loading, setLoading] = useState<boolean>(!moduleCache);
  const [error, setError] = useState<Error | null>(null);

  // Track whether this instance is still mounted to avoid state updates on
  // an unmounted component.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Core fetch logic ──────────────────────────────────────────────────────

  /**
   * Performs a native fetch, writes to the module cache, and notifies any
   * other hook instances that were waiting for the same in-flight request.
   * Should only ever be triggered by one caller at a time (gated by
   * fetchInFlight above).
   */
  const doFetch = useCallback(async () => {
    fetchInFlight = true;
    fetchStartedAt = Date.now();
    let result: AppDetail[] = [];
    let fetchError: Error | null = null;

    try {
      result = await InstalledApps.getSortedApps({
        includeVersion: false,
        includeAccentColor: false,
      });
      moduleCache = { apps: result, fetchedAt: Date.now() };
    } catch (err) {
      fetchError = err instanceof Error ? err : new Error(String(err));
    } finally {
      fetchInFlight = false;
    }

    // Notify all waiters (including this instance's own waiter)
    const waiters = fetchWaiters.splice(0);
    for (const waiter of waiters) {
      waiter(result, fetchError);
    }
  }, []);

  // ── Exposed refresh ───────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }
    invalidateCache();
    setError(null);
    setLoading(true);

    const waiter: FetchWaiter = (freshApps, fetchError) => {
      if (!mountedRef.current) {
        return;
      }
      setApps(freshApps);
      setError(fetchError);
      setLoading(false);
    };

    if (fetchInFlight) {
      // Piggyback on the already-running request
      fetchWaiters.push(waiter);
    } else {
      fetchWaiters.push(waiter);
      doFetch();
    }
  }, [doFetch]);

  // ── Mount effect ──────────────────────────────────────────────────────────

  useEffect(() => {
    // ── Stuck-state recovery ─────────────────────────────────────────────
    // If fetchInFlight has been set for longer than FETCH_TIMEOUT_MS the
    // previous fetch was abandoned (most likely by a hot-reload). Clear it
    // and drain the stale waiters so we can start fresh.
    if (isFetchStuck()) {
      recoverStuckFetch();
    }

    // Case 1: cache is fresh — use it immediately, no fetch needed.
    if (isCacheFresh()) {
      // State was already initialised with cache in useState above.
      // Just make sure loading is cleared in case something set it.
      if (mountedRef.current) {
        setApps(moduleCache!.apps);
        setLoading(false);
      }
    }
    // Case 2: another instance is already fetching — join as a waiter.
    else if (fetchInFlight) {
      fetchWaiters.push((freshApps, fetchError) => {
        if (!mountedRef.current) {
          return;
        }
        setApps(freshApps);
        setError(fetchError);
        setLoading(false);
      });
    }
    // Case 3: no cache, no fetch in flight — we own this fetch.
    else {
      setLoading(true);
      fetchWaiters.push((freshApps, fetchError) => {
        if (!mountedRef.current) {
          return;
        }
        setApps(freshApps);
        setError(fetchError);
        setLoading(false);
      });
      doFetch();
    }

    // ── Install / removal listeners ───────────────────────────────────────
    // On install: invalidate cache, add the new app, re-sort.
    // On removal: invalidate cache, splice the app out.
    // Both operations update the module cache so future mounts get the
    // latest list without a network round-trip.

    InstalledApps.startListeningForAppInstallations((newApp: AppDetail) => {
      invalidateCache();
      setApps(prev => {
        const updated = [
          ...prev.filter(a => a.packageName !== newApp.packageName),
          newApp,
        ].sort((a, b) => a.label.localeCompare(b.label));
        // Sync into module cache so other instances benefit
        moduleCache = { apps: updated, fetchedAt: Date.now() };
        return updated;
      });
    });

    InstalledApps.startListeningForAppRemovals((packageName: string) => {
      invalidateCache();
      setApps(prev => {
        const updated = prev.filter(a => a.packageName !== packageName);
        moduleCache = { apps: updated, fetchedAt: Date.now() };
        return updated;
      });
    });

    return () => {
      InstalledApps.stopListeningForAppInstallations();
      InstalledApps.stopListeningForAppRemovals();
    };
  }, [doFetch]);

  return { apps, loading, error, refresh };
}
