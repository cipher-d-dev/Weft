/**
 * Weft — App Root
 *
 * Architecture:
 *
 *   SafeAreaProvider
 *     WeftConfigProvider
 *       ── if hasOnboarded === null ──────────────────
 *          SplashView (dark bg only, no flash while AsyncStorage resolves)
 *       ── if hasOnboarded === false ─────────────────
 *          OnboardingScreen (full-screen, zIndex 999)
 *       ── if hasOnboarded === true ──────────────────
 *          View (flex:1, relative)
 *            HomeScreen          ← receives onOpenControlCenter
 *            ControlCenterScreen ← absolute overlay, driven by animValue
 *            CustomizationScreen ← slide-up drawer, driven by drawerAnimValue
 *
 * hasOnboarded state:
 *   null   → still resolving AsyncStorage (show silent splash)
 *   false  → first launch, show OnboardingScreen
 *   true   → returning user, show normal launcher
 *
 * Onboarding gate key: 'weft:hasOnboarded' (value '1' = completed)
 *
 * Control Center open/close state lives here so the overlay sits above the
 * entire HomeScreen in the React tree, not nested inside it.
 *
 * animValue (0 = closed, 1 = open) is owned here and passed to each overlay.
 * Back button is handled inside HomeScreen for normal launcher behaviour;
 * when an overlay is open its BackHandler closes it first.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  NativeModules,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeftConfigProvider } from './src/context/WeftConfigContext';
import { HomeScreen } from './src/surfaces/HomeScreen';
import { ControlCenterScreen } from './src/surfaces/ControlCenterScreen';
import { CustomizationScreen } from './src/surfaces/CustomizationScreen';
import { OnboardingScreen, ONBOARDING_KEY } from './src/surfaces/OnboardingScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAppState } from './src/hooks/useAppState';

const { SetDefaultLauncher } = NativeModules;

// ---------------------------------------------------------------------------
// Animation config (shared spring presets)
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
// LauncherRoot — inner component so hooks (useAppState) can be called
// ---------------------------------------------------------------------------

function LauncherRoot({
  openControlCenter,
  closeControlCenter,
  animValue,
  isOpen,
  openDrawer,
  closeDrawer,
  drawerAnimValue,
  isDrawerOpen,
}: {
  openControlCenter: () => void;
  closeControlCenter: () => void;
  animValue: Animated.Value;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  drawerAnimValue: Animated.Value;
  isDrawerOpen: boolean;
}) {
  const { justResumed } = useAppState();

  return (
    <View style={styles.root}>
      <ErrorBoundary name="Home">
        <HomeScreen
          onOpenControlCenter={openControlCenter}
          onOpenCustomization={openDrawer}
          resumeKey={justResumed ? Date.now() : 0}
        />
      </ErrorBoundary>
      <ErrorBoundary name="ControlCenter">
        <ControlCenterScreen
          animValue={animValue}
          onDismiss={closeControlCenter}
          isOpen={isOpen}
        />
      </ErrorBoundary>
      <ErrorBoundary name="Customization">
        <CustomizationScreen
          animValue={drawerAnimValue}
          onDismiss={closeDrawer}
          isOpen={isDrawerOpen}
        />
      </ErrorBoundary>
    </View>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App(): React.JSX.Element {
  // ── Onboarding gate ───────────────────────────────────────────────────────
  // null  = AsyncStorage check in-flight (show silent splash)
  // false = first launch → show OnboardingScreen
  // true  = returning user → show full launcher
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(value => {
        const onboarded = value === '1';
        setHasOnboarded(onboarded);

        // For returning users: silently check if Weft is still the default.
        // If the user changed it, offer to re-set it. No alert on first launch
        // (onboarding handles that via handleOnboardingComplete).
        if (onboarded && SetDefaultLauncher) {
          SetDefaultLauncher.isDefaultLauncher().then((isDefault: boolean) => {
            if (!isDefault) {
              Alert.alert(
                'Weft is not your default launcher',
                'Press Home and select Weft to make it your home screen.',
                [
                  {
                    text: 'Open Settings',
                    onPress: () => SetDefaultLauncher.requestDefaultLauncher(),
                  },
                  { text: 'Dismiss', style: 'cancel' },
                ],
              );
            }
          }).catch(() => { /* non-fatal */ });
        }
      })
      .catch(() => {
        setHasOnboarded(true);
      });
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    // OnboardingScreen has already written the AsyncStorage key and dispatched
    // setParadigm. We just flip the local gate so App re-renders to the
    // normal launcher view.
    setHasOnboarded(true);

    // After onboarding, check if Weft is set as the default launcher and
    // prompt the user if not. This is what makes pressing Home go to Weft.
    if (SetDefaultLauncher) {
      SetDefaultLauncher.isDefaultLauncher().then((isDefault: boolean) => {
        if (!isDefault) {
          Alert.alert(
            'Set as Default Launcher',
            'To use Weft as your home screen, set it as your default launcher.',
            [
              {
                text: 'Set as Default',
                onPress: () => SetDefaultLauncher.requestDefaultLauncher(),
              },
              { text: 'Later', style: 'cancel' },
            ],
          );
        }
      }).catch(() => { /* non-fatal */ });
    }
  }, []);

  // ── Control Center ────────────────────────────────────────────────────────
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

  // ── Customization Drawer ──────────────────────────────────────────────────
  const drawerAnimValue = useRef(new Animated.Value(0)).current;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    Animated.spring(drawerAnimValue, SPRING_OPEN).start();
  }, [drawerAnimValue]);

  const closeDrawer = useCallback(() => {
    Animated.spring(drawerAnimValue, SPRING_CLOSE).start(() => {
      setIsDrawerOpen(false);
    });
  }, [drawerAnimValue]);

  // ── Back handler — only active when the launcher is visible ───────────────
  // Drawer takes priority (higher z-index) over Control Center.
  useEffect(() => {
    // Don't intercept back while onboarding or splash is shown.
    if (!hasOnboarded) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isDrawerOpen) {
        closeDrawer();
        return true;
      }
      if (isOpen) {
        closeControlCenter();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasOnboarded, isOpen, isDrawerOpen, closeControlCenter, closeDrawer]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaProvider>
      <WeftConfigProvider>
        {/* ── Splash: AsyncStorage check in-flight ────────────────────── */}
        {hasOnboarded === null && (
          <View style={styles.splash} />
        )}

        {/* ── Onboarding: first launch ────────────────────────────────── */}
        {hasOnboarded === false && (
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        )}

        {/* ── Normal launcher ─────────────────────────────────────────── */}
        {hasOnboarded === true && (
          <LauncherRoot
            openControlCenter={openControlCenter}
            closeControlCenter={closeControlCenter}
            animValue={animValue}
            isOpen={isOpen}
            openDrawer={openDrawer}
            closeDrawer={closeDrawer}
            drawerAnimValue={drawerAnimValue}
            isDrawerOpen={isDrawerOpen}
          />
        )}
      </WeftConfigProvider>
    </SafeAreaProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  /** Full-screen dark splash — prevents a white flash while AsyncStorage loads. */
  splash: {
    flex: 1,
    backgroundColor: '#080C12',
  } as ViewStyle,

  /** Root container for the active launcher screens. */
  root: {
    flex: 1,
  } as ViewStyle,
});
