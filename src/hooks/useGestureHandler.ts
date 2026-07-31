/**
 * Weft — useGestureHandler
 *
 * Handles 4-direction swipe gestures on HomeScreen, reads bindings from
 * WeftConfig.gestures, and executes the appropriate action.
 *
 * Directions:
 *   - swipeDown: downward from top edge (default: controlCenter)
 *   - swipeUp: upward from below top edge (default: allApps)
 *   - swipeLeft: leftward horizontal swipe (default: none)
 *   - swipeRight: rightward horizontal swipe (default: none)
 *
 * Returns a PanResponder that can be spread onto the root View.
 *
 * Implementation note:
 *   PanResponder.create() is called once and must not re-run (doing so
 *   breaks touch tracking mid-gesture). All mutable state — gesture bindings,
 *   callbacks, thresholds — is kept in refs so the single PanResponder
 *   always sees the latest values without being recreated.
 */

import { useCallback, useEffect, useRef } from 'react';
import { NativeModules, PanResponder, Vibration } from 'react-native';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { useWeftConfig } from './useWeftConfig';
import type { GestureAction, GestureBindings } from '../context/types';

// ---------------------------------------------------------------------------
// Native module
// ---------------------------------------------------------------------------

const { SystemGestures } = NativeModules;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GestureCallbacks = {
  onOpenControlCenter?: () => void;
  onOpenAllApps?: () => void;
  onOpenNotifications?: () => void;
  onOpenQuickSettings?: () => void;
  onOpenRecentApps?: () => void;
  /** Called when the user long-presses on empty wallpaper space. */
  onLongPressBackground?: () => void;
};

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const VERTICAL_THRESHOLD = 50;
const HORIZONTAL_THRESHOLD = 80;
const VERTICAL_RATIO = 1.2;
const HORIZONTAL_RATIO = 1.2;
const TOP_ZONE_HEIGHT = 140;
/** Minimum movement (dp) before we cancel the long-press timer. */
const LONG_PRESS_CANCEL_SLOP = 8;
/** Delay (ms) before the long-press fires. */
const LONG_PRESS_DELAY = 500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGestureHandler(callbacks: GestureCallbacks) {
  const { gestures } = useWeftConfig();

  // Keep callbacks and bindings in refs — PanResponder reads these directly
  // so it never has stale closures even though it's created only once.
  const callbacksRef  = useRef(callbacks);
  const gesturesRef   = useRef<GestureBindings>(gestures);

  // Sync refs on every render
  useEffect(() => { callbacksRef.current  = callbacks; });
  useEffect(() => { gesturesRef.current   = gestures;  }, [gestures]);

  // Execute an action based on the config binding
  const executeAction = useCallback((action: GestureAction) => {
    const cbs = callbacksRef.current;
    switch (action) {
      case 'controlCenter':
        cbs.onOpenControlCenter?.();
        Vibration.vibrate(30);
        break;
      case 'allApps':
        cbs.onOpenAllApps?.();
        Vibration.vibrate(30);
        break;
      case 'notifications':
        SystemGestures?.expandNotifications?.();
        Vibration.vibrate(20);
        break;
      case 'quickSettings':
        SystemGestures?.expandQuickSettings?.();
        Vibration.vibrate(20);
        break;
      case 'recentApps':
        SystemGestures?.showRecentApps?.();
        Vibration.vibrate(40);
        break;
      case 'none':
        break;
    }
  }, []);

  // Keep executeAction in a ref too so PanResponder can call the latest version
  const executeActionRef = useRef(executeAction);
  useEffect(() => { executeActionRef.current = executeAction; }, [executeAction]);

  // Long-press timer — started in onStartShouldSetPanResponder, cancelled on
  // any movement or when a swipe gesture is claimed.
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired  = useRef(false);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Detect gesture direction — reads from gesturesRef so always fresh
  const detectDirectionRef = useRef(
    (evt: GestureResponderEvent, gs: PanResponderGestureState): GestureAction | null => {
      const { dy, dx, y0 } = gs;
      // y0 is the start Y coordinate of the gesture — more reliable than moveY
      const startedNearTop = y0 < TOP_ZONE_HEIGHT;

      // Downward swipe from top edge only
      if (
        dy > VERTICAL_THRESHOLD &&
        dy > Math.abs(dx) * VERTICAL_RATIO &&
        startedNearTop
      ) {
        return gesturesRef.current.swipeDown;
      }

      // Upward swipe — anywhere on screen
      if (
        dy < -VERTICAL_THRESHOLD &&
        Math.abs(dy) > Math.abs(dx) * VERTICAL_RATIO
      ) {
        return gesturesRef.current.swipeUp;
      }

      // Leftward horizontal swipe
      if (
        dx < -HORIZONTAL_THRESHOLD &&
        Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO
      ) {
        return gesturesRef.current.swipeLeft;
      }

      // Rightward horizontal swipe
      if (
        dx > HORIZONTAL_THRESHOLD &&
        dx > Math.abs(dy) * HORIZONTAL_RATIO
      ) {
        return gesturesRef.current.swipeRight;
      }

      return null;
    },
  );

  // Single PanResponder instance — uses refs internally so it never goes stale
  const panResponder = useRef(
    PanResponder.create({
      // ── Long-press timer ──────────────────────────────────────────────────
      // We observe every touch-start via onStartShouldSetPanResponder but
      // return FALSE so we never steal the responder from children.
      // The timer starts here and is cancelled by any significant movement
      // or when the PanResponder itself claims the gesture for a swipe.
      onStartShouldSetPanResponder: () => {
        // Start timer — cancelled on move or gesture claim
        cancelLongPress();
        longPressFired.current = false;
        longPressTimer.current = setTimeout(() => {
          longPressFired.current = true;
          Vibration.vibrate(40);
          callbacksRef.current.onLongPressBackground?.();
        }, LONG_PRESS_DELAY);
        return false; // don't claim — children handle their own taps
      },
      onStartShouldSetPanResponderCapture: () => false,

      // Claim the gesture once movement confirms a directional swipe
      onMoveShouldSetPanResponder: (evt, gs) => {
        const { dx, dy } = gs;
        if (Math.abs(dx) > LONG_PRESS_CANCEL_SLOP || Math.abs(dy) > LONG_PRESS_CANCEL_SLOP) {
          cancelLongPress();
        }
        return detectDirectionRef.current(evt, gs) !== null;
      },
      // Capture strong directional movements to prevent FlatList stealing them
      onMoveShouldSetPanResponderCapture: (_evt, gs) => {
        const { dy, dx } = gs;
        if (Math.abs(dx) > LONG_PRESS_CANCEL_SLOP || Math.abs(dy) > LONG_PRESS_CANCEL_SLOP) {
          cancelLongPress();
        }
        const isVertical   = Math.abs(dy) > Math.abs(dx) * VERTICAL_RATIO;
        const isHorizontal = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO;
        return (
          (isVertical   && Math.abs(dy) > VERTICAL_THRESHOLD * 0.6) ||
          (isHorizontal && Math.abs(dx) > HORIZONTAL_THRESHOLD * 0.6)
        );
      },
      onPanResponderGrant: () => {
        // We claimed for a swipe — long-press is no longer relevant
        cancelLongPress();
      },
      onPanResponderRelease: (evt, gs) => {
        cancelLongPress();
        if (!longPressFired.current) {
          const action = detectDirectionRef.current(evt, gs);
          if (action && action !== 'none') {
            executeActionRef.current(action);
          }
        }
      },
      onPanResponderTerminate: () => {
        cancelLongPress();
      },
    }),
  ).current;

  return { panHandlers: panResponder.panHandlers };
}
