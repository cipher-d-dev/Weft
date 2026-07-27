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
 */

import { useCallback, useRef } from 'react';
import { NativeModules, PanResponder, Vibration } from 'react-native';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { useWeftConfig } from './useWeftConfig';
import type { GestureAction } from '../context/types';

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
};

// ---------------------------------------------------------------------------
// Gesture detection thresholds
// ---------------------------------------------------------------------------

const VERTICAL_THRESHOLD = 60;    // dp — minimum dy to trigger up/down
const HORIZONTAL_THRESHOLD = 100; // dp — minimum dx to trigger left/right
const VERTICAL_RATIO = 1.5;       // dy must be > |dx| * ratio for vertical
const HORIZONTAL_RATIO = 1.3;     // |dx| must be > dy * ratio for horizontal
const TOP_ZONE_HEIGHT = 120;      // dp — swipeDown only triggers if started near top

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGestureHandler(callbacks: GestureCallbacks) {
  const { gestures } = useWeftConfig();

  // Keep callbacks fresh without recreating PanResponder
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

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
        if (SystemGestures?.expandNotifications) {
          SystemGestures.expandNotifications();
          Vibration.vibrate(20);
        }
        break;
      case 'quickSettings':
        if (SystemGestures?.expandQuickSettings) {
          SystemGestures.expandQuickSettings();
          Vibration.vibrate(20);
        }
        break;
      case 'recentApps':
        if (SystemGestures?.showRecentApps) {
          SystemGestures.showRecentApps();
          Vibration.vibrate(40);
        }
        break;
      case 'none':
        // No-op
        break;
    }
  }, []);

  // Detect gesture direction from PanResponderGestureState
  const detectDirection = useCallback(
    (
      _evt: GestureResponderEvent,
      gs: PanResponderGestureState,
    ): GestureAction | null => {
      const { dy, dx, moveY } = gs;
      const startedNearTop = moveY < TOP_ZONE_HEIGHT;

      // Downward swipe from top edge
      if (
        dy > VERTICAL_THRESHOLD &&
        dy > Math.abs(dx) * VERTICAL_RATIO &&
        startedNearTop
      ) {
        return gestures.swipeDown;
      }

      // Upward swipe from anywhere below top zone
      if (
        dy < -VERTICAL_THRESHOLD &&
        Math.abs(dy) > Math.abs(dx) * VERTICAL_RATIO &&
        !startedNearTop
      ) {
        return gestures.swipeUp;
      }

      // Leftward horizontal swipe
      if (
        dx < -HORIZONTAL_THRESHOLD &&
        Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO
      ) {
        return gestures.swipeLeft;
      }

      // Rightward horizontal swipe
      if (
        dx > HORIZONTAL_THRESHOLD &&
        dx > Math.abs(dy) * HORIZONTAL_RATIO
      ) {
        return gestures.swipeRight;
      }

      return null;
    },
    [gestures],
  );

  // Create PanResponder (only once, uses refs for callbacks)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gs) => {
        return detectDirection(evt, gs) !== null;
      },
      onPanResponderRelease: (evt, gs) => {
        const action = detectDirection(evt, gs);
        if (action && action !== 'none') {
          executeAction(action);
        }
      },
    }),
  ).current;

  return panResponder;
}
