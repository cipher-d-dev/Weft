/**
 * Weft — OnboardingScreen
 *
 * Shown on first launch only (gated by AsyncStorage 'weft:hasOnboarded').
 * Lets the user pick their preferred paradigm before entering the launcher.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │  (safe-area top)                                │
 *   │                                                 │
 *   │       Weft                 ← large display text │
 *   │  Your launcher, your way   ← tagline            │
 *   │                                                 │
 *   │  ┌──────┐  ┌──────┐  ┌──────┐                  │
 *   │  │Skeuo │  │Glass │  │ Min. │  ← PreviewCards  │
 *   │  └──────┘  └──────┘  └──────┘                  │
 *   │   Name+desc per card                            │
 *   │                                                 │
 *   │  ┌─────────────────────────────────┐            │
 *   │  │         Get Started             │            │
 *   │  └─────────────────────────────────┘            │
 *   │  (safe-area bottom)                             │
 *   └────────────────────────────────────────────────┘
 *
 * On completion:
 *   1. Fade-out animation runs
 *   2. setParadigm(selectedParadigm) is dispatched to WeftConfigContext
 *   3. AsyncStorage key 'weft:hasOnboarded' is written to '1'
 *   4. onComplete() is called — App.tsx transitions to the launcher
 *
 * Animations (all useNativeDriver: true):
 *   1. Logo letter-by-letter reveal — each letter fades + slides up with 60ms stagger
 *   2. Tagline fade-up — delayed 300ms after mount
 *   3. Cards stagger-in — 3 cards stagger in from below with a slight overshoot
 *   4. CTA button fade-in — delayed 600ms after mount
 *   5. Background shimmer — a slow-pulsing translucent circle at center-top
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { PreviewCard } from '../components/PreviewCard';
import type { Paradigm } from '../context/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** AsyncStorage key that gates whether onboarding runs. */
export const ONBOARDING_KEY = 'weft:hasOnboarded';

/** Deep dark background — independent of any paradigm token. */
const BG_COLOR = '#080C12';

const { width: SCREEN_W } = Dimensions.get('window');

/** Letters of the wordmark animated individually. */
const LOGO_LETTERS = ['W', 'e', 'f', 't'];

/**
 * Paradigm descriptors shown beneath each preview card.
 * Keep descriptions to ≤ 3 words so they fit the card width.
 */
