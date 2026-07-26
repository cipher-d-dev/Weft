/**
 * Weft — App Root
 *
 * Phase 5: App.tsx owns the ControlCenter open/close state so that the
 * overlay sits above the entire HomeScreen in the React tree, not nested
 * inside it. Architecture:
 *
 *   SafeAreaProvider
 *     WeftConfigProvider
 *       View (flex:1, relative)
 *         HomeScreen          ← receives onOpenControlCenter
 *         ControlCenterScreen ← absolute overlay, driven by animValue
 *
 * animValue (0 = closed, 1 = open) is owned here and passed to
 * ControlCenterScreen. open/close triggers Animated.spring.
 *
 * Back button is handled inside HomeScreen for normal launcher behaviour;
 * when the Control Center is open the ControlCenterScreen scrim handles
 * dismiss via onDismiss. We also add a BackHandler here to close the panel
 * if it's open before letting the event bubble.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WeftConfigProvider } from './src/context/WeftConfigContext';
import { HomeScreen } from './src/surfaces/HomeScreen';
import { ControlCenterScreen } from './src/surfaces/ControlCenterScreen';

// ---------------------------------------------------------------------------
// Animation config
// ---------------------------------------------------------------------------

const SPRING_OPEN: Animated.SpringAnimationConfig = {
  toValue: 1,
  tension: 140,
  friction: 18,
  useNativeDriver: true,
};

const SPRING_CLOSE: Animated.SpringAnimationConfig = {
  toValue: 0,
  tension: 160,
  friction: 20,
  useNativeDriver: true,
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App(): React.JSX.Element {
  const animValue = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  const openControlCenter = useCallback(() => {
    setIsOpen(true);
    Animated.spring(animValue, SPRING_OPEN).start();
  }, [animValue]);

  const closeControlCenter = useCallback(() => {
    Animated.spring(animValue, SPRING_CLOSE).start(() => {
      setIsOpen(false);
    });
  }, [animValue]);

  // Close the panel on back press when it is open.
  // HomeScreen's own BackHandler also returns true (prevents launcher exit)
  // but this one runs first since it is registered later in the tree.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isOpen) {
        closeControlCenter();
        return true; // consumed — don't propagate
      }
      return false; // let HomeScreen's handler take it
    });
    return () => sub.remove();
  }, [isOpen, closeControlCenter]);

  return (
    <SafeAreaProvider>
      <WeftConfigProvider>
        <View style={styles.root}>
          <HomeScreen onOpenControlCenter={openControlCenter} />
          <ControlCenterScreen
            animValue={animValue}
            onDismiss={closeControlCenter}
            isOpen={isOpen}
          />
        </View>
      </WeftConfigProvider>
    </SafeAreaProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
