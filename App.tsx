/**
 * Weft — App Root
 *
 * Phase 4: SafeAreaProvider wraps the entire tree so every surface can read
 * native insets via useSafeAreaInsets(). WeftConfigProvider sits inside it
 * so context consumers can also read insets if needed.
 *
 * HomeScreen is the live launcher surface from Phase 4+.
 * AtomTestScreen is kept importable for dev reference.
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WeftConfigProvider } from './src/context/WeftConfigContext';
import { HomeScreen } from './src/surfaces/HomeScreen';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <WeftConfigProvider>
        <HomeScreen />
      </WeftConfigProvider>
    </SafeAreaProvider>
  );
}
