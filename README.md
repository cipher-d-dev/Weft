# Weft

A modular, accessibility-centered Android launcher built with React Native. Weft demonstrates a three-paradigm design system (Skeuomorphic, Glass, Minimal) composable with four independent accessibility profiles (Motor, Vision, Cognitive, One-Handed) through a live token architecture.

---

## Prerequisites

- **Node.js** ≥ 20.19.4
- **Java JDK** 17 (Android builds require JDK 17 exactly — not 21)
- **Android Studio** with SDK Platform 34 and Build Tools 34.0.0
- **Android NDK** 26.1.10909125 (required by react-native-launcher-kit)
- An Android device or emulator running API 29+ (Android 10+)

Verify your environment first:

```sh
npx react-native doctor
```

---

## Setup

### 1. Clone and install

```sh
git clone <repo-url>
cd weft
npm install
```

`@react-native-async-storage/async-storage` and `@react-native-community/blur` are native modules — they require a full native build. Metro-only (`npm start`) is insufficient after installing these.

### 2. Build and run on Android

With a device connected or emulator running:

```sh
npm run android
```

This compiles the native layer, installs the APK, and starts Metro. The first build takes 3–5 minutes. Subsequent builds are faster.

### 3. Set Weft as your default launcher (Android)

After the app is installed:

1. Press the **Home button** on your device
2. Android will show a "Choose default launcher" dialog
3. Select **Weft**
4. Tap **Always**

If the dialog doesn't appear, go to **Settings → Apps → Default apps → Home app** and select Weft from the list.

To reset to your original launcher: **Settings → Apps → Default apps → Home app** → select your previous launcher.

---

## Project structure

```
src/
  tokens/         # Three-tier design token system
    primitives.ts   # Raw values (colors, spacing, typography, shadows)
    semantics.ts    # Typed AppSemantics interface — the UI contract
    paradigms.ts    # Three paradigm factories (skeuo, glass, minimal)
    profiles.ts     # Four accessibility profile deltas
  compose/
    compose.ts      # Pipeline: paradigm + profiles → AppSemantics
  context/
    WeftConfigContext.tsx  # Live config state + AsyncStorage persistence
    types.ts               # Paradigm, AccessibilityProfile, WeftConfig
  surfaces/
    HomeScreen.tsx          # App grid, dock, clock widget
    ControlCenterScreen.tsx # Pull-down control panel
    CustomizationScreen.tsx # Paradigm picker + profile toggles
    OnboardingScreen.tsx    # First-launch paradigm selection
  components/               # Atom library (Tile, Toggle, Slider, AppIcon…)
  hooks/
    useWeftConfig.ts        # Typed context hook
    useInstalledApps.ts     # Device app list + install/remove listener
```

---

## Demo script

Full demo flow — all transitions run on device, no mock data.

### Setup (30 seconds before demo)

1. Ensure Weft is set as the default launcher
2. Press Home to confirm Weft loads
3. If onboarding appears, select **Skeuomorphic** and tap **Get Started**
4. Confirm the home screen shows the app grid and live clock

---

### Step 1 — Home screen (Skeuomorphic)

**Show:** The launcher home screen. Point out:
- Live clock (top left, updates every second)
- Real installed app icons pulled from the device
- Dock at the bottom with pinned apps + Customise gear

**Say:** *"This is Weft in Skeuomorphic mode — warm, tactile, depth-driven. Everything you see is driven by a token system, not hardcoded styles."*

---

### Step 2 — Control Center

**Action:** Swipe down from the top of the screen.

**Show:** Control Center slides in with 6 control tiles (Wi-Fi, Bluetooth, etc.) and 2 sliders (Brightness, Volume). Tap a tile to toggle it.

**Say:** *"Standard launcher controls. The tint and layout are all token-driven."*

**Action:** Swipe up or tap the scrim to dismiss.

---

### Step 3 — Open Customization

**Action:** Tap the **⚙ Customise** button in the dock.

**Show:** The Customization screen slides up, showing all three paradigms as live miniature previews side by side — each rendering its own clock, icon grid, and dock in its own visual language.

