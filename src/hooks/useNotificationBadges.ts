/**
 * useNotificationBadges
 *
 * JS bridge over NotificationBadgeModule (Kotlin NotificationListenerService).
 * Returns a Map<packageName, count> of apps with active notifications.
 *
 * Behaviour:
 * - Polls on mount to get the initial snapshot.
 * - Refreshes every time AppState returns to 'active' (user returns to launcher
 *   after opening another app — the badge should update to reflect cleared notifs).
 * - Exposes clearBadge(pkg) so callers can optimistically clear a badge when
 *   the user taps an app icon.
 * - Gracefully returns an empty Map if the native module is unavailable or
 *   the user hasn't granted Notification Access.
 *
 * Polling interval: no interval timer — only refreshes on AppState change.
 * This avoids unnecessary native bridge calls while the launcher is in the
 * foreground idle state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, NativeModules } from 'react-native';

const { NotificationBadge } = NativeModules as {
  NotificationBadge?: {
    getNotificationCounts(): Promise<Record<string, number>>;
    clearBadge(packageName: string): Promise<void>;
    isListenerEnabled(): Promise<boolean>;
    openNotificationAccessSettings(): Promise<void>;
  };
};

export type BadgeMap = Map<string, number>;

export type UseNotificationBadgesResult = {
  /** Map of packageName → active notification count. Empty if no access. */
  badges: BadgeMap;
  /** Call when the user opens an app — clears its badge optimistically. */
  clearBadge: (packageName: string) => void;
  /** True if the listener service is enabled (user has granted access). */
  listenerEnabled: boolean;
  /** Opens the system Notification Access settings screen. */
  openSettings: () => void;
};

export function useNotificationBadges(): UseNotificationBadgesResult {
  const [badges, setBadges] = useState<BadgeMap>(new Map());
  const [listenerEnabled, setListenerEnabled] = useState(false);
  // Track whether the module is available at all
  const moduleAvailable = NotificationBadge !== undefined;

  // ── Fetch counts from native ──────────────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    if (!moduleAvailable) return;
    try {
      const raw = await NotificationBadge!.getNotificationCounts();
      setBadges(new Map(Object.entries(raw)));
    } catch {
      // Non-fatal — leave existing badges
    }
  }, [moduleAvailable]);

  // ── Check listener status ─────────────────────────────────────────────────
  const checkEnabled = useCallback(async () => {
    if (!moduleAvailable) return;
    try {
      const enabled = await NotificationBadge!.isListenerEnabled();
      setListenerEnabled(enabled);
    } catch {
      setListenerEnabled(false);
    }
  }, [moduleAvailable]);

  // ── Mount: initial fetch + check ──────────────────────────────────────────
  useEffect(() => {
    checkEnabled();
    fetchCounts();
  }, [checkEnabled, fetchCounts]);

  // ── AppState: refresh when user returns to launcher ───────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkEnabled();
        fetchCounts();
      }
    });
    return () => sub.remove();
  }, [checkEnabled, fetchCounts]);

  // ── clearBadge — optimistic local clear + native call ─────────────────────
  const clearBadge = useCallback((packageName: string) => {
    // Optimistic: remove immediately from local state
    setBadges(prev => {
      const next = new Map(prev);
      next.delete(packageName);
      return next;
    });
    // Fire-and-forget to native
    if (moduleAvailable) {
      NotificationBadge!.clearBadge(packageName).catch(() => {});
    }
  }, [moduleAvailable]);

  // ── openSettings ──────────────────────────────────────────────────────────
  const openSettings = useCallback(() => {
    if (moduleAvailable) {
      NotificationBadge!.openNotificationAccessSettings().catch(() => {});
    }
  }, [moduleAvailable]);

  return { badges, clearBadge, listenerEnabled, openSettings };
}