const PARADIGMS: {
  id: Paradigm;
  label: string;
  description: string;
  /** accent.primary from paradigms.ts — used for the CTA button tint. */
  accentColor: string;
  /** accent.onAccent text color for the CTA button. */
  onAccentColor: string;
}[] = [
  {
    id: 'skeuo',
    label: 'Skeuomorphic',
    description: 'Warm & tactile',
    accentColor: '#F5A623',   // accentAmber[500]
    onAccentColor: '#FFFFFF',
  },
  {
    id: 'glass',
    label: 'Glass',
    description: 'Frosted & airy',
    accentColor: '#2196F3',   // accentBlue[500]
    onAccentColor: '#FFFFFF',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Flat & focused',
    accentColor: '#4CAF50',   // accentSage[500]
    onAccentColor: '#FFFFFF',
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnboardingScreenProps = {
  /** Called after the fade-out animation completes. App.tsx advances state. */
  onComplete: () => void;
};

// ---------------------------------------------------------------------------
// ParadigmOption — one tappable preview card + label below it
// ---------------------------------------------------------------------------

const ParadigmOption = memo(function ParadigmOption({
  id,
  label,
  description,
  accentColor,
  isSelected,
  onSelect,
  entryOpacity,
  entryTranslateY,
}: {
  id: Paradigm;
  label: string;
  description: string;
  accentColor: string;
  isSelected: boolean;
  onSelect: (p: Paradigm) => void;
  /** Animated.Value driven by the cards stagger-in animation (opacity). */
  entryOpacity: Animated.Value;
  /** Animated.Value driven by the cards stagger-in animation (translateY). */
  entryTranslateY: Animated.Value;
}) {
  // Spring-driven scale: selected card is full size; deselected cards shrink.
  // Mirrors the exact pattern used in CustomizationScreen's ParadigmCard.
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0.86)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1 : 0.86,
      tension: 200,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    // Outer Animated.View drives the stagger entry (opacity + translateY)
    <Animated.View
      style={[
        styles.optionWrapper,
        {
          opacity: entryOpacity,
          transform: [{ translateY: entryTranslateY }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onSelect(id)}
        activeOpacity={0.85}
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${label}: ${description}. ${isSelected ? 'Selected.' : 'Tap to select.'}`}
        style={styles.optionTouchable}
      >
        {/* Inner Animated.View drives the spring scale on selection */}
        <Animated.View
          style={[styles.optionInner, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Preview card */}
          <PreviewCard paradigm={id} activeProfiles={[]} />

          {/* Selection ring — visible only on the active card */}
          {isSelected && (
            <View
              style={[styles.selectionRing, { borderColor: accentColor }]}
            />
          )}

          {/* Label */}
          <Text
            style={[
              styles.paradigmLabel,
              {
                color: isSelected ? accentColor : 'rgba(255,255,255,0.5)',
                fontWeight: isSelected ? '700' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>

          {/* Description */}
          <Text
            style={[styles.paradigmDesc, { color: 'rgba(255,255,255,0.35)' }]}
            numberOfLines={1}
          >
            {description}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// OnboardingScreen
// ---------------------------------------------------------------------------

export const OnboardingScreen = memo(function OnboardingScreen({
  onComplete,
}: OnboardingScreenProps) {
  const { setParadigm } = useWeftConfig();
  const insets = useSafeAreaInsets();

  // Selected paradigm — default skeuo per spec
  const [selectedParadigm, setSelectedParadigm] = useState<Paradigm>('skeuo');

  // Screen-level fade-out animation (0 = transparent, 1 = fully visible)
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ── Animation values ───────────────────────────────────────────────────

  // 1. Logo letter-by-letter: one opacity + translateY pair per letter
  const letterAnims = useRef(
    LOGO_LETTERS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(12),
    }))
  ).current;

  // 2. Tagline fade-up
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(8)).current;

  // 3. Cards stagger-in — start at translateY +40 (off-screen downward)
  const cardAnims = useRef(
    PARADIGMS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(40),
    }))
  ).current;

  // 4. CTA button fade-in
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  // 5. Background shimmer — pulses between 0.04 and 0.10
  const shimmerOpacity = useRef(new Animated.Value(0.04)).current;

  // ── Mount animations ───────────────────────────────────────────────────

  useEffect(() => {
    // ── 1. Logo letters stagger-in ──────────────────────────────────────
    const letterAnimations = letterAnims.map(({ opacity, translateY }) =>
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(60, letterAnimations).start();

    // ── 2. Tagline fade-up — delayed 300ms ──────────────────────────────
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ── 3. Cards stagger-in — delayed 180ms ─────────────────────────────
    const cardAnimations = cardAnims.map(({ opacity, translateY }) =>
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.sequence([
      Animated.delay(180),
      Animated.stagger(100, cardAnimations),
    ]).start();

    // ── 4. CTA button fade-in — delayed 600ms ───────────────────────────
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(ctaOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // ── 5. Background shimmer — infinite loop ───────────────────────────
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 0.10,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.04,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();

    // Clean up the loop on unmount
    return () => {
      shimmerLoop.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive the current accent + onAccent from the selected paradigm entry
  const selectedEntry =
    PARADIGMS.find(p => p.id === selectedParadigm) ?? PARADIGMS[0];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectParadigm = useCallback((p: Paradigm) => {
    setSelectedParadigm(p);
  }, []);

  const handleGetStarted = useCallback(async () => {
    // 1. Apply the chosen paradigm immediately so the launcher loads correctly
    setParadigm(selectedParadigm);

    // 2. Persist onboarding completion flag
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // Non-fatal: if storage write fails we still proceed. On next launch the
      // onboarding will show again, which is acceptable graceful degradation.
    }

    // 3. Fade out the onboarding screen, then call onComplete
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  }, [selectedParadigm, setParadigm, fadeAnim, onComplete]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={[styles.root, { opacity: fadeAnim }]}
      accessible={false}
    >
      {/* ── 5. Background shimmer circle ─────────────────────────────── */}
      <Animated.View
        style={[
          styles.shimmerCircle,
          { opacity: shimmerOpacity },
        ]}
        pointerEvents="none"
      />

      {/* ── Top section — logo + tagline ───────────────────────────────── */}
      <View
        style={[
          styles.topSection,
          { paddingTop: insets.top + 32 },
        ]}
      >
        {/*
         * 1. Logo: 'Weft' rendered letter-by-letter in a row.
         * Each Animated.Text has its own opacity + translateY animation.
         */}
        <View style={styles.logoRow} accessible accessibilityLabel="Weft">
          {LOGO_LETTERS.map((letter, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.logoText,
                {
                  opacity: letterAnims[index].opacity,
                  transform: [
                    { translateY: letterAnims[index].translateY },
                  ],
                },
              ]}
              // Prevent individual letters from being read by screen readers
              // (the accessible View above provides the full label)
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {letter}
            </Animated.Text>
          ))}
        </View>

        {/* 2. Tagline fade-up */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          Your launcher, your way
        </Animated.Text>
      </View>

      {/* ── Middle section — paradigm preview cards ────────────────────── */}
      <View style={styles.cardsSection}>
        {PARADIGMS.map((p, index) => (
          <ParadigmOption
            key={p.id}
            id={p.id}
            label={p.label}
            description={p.description}
            accentColor={p.accentColor}
            isSelected={selectedParadigm === p.id}
            onSelect={handleSelectParadigm}
            entryOpacity={cardAnims[index].opacity}
            entryTranslateY={cardAnims[index].translateY}
          />
        ))}
      </View>

      {/* ── Bottom section — CTA button ────────────────────────────────── */}
      <View
        style={[
          styles.bottomSection,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* 4. CTA fade-in wrapper */}
        <Animated.View style={{ opacity: ctaOpacity }}>
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.85}
            style={[
              styles.ctaButton,
              { backgroundColor: selectedEntry.accentColor },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Get started with selected launcher style"
          >
            <Text
              style={[
                styles.ctaButtonText,
                { color: selectedEntry.onAccentColor },
              ]}
            >
              Get Started
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    zIndex: 999,
    flexDirection: 'column',
    justifyContent: 'space-between',
  } as ViewStyle,

  // ── Background shimmer ────────────────────────────────────────────────────

  /**
   * Simulates a radial gradient using a large circle with full borderRadius.
   * Positioned absolutely at center-top, partially above the screen edge.
   * The Animated.loop pulses opacity between 0.04 and 0.10.
   */
  shimmerCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4A90D9',
    // Center horizontally, offset upward so only the bottom arc is visible
    top: -50,
    alignSelf: 'center',
    // Prevent this decorative element from blocking touch events
  } as ViewStyle,

  // ── Top ───────────────────────────────────────────────────────────────────

  topSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  /**
   * Row container for the individual letter Animated.Text components.
   * flexDirection:'row' + baseline alignment keeps the wordmark cohesive.
   */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  /** Large display wordmark — each letter rendered as a separate Animated.Text. */
  logoText: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 76,
  },

  tagline: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // ── Middle ────────────────────────────────────────────────────────────────

  cardsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    // Give each card room to scale without clipping neighbours
    paddingVertical: 16,
  },

  optionWrapper: {
    flex: 1,
    alignItems: 'center',
    // Allow the spring-scaled card to breathe without clipping
    overflow: 'visible',
  },

  /** Touchable fills the full optionWrapper area. */
  optionTouchable: {
    alignItems: 'center',
    width: '100%',
  },

  optionInner: {
    alignItems: 'center',
  },

  /** Selection ring overlay — exact dimensions match PreviewCard (148×268). */
  selectionRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Match PreviewCard height constant
    height: 268,
    // Match PreviewCard width constant; center relative to optionInner
    width: 148,
    alignSelf: 'center',
    borderRadius: 18,
    borderWidth: 2.5,
  },

  paradigmLabel: {
    marginTop: 10,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.1,
    // Prevent long labels from pushing layout
    maxWidth: SCREEN_W / 3 - 16,
  },

  paradigmDesc: {
    marginTop: 2,
    fontSize: 10,
    textAlign: 'center',
    maxWidth: SCREEN_W / 3 - 16,
  },

  // ── Bottom ────────────────────────────────────────────────────────────────

  bottomSection: {
    paddingHorizontal: 24,
  },

  ctaButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    // Subtle shadow so the button lifts off the dark bg
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  ctaButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
