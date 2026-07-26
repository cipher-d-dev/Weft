# Weft — React Native Implementation Phases

Weft is a modular, accessibility-centered Android launcher shell. This document breaks the build into self-contained phases. Each phase ends in something runnable and demonstrable. Later phases build on earlier ones but do not require them to be fully polished — the goal is a working vertical slice at every stage.

---

## Phase 0 — Project Bootstrap & Launcher Shell ✅

**Status:** Complete  
**Goal:** A bare React Native CLI project that Android recognizes as a launcher. When you press the home button, Weft appears.

### Tasks
- [x] Init React Native CLI project (React Native 0.86.0, TypeScript)
- [x] Configure `AndroidManifest.xml`:
  - Added `HOME`, `DEFAULT`, `LAUNCHER` intent-filter categories to `MainActivity`
  - `launchMode="singleTask"` confirmed, `taskAffinity=""` added
- [x] Verify the app appears in Android's "Choose default launcher" dialog
- [x] Set up folder structure:
  ```
  src/
    tokens/         # design token system
    surfaces/       # Home, ControlCenter, Customization
    components/     # atoms (Tile, Toggle, Slider, etc.)
    compose/        # paradigm factories + profile delta pipeline
    context/        # WeftConfigContext
    navigation/     # surface routing
    hooks/          # shared hooks
  ```
- [x] Set up TypeScript path aliases (`@tokens`, `@components`, `@surfaces`, etc.)
- [x] Add ESLint + Prettier with project conventions
- [x] `babel-plugin-module-resolver` wired for runtime alias resolution
- [x] **Android build patch applied** — `android/app/patch-graphicsConversions.gradle` patches the `graphicsConversions.h` prefab header to replace `std::format()` (unsupported in NDK libc++) with a `std::snprintf` equivalent. Applied via `apply from` in `android/app/build.gradle`. Patch survives cache clears and clean checkouts.

**Exit criteria:** ✅ Press home button → Weft loads. Build compiles cleanly with patch in place.

---

## Phase 1 — Token Architecture

**Status:** Complete ✅  
**Goal:** The full three-tier token system is in code, type-safe, and composable. No UI yet — just the foundation everything else reads from.

---

### Design Direction — Modern & Premium

Every token decision must serve a **modern, premium feel** — the kind of tactile polish you see in high-end iOS apps and flagship Material You launchers. Key principles:

- **Restraint over decoration.** Surfaces breathe. Whitespace is intentional. Never fill what can be left open.
- **Depth through subtlety.** Shadows are soft and layered, not hard-edged. Glass tints carry real frosted-glass energy (blur + tint, not just opacity).
- **Type as UI.** Typography is a first-class design element — sizing ratios are harmonious (1.25 Major Third scale), weights shift meaning (400 body, 600 label, 700 hero), letterspacing is tight on display sizes.
- **Color discipline.** The palette is tight: 2–3 accent hues max per paradigm, with neutral scaffolding carrying most of the UI weight.
- **Motion earns its place.** Transitions are fast (200–280ms) and physically grounded (spring curves, not ease-in-out). Nothing animates for decoration.

---

### Custom Font Loading

Weft loads its own typefaces rather than relying on system fonts. This is non-negotiable for premium feel — system fonts are inconsistent across Android devices and OEM skins.