**Say:** *"This is the thesis surface. Three live previews — Skeuomorphic, Glass, Minimal — each composed from the same token architecture. Nothing is duplicated."*

---

### Step 4 — Switch to Glass

**Action:** Tap the **Glass** preview card.

**Show:** The Glass card springs to full scale. The preview shows a dark wallpaper, frosted dock, white labels.

**Say:** *"Glass: frosted translucency, cool blues, 22-pixel radii. The whole visual system — tile backgrounds, section headers, dock, shadows — switches through a single token recomposition."*

**Action:** Tap **Apply**.

**Show:** Home screen transitions to Glass paradigm — dark background, frosted dock, white icon labels.

---

### Step 5 — Toggle Vision profile

**Action:** Open Customise again. With Glass selected, tap **Vision** in the Accessibility section.

**Show:** The Glass preview card updates — notice the dock tint deepens, section headers change.

**Say:** *"Vision profile: larger type, maximum contrast. On Glass specifically there's a cascade rule — the container tint deepens to 92% opacity and decorative chrome (chips, plates) clears to zero, guaranteeing WCAG-grade contrast without a separate design."*

**Action:** Apply.

---

### Step 6 — Toggle One-Handed

**Action:** Open Customise, toggle **One-Handed** (Vision still on).

**Show:** Preview card shows the icon grid offset toward the right (thumb zone).

**Say:** *"One-Handed shifts the grid toward the thumb zone. Profiles compose — Vision + One-Handed + Glass all apply simultaneously, each delta layering on top of the previous one in fixed order."*

**Action:** Apply. Show the actual home screen with the grid shifted right.

---

### Step 7 — Return to Skeuomorphic

**Action:** Open Customise, tap **Skeuomorphic**, deselect all profiles, Apply.

**Show:** Home screen returns to warm parchment, soft shadows, amber accent.

**Say:** *"The entire UI recomposes — same components, same structure, completely different material language. No conditionals inside any component."*

---

### Step 8 — Minimal

**Action:** Open Customise, tap **Minimal**, Apply.

**Show:** Near-black background, flat tiles, no shadows, sage green accent.

**Say:** *"Minimal: flat, high-contrast, zero elevation. Same compose pipeline, different factory output."*

---

### Demo complete

Total time: ~4 minutes.

---

## Fallback path

If the device is unavailable or the build fails:

1. Open the Figma prototype: *(link to be added)*
2. The prototype mirrors the demo flow above — each step has a dedicated frame
3. The token architecture and compose pipeline are fully visible in code regardless of device

---

## Troubleshooting

**Build fails with NDK error**
```
Android NDK version 26.1.10909125 required
```
In Android Studio: SDK Manager → SDK Tools → NDK (Side by side) → install 26.1.10909125.

**"Choose launcher" dialog doesn't appear**
The `HOME` intent filter in `AndroidManifest.xml` requires the app to be installed as a full APK (not via Expo Go or a dev build missing the manifest flag). Run `npm run android` directly.

**Blur effect not visible on Glass**
`@react-native-community/blur` requires a full native rebuild after `npm install`. Run `npm run android` (not just Metro restart). On emulators, blur may render differently than physical devices — this is expected.

**Icons show as blank on first launch**
`QUERY_ALL_PACKAGES` permission is declared in `AndroidManifest.xml`. On Android 11+ a system dialog may appear requesting permission — grant it and return to the launcher.

**AsyncStorage data persists between test runs**
To reset onboarding: clear app data in Settings → Apps → Weft → Storage → Clear Data.

---

## Architecture notes

The central insight of Weft's architecture:

```
compose(paradigm, activeProfiles) → AppSemantics
```

Every component reads exclusively from `AppSemantics` via `useWeftConfig().semantics`. No component checks which paradigm is active or which profiles are on. The visual output of the entire app is determined by a single pure function call.

This means:
- Adding a new paradigm = writing one factory function
- Adding a new accessibility profile = writing one delta function  
- Adding a new component = reading from existing semantic tokens

The Glass × Vision cascade is the only exception — it's an intersection rule in `compose.ts` that fires when both conditions are true, and it's documented as such.