**Font choices (to be confirmed during implementation):**
- **Display / Hero:** [Canela](https://commercialtype.com/catalog/canela) or substitute with **Fraunces** (open source, variable, optical-size axis) — used for paradigm names and large labels
- **UI / Labels:** **Inter** (open source, variable, excellent hinting at small sizes) — used for tile labels, section headers, status chips
- **Mono (optional):** **JetBrains Mono** or **IBM Plex Mono** — for any data readouts (e.g., time, battery %)

**Implementation tasks:**
- [x] Add font files to `android/app/src/main/assets/fonts/` (RN's native font resolution path)
- [x] Register fonts in `src/tokens/primitives.ts` under a `fontFamilies` map:
  ```ts
  fontFamilies: {
    display: 'Fraunces-VariableFont_SOFT,WONK,opsz,wght',
    ui: 'Inter-VariableFont_opsz,wght',
    mono: 'JetBrainsMono-Regular',
  }
  ```
- [x] All `Typography` primitive tokens reference `fontFamilies` — never hardcode a font string outside primitives
- [ ] Validate fonts load on device before wiring into semantic layer (render a quick test in `App.tsx`)

---

### Tasks

**Tier 1 — Primitives (`src/tokens/primitives.ts`)**
- [x] Color ramps (glass tints, skeuo creams, minimal neutrals, semantic colors)
- [x] Spacing scale (4px base grid)
- [x] Corner radii (16px default, 22px glass variant)
- [x] Elevation / shadow definitions
- [x] Opacity scale
- [x] Typography scale (size, weight, line-height, letter-spacing) — sizes follow a **1.25 Major Third** modular scale; all values reference `fontFamilies`

**Tier 2 — Semantic layer (`src/tokens/semantics.ts`)**
- [x] Typed `AppSemantics` interface with nested groups:
  - `surface.home`, `surface.controlCenter`, `surface.customization`
  - `component.tile`, `component.slider`, `component.toggle`, `component.sectionHeader`, `component.widgetCard`, `component.dock`, `component.appIcon`
  - `state.tile` (enabled, selected, pressed, disabled, focused)
- [x] All fields are primitive references, never raw values

**Tier 3 — Paradigm factories (`src/tokens/paradigms.ts`)**
- [x] `semanticsSkeuo(): AppSemantics`
- [x] `semanticsGlass(): AppSemantics` — includes container tint token (60% opacity, 40px blur), 22px tile radius
- [x] `semanticsMinimal(): AppSemantics`

**Profile deltas (`src/tokens/profiles.ts`)**
- [x] `applyMotor(sem: AppSemantics): AppSemantics` — enlarged touch targets, wider spacing
- [x] `applyVision(sem: AppSemantics): AppSemantics` — larger type, higher contrast
- [x] `applyCognitive(sem: AppSemantics): AppSemantics` — reduced visual noise, simplified layouts
- [x] `applyOneHanded(sem: AppSemantics): AppSemantics` — thumb-zone clustering

**Compose pipeline (`src/compose/compose.ts`)**
- [x] `compose(paradigm, activeProfiles): AppSemantics`
- [x] Fixed delta order: Motor → Vision → Cognitive → One-Handed
- [x] Intersection cascade rule: if paradigm is `glass` and `vision` is active → reduce `surface.sectionHeader.plate` opacity to ~0, set `component.tile.labelChip` to transparent

**Config types (`src/context/types.ts`)**
- [x] `Paradigm = 'glass' | 'skeuo' | 'minimal'`
- [x] `AccessibilityProfile = 'motor' | 'vision' | 'cognitive' | 'oneHanded'`
- [x] `WeftConfig = { paradigm: Paradigm; activeProfiles: AccessibilityProfile[] }`

**Exit criteria:** `compose('glass', ['vision'])` returns a semantically correct `AppSemantics` object with the cascade rule applied. Unit tests pass for all paradigm factories and profile deltas.

---

## Phase 2 — Global State & Context ✅

**Status:** Complete  
**Goal:** Any component in the tree can read the current composed token set and dispatch paradigm/profile changes. Live recomposition works end-to-end.

### Tasks
- [x] `WeftConfigContext` with `React.createContext`
- [x] `WeftConfigProvider` wrapping the app root:
  - [x] Holds `WeftConfig` state
  - [x] Calls `compose()` on every state change via `useMemo`
  - [x] Exposes composed `AppSemantics` + dispatch functions
- [x] `useWeftConfig()` hook — returns `{ semantics, paradigm, activeProfiles, setParadigm, toggleProfile }`
- [x] Wire provider into `App.tsx`
- [x] Smoke test UI: paradigm switcher + profile toggles + live token readout card + font specimen

**Exit criteria:** ✅ Tapping a paradigm or profile button re-renders with updated token values. Live token readout card shows glassContainer tint deepening and chip/plate backgrounds clearing when Glass × Vision is active.

---

## Phase 3 — Atom Component Library ✅

**Status:** Complete  
**Goal:** The shared atom set that all three surfaces reuse. Each atom reads exclusively from `useWeftConfig().semantics` — zero inline styles, zero paradigm-specific code paths inside atoms.

### Atoms to build
- [x] `Tile` — icon + label + status chip. Props: `icon`, `label`, `status`, `state`. Renders as a specimen (no props) for the Customization surface.
- [x] `Toggle` — binary on/off. Reads Motor profile target size from semantics.
- [x] `Slider` — range input. Skeuo gets inset gradient fill via semantic binding, not inline override.
- [x] `SectionHeader` — label + optional backing plate. Plate opacity comes from semantics (drops to ~0 under Glass × Vision).
- [x] `WidgetCard` — container for widget content on Home.
- [x] `AppIcon` — paradigm-invariant. Renders passed icon source identically across all paradigms. No token-driven styling on the icon itself, only on the surrounding shadow/badge chrome.
- [x] `PreviewCard` — miniature live surface preview for the Customization screen.
- [x] `Dock` — bottom app tray container.

### Validation
- [x] Render each atom across all three paradigms in a dev-only `AtomTestScreen`
- [x] Confirm no atom contains paradigm-specific conditional logic
- [x] Confirm `AppIcon` renders identically across paradigm switches

### Barrel exports
- [x] `src/components/index.ts` exports all 8 atoms
- [x] `src/surfaces/index.ts` exports `AtomTestScreen`
- [x] `App.tsx` wired: `WeftConfigProvider` → `AtomTestScreen`

**Exit criteria:** ✅ `AtomTestScreen` shows every atom in all three paradigms. Switching paradigm via a button updates all atoms simultaneously through token bindings alone.

---

## Phase 4 — Home Surface ✅

**Status:** Complete  
**Goal:** A working launcher home screen. App grid, dock, and widget cards render correctly across all three paradigms and all accessibility profile combinations.

### Tasks
- [x] Install `react-native-safe-area-context@4.14.1` — replaces broken RN `SafeAreaView` with `useSafeAreaInsets()` backed by native `WindowInsetsCompat`
- [x] Add `QUERY_ALL_PACKAGES` permission to `AndroidManifest.xml` (required for `InstalledApps.getSortedApps` on Android 11+)
- [x] `SafeAreaProvider` added to `App.tsx` root; `AtomTestScreen` migrated to `useSafeAreaInsets` + translucent `StatusBar`
- [x] `useInstalledApps` hook — fetches sorted app list, listens for install/removal events, exposes `refresh()`
- [x] Query installed apps via `react-native-launcher-kit` `InstalledApps.getSortedApps`
- [x] Render app grid with `AppIcon` atoms — `FlatList` with `numColumns` from `semantics.layout.gridColumns`
- [x] Render `Dock` with pinned apps (four fixed package shortcuts; skips uninstalled ones)
- [x] Render `WidgetCard` placeholder slot (static; dynamic widgets Phase 7)
- [x] One-Handed profile: asymmetric `paddingLeft`/`paddingRight` shifts grid toward `thumbSide`
- [x] Vision / Motor profiles: flow through semantics tokens automatically (label size, touch targets)
- [x] Handle back button — `BackHandler` returns `true`, preventing launcher exit
- [x] Glass paradigm fallback background (`#0B2438`) until Phase 7 wallpaper integration

### Notes
- Grid column count changes (Cognitive profile: 4 → 3) force a `FlatList` `key` prop remount to avoid column layout corruption
- Dock clearance accounts for `insets.bottom` so it clears the gesture nav bar on edge-to-edge displays
- `onPause`/`onResume` lifecycle not explicitly handled — RN's AppState API available in Phase 7 if needed for wallpaper refresh

**Exit criteria:** ✅ Weft as default launcher shows a real app grid. Switching paradigm live updates the Home chrome. Toggling One-Handed moves the grid into the thumb zone.

---

## Phase 5 — Control Center Surface

**Goal:** Pull-down control panel with toggles and sliders. The load-bearing test surface for the Glass × Vision cascade rule.

### Tasks
- Swipe-down gesture from the top of Home opens Control Center
- Render 6 control tiles: Wi-Fi, Bluetooth, Brightness, Volume, Do Not Disturb, Flashlight (representative set)
- `Tile` atoms in on/off states drive the toggle controls
- `Slider` atoms drive Brightness and Volume
- Glass paradigm: container tint plate (60% opacity, 40px blur) sits between wallpaper and tiles
- Glass × Vision: container tint deepens to 92%, `SectionHeader` plate drops to ~0, `Tile` label chips become transparent — cascade rule fires automatically from compose pipeline
- Animate open/close with a slide + fade transition

**Exit criteria:** Pull-down opens Control Center. Switching to Glass paradigm shows the tinted container. Toggling Vision on top of Glass triggers the cascade (plate disappears, chips clear, contrast is maintained). All readable at a glance.

---

## Phase 6 — Customization Surface

**Goal:** The thesis-proving screen. User picks a paradigm and toggles accessibility profiles. A live `PreviewCard` reflects the current composition in real time.

### Tasks
- Paradigm picker: three `Tile` atoms emptied of icon/label props, each rendered in its own paradigm as a pure material specimen
- Accessibility toggles: four `Toggle` atoms for Motor, Vision, Cognitive, One-Handed — independently switchable
- `PreviewCard`: live miniature of the Home surface reflecting the current `paradigm × activeProfiles` composition
- When Vision + One-Handed are both on, the preview shows text-scaled tiles clustered in the thumb zone
- Entry point: accessible from a Settings icon on the Home dock
- Smooth animated transitions on paradigm switch in the preview

**Exit criteria:** User can switch paradigm and toggle all four profiles. The PreviewCard updates live. The full demo flow from the doc (Skeuo → Glass → Glass+Vision → Glass+Vision+One-Handed → Skeuo+Vision+One-Handed) works end-to-end.

---

## Phase 7 — Integration, Polish & Demo Hardening

**Goal:** The full demo flow runs without interruption on a physical device. Fallback path is ready.

### Tasks
- End-to-end demo run: launch → Home (Skeuo) → Customization → switch Glass → toggle Vision → toggle One-Handed → return to Skeuo
- Performance pass: ensure paradigm switches and profile toggles have no visible frame drops (`InteractionManager`, memoization where needed)
- Blur validation on physical device (Glass paradigm blur can differ from emulator)
- Handle edge cases: no apps installed, accessibility service permissions, low-end device degraded blur
- Wallpaper integration (static wallpaper asset for demo; live wallpaper as stretch goal)
- Onboarding flow: first-launch screen showing paradigm picker before reaching Home
- Fallback path documented: if device unavailable, Figma prototype link is ready and script-mapped to the demo flow
- `README.md`: setup instructions, how to set as default launcher, demo script

**Exit criteria:** Full demo flow runs on a physical Android device without interruption. A second person can follow the README and run the demo independently.

---

## Stretch Goals (post-demo)

These are out of scope for the academic deliverable but worth tracking.

- **Live wallpaper**: dynamic wallpaper that reacts to paradigm (Glass gets a blur-heavy dark scene, Skeuo gets a warm paper texture, Minimal gets a solid neutral)
- **Widget system**: actual widget slots with resizable `WidgetCard` containers and a widget picker
- **Persistent config**: save `WeftConfig` to `AsyncStorage` so the last paradigm/profile choice survives app restarts
- **Tiling grid editor**: drag-to-resize app icon slots (analogous to the Linux tiling mechanism from the research)
- **iOS port**: the token architecture and compose pipeline are platform-agnostic; only the launcher manifest is Android-specific

---

## Phase Dependencies

```
Phase 0 (Bootstrap)
    └── Phase 1 (Tokens)
            └── Phase 2 (State/Context)
                    └── Phase 3 (Atoms)
                            ├── Phase 4 (Home)
                            ├── Phase 5 (Control Center)
                            └── Phase 6 (Customization)
                                        └── Phase 7 (Polish & Demo)
```

Phases 4, 5, and 6 can be worked in parallel once Phase 3 is done.

---

## Notes on Tooling Choices

- **React Native CLI over Expo** — launcher-level `AndroidManifest` modifications require bare native access. Expo managed workflow cannot set `HOME` intent categories without ejecting anyway.
- **No heavy state library** — the thesis is the token architecture, not a state pattern. Context + hooks is sufficient and keeps the compose pipeline as the clear center of the codebase.
- **TypeScript throughout** — the semantic token interface is the contract between the design system and every component. Strong types catch paradigm/profile mismatches at compile time.
- **Native module for app list** — `react-native-launcher-kit` covers installed app querying and launching. If it falls short, a thin Kotlin native module suffices.
