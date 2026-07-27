# Weft — v1.0.1 Implementation Phases

This document picks up from where v1.0.0 left off. Phases 0–4 are shipped. This plan converts Weft from a working prototype into a **premium, daily-driveable Android launcher** — one that can genuinely replace stock launchers like Pixel Launcher or Samsung One UI Home.

The guiding principle for v1.0.1: **every interaction should feel intentional, every surface should feel alive, and every customization should feel effortless.**

---

## Current State (v1.0.0 Baseline)

| Phase | Status | What exists |
|---|---|---|
| Phase 0 — Bootstrap | ✅ Complete | Launcher shell, manifest, folder structure |
| Phase 1 — Tokens | ✅ Complete | Three-tier token system, paradigm factories, profile deltas, compose pipeline |
| Phase 2 — State/Context | ✅ Complete | WeftConfigContext, AsyncStorage persistence, live recomposition |
| Phase 3 — Atoms | ✅ Complete | Tile, Toggle, Slider, SectionHeader, WidgetCard, AppIcon, PreviewCard, Dock |
| Phase 4 — Home Surface | ✅ Complete | App grid, clock widget, dock, pagination, spring press, haptics |
| Phase 5 — Control Center | 🔶 Partial | ControlCenterScreen exists; swipe gesture, full tile set, Glass blur not validated |
| Phase 6 — Customization | 🔶 Partial | CustomizationScreen and Drawer exist; PreviewCard live; needs icon/font pickers |
| Phase 7 — Polish & Demo | 🔶 Partial | Onboarding done; wallpaper passthrough done; demo hardening incomplete |

---

## Design Principles for v1.0.1

These govern every decision in the phases below.

- **Feel over function first.** Animations, transitions, and micro-interactions ship in the same phase as the feature — not as a follow-up polish pass.
- **Depth is earned.** Every layer of the UI must justify its z-position. Blur, shadow, and elevation are tools, not decoration.
- **Customization is a first-class surface.** The user's ability to shape the launcher is a feature as important as the launcher itself.
- **Accessibility is architecture, not afterthought.** The existing profile system extends naturally into every new feature.
- **Comparable to Material You.** Dynamic theming, fluid motion, and a cohesive design language are the benchmark — not just functional parity.

---

## Phase 5 — Control Center (Complete & Polish)

**Status:** 🔶 In Progress → Finish  
**Goal:** Ship Control Center to the same quality bar as Home. Swipe gesture reliable, Glass blur validated on device, all 6 tiles functional.

### Tasks
- [ ] Validate swipe-down gesture from top edge of Home — threshold tuning so it doesn't conflict with status bar system gesture
- [ ] Wire real system intents: Wi-Fi toggle (Settings panel intent), Bluetooth toggle, Do Not Disturb, Flashlight via `CameraManager`
- [ ] Brightness and Volume sliders write to `Settings.System.SCREEN_BRIGHTNESS` and `AudioManager` via native module
- [ ] Glass paradigm: `@react-native-community/blur` `BlurView` wrapping the control panel — validate on physical device (emulator blur is unreliable)
- [ ] Glass × Vision cascade: verify container tint deepens to 92%, plates clear, chips go transparent — automated snapshot test
- [ ] Animate open: panel slides down from top edge with spring (stiffness 280, damping 28), backdrop fades in simultaneously
- [ ] Animate close: reverse spring + tap-outside-to-dismiss
- [ ] Swipe-up-to-close gesture on the panel itself
- [ ] Safe area insets on the panel top so it doesn't overdraw the status bar content
- [ ] Add a network speed / battery readout row at the top of the panel (status at a glance)

**Exit criteria:** Pull-down opens Control Center with spring animation. Glass blur is visible on device. Brightness slider changes screen brightness live. Glass × Vision cascade fires correctly.

---

## Phase 6 — App Long-Press Context Menu

**Status:** 🆕 New  
**Goal:** Long-pressing any app icon reveals a fluid, paradigm-aware context menu with quick actions. This is one of the highest-impact UX features separating a basic launcher from a premium one.

### Design intent
The context menu should feel like it *emerges from* the icon — not a generic Android popup. It rises with a spring, blurs the background behind it, and presents actions in a scannable vertical list. It is the primary entry point for accessibility-critical app actions.

### Tasks

**Gesture & Animation**
- [ ] On long-press (400ms threshold, haptic at trigger), the tapped `AppIcon` scales up slightly (1.05) then the menu blooms open beneath/above it (depending on icon position on screen)
- [ ] Background dims with a scrim (`rgba(0,0,0,0.45)`) and blurs (`BlurView` on Glass paradigm, plain scrim on Skeuo/Minimal)
- [ ] Menu appears with a spring scale-from-origin animation (origin = icon center point)
- [ ] Tap outside or swipe down dismisses with a reverse spring

**Context Menu Actions**
- [ ] **Open** — launches the app (primary action, always first)
- [ ] **App Info** — deep-links to `android.settings.APPLICATION_DETAILS_SETTINGS` for the package
- [ ] **Uninstall** — triggers system uninstall intent (`ACTION_DELETE`); disabled for system apps (detect via `ApplicationInfo.FLAG_SYSTEM`)
- [ ] **Add to Dock** — pins the app to the dock; shows confirmation toast if dock is full
- [ ] **Remove from Home** — hides the icon from the grid (persisted in config); does not uninstall
- [ ] **Share App** — triggers system share sheet with Play Store link
- [ ] **Widget Picker** (if app has widgets) — opens the widget picker sheet for that app (Phase 10)

**Accessibility**
- [ ] Context menu items respect Motor profile touch target minimum (72px height per row)
- [ ] Vision profile: larger label size, higher contrast menu background
- [ ] Cognitive profile: reduce to 3 actions max (Open, App Info, Uninstall) — fewer choices reduces cognitive load
- [ ] Each action has a leading icon (SF Symbols-style line icons via a bundled icon set or `react-native-vector-icons`)
- [ ] TalkBack: menu is announced as a list, actions are individually focusable

**Token integration**
- [ ] Menu surface background, border radius, shadow, and label styles all come from `AppSemantics` — no inline overrides
- [ ] New semantic tokens needed: `component.contextMenu.background`, `component.contextMenu.itemHeight`, `component.contextMenu.dividerColor`, `component.contextMenu.destructiveColor`

**Exit criteria:** Long-pressing any app icon opens the context menu with spring animation. Uninstall triggers system dialog. App Info opens system settings. All actions respect active accessibility profiles.

---

## Phase 7 — All Apps Drawer

**Status:** 🆕 New  
**Goal:** Scrolling up from the home screen reveals a full alphabetically-sorted app drawer. This is the standard premium launcher pattern (Pixel Launcher, Nova, One UI) and the biggest functional gap between Weft and a daily-driver launcher.

### Design intent
The drawer should feel like it's *behind* the home screen, revealed by pulling the home surface up — not a separate screen pushed onto a stack. The home screen compresses slightly as the drawer rises, giving a sense of physical layering.

### Tasks

**Gesture**
- [ ] `PanResponder` on the Home surface — upward swipe beyond a threshold (120px) triggers the drawer open transition
- [ ] Velocity-sensitive: fast flick opens immediately, slow drag follows the finger with resistance
- [ ] Home screen content scales down (0.92) and shifts up as the drawer rises — parallax layering effect
- [ ] Swipe down or drag the drawer handle closes it; back button also closes
- [ ] Drawer peek: a small handle/indicator at the bottom of Home hints at the swipe-up affordance

**App Drawer Surface (`AllAppsScreen.tsx`)**
- [ ] Full-height modal sheet anchored at the bottom, rises to 92% screen height
- [ ] Paradigm-aware background: Glass gets frosted blur panel, Skeuo gets warm elevated card, Minimal gets flat near-black surface
- [ ] Alphabetical index bar on the right edge — tap a letter to jump to that section (like iOS Contacts)
- [ ] `SectionHeader` atoms for each letter group
- [ ] Search bar at the top — filters app list in real time, auto-focuses keyboard on open
- [ ] Grid layout (same `semantics.layout.gridColumns` as Home) with `AppIcon` atoms — same long-press context menu as Phase 6
- [ ] Cognitive profile: switch from grid to a vertical list layout (easier to scan linearly)
- [ ] Recently used apps row at the top of the drawer (above alphabetical list) — persisted via `AsyncStorage`
- [ ] Smooth `FlatList` `getItemLayout` optimization — large app lists shouldn't stutter

**Transition animation**
- [ ] Drawer uses `Animated.Value` shared with Home surface for coordinated pan
- [ ] Home background darkens proportionally as drawer opens (interpolated scrim opacity)
- [ ] Spring settle on release: if >50% open → snap fully open, <50% → snap closed
- [ ] Native driver for all transform/opacity animations

**Token integration**
- [ ] New semantic tokens: `surface.allApps.background`, `surface.allApps.searchBar`, `surface.allApps.handleColor`
- [ ] All existing atom components (AppIcon, SectionHeader) reuse tokens — zero new inline styles

**Exit criteria:** Swiping up from Home reveals the app drawer with spring animation. Search filters apps in real time. Alphabetical index bar jumps to letter sections. Long-press on any app opens the context menu from Phase 6.

---

## Phase 8 — Wallpaper Customization

**Status:** 🆕 New  
**Goal:** Users can set wallpapers from their device gallery, from a curated in-app collection, and from online sources — without leaving the launcher. This is the single most visible customization feature and a key differentiator for premium launchers.

### Tasks

**Wallpaper Sources**

- [ ] **Device gallery** — `react-native-image-picker` to pick a photo; crop/zoom via a pinch-to-zoom preview before setting
- [ ] **Curated in-app collection** — 20–30 high-quality wallpapers bundled in the app (stored in `android/app/src/main/res/drawable/`), organised by mood: Abstract, Nature, Minimal, Dark, Gradient
- [ ] **Online wallpaper browser** — integrate [Unsplash API](https://unsplash.com/developers) (free tier, 50 req/hour) to browse and search wallpapers. Categories: Popular, Nature, Architecture, Abstract, Dark
  - [ ] Search bar with debounced query (300ms)
  - [ ] Infinite scroll with `FlatList` `onEndReached` pagination
  - [ ] Tap to preview full-screen; long-press to set directly
  - [ ] Download progress indicator before setting

**Setting the wallpaper**
- [ ] Native Kotlin module `WallpaperSetModule.kt` — calls `WallpaperManager.getInstance(context).setBitmap()` to set the system wallpaper
- [ ] Option to set for: Home screen only, Lock screen only, or Both
- [ ] After setting, `WallpaperBackground.tsx` refreshes via the existing `WallpaperModule` read path

**Wallpaper-aware paradigm tinting**
- [ ] Extend `WallpaperBackground.tsx`: when a wallpaper is set, compute its dominant color palette using a native color extraction module (`Palette` API in Android)
- [ ] Expose the dominant color to the compose pipeline as an optional hint — Glass paradigm can tint its container surface with the wallpaper's dominant dark tone rather than a fixed `#0B2438`
- [ ] This is a step toward Material You-style dynamic color without requiring Android 12+

**UI entry points**
- [ ] Long-press on the home screen background (not on an icon) opens the Wallpaper Picker sheet
- [ ] Also accessible from Customization screen under a new "Wallpaper" section
- [ ] Wallpaper picker sheet uses the same paradigm-aware bottom sheet pattern as the All Apps Drawer

**Token integration**
- [ ] New semantic tokens: `surface.wallpaperPicker.background`, `surface.wallpaperPicker.cardRadius`, `surface.wallpaperPicker.selectedBorder`

**Exit criteria:** User can pick a photo from gallery, browse Unsplash, or pick a bundled wallpaper. Selected wallpaper sets as the system wallpaper. Glass paradigm tint adapts to wallpaper dominant color.

---

## Phase 9 — Icon Packs, Icon Size & Font Customization

**Status:** 🆕 New  
**Goal:** Give users fine-grained control over icon appearance and typography. These are the most-requested customization features in every launcher survey and directly impact the "premium feel" benchmark.

### Icon Size

- [ ] Icon size slider in Customization screen — range: 48dp (compact) to 80dp (large). Default per paradigm: Skeuo 64dp, Glass 60dp, Minimal 56dp
- [ ] Label size follows proportionally (or can be hidden entirely — toggle "Show icon labels")
- [ ] Grid reflows automatically when icon size changes (fewer columns when icons are larger)
- [ ] Changes preview live in `PreviewCard` before the user commits
- [ ] Token path: new `component.appIcon.size` and `component.appIcon.labelVisible` in `AppSemantics`

### Icon Shape

- [ ] Icon shape selector: Circle, Squircle (default), Rounded Square, Teardrop, Hexagon
- [ ] Shape applied as a clip path over the app's actual icon — does not depend on the app supporting adaptive icons
- [ ] Shape changes animate with a morph transition (300ms, spring) in the Customization preview
- [ ] Token path: `component.appIcon.clipShape` enum value, applied in `AppIcon.tsx`

### Icon Packs

- [ ] **Icon pack detection** — scan installed apps for those declaring `com.novalauncher.THEME` or `org.adw.launcher.THEMES` intent filters. These are the standard Nova/ADW icon pack APIs supported by hundreds of packs on the Play Store
- [ ] **Icon pack loader** — query the pack's `ContentProvider` for icon drawables by package name; cache decoded `Bitmap`s in memory (`LruCache`) and on disk (`AsyncStorage` base64 or native file cache)
- [ ] Icon pack picker UI: horizontal scroll of installed packs with a preview of 6 icons; "Default" option always first
- [ ] Graceful fallback: if a pack doesn't have an icon for an app, fall back to the system icon
- [ ] Kotlin module `IconPackModule.kt` handles ContentProvider queries off the JS thread

### Font Customization

- [ ] Font picker in Customization screen — applies to all UI labels, section headers, and clock widget
- [ ] Bundled options (no download required): Inter (default), Fraunces, JetBrains Mono, a 4th neutral sans-serif option (e.g., DM Sans)
- [ ] "System font" option uses whatever the device's default font is
- [ ] Font weight picker (for variable fonts): Light / Regular / Medium / SemiBold — maps to numeric weight values
- [ ] Font size scale: a single slider that scales the entire typography system proportionally (0.85× to 1.3×). Independent of the Vision accessibility profile — this is a preference, not an accessibility accommodation
- [ ] All changes flow through `primitives.ts` `fontFamilies` map and the typography scale — zero component-level overrides
- [ ] Live preview in `PreviewCard` and a dedicated font specimen row showing A–Z, 0–9, and a sample sentence

**Exit criteria:** User can change icon size, icon shape, choose an installed icon pack, and change the UI font. All changes reflect in the PreviewCard before applying. Icon pack fallback works for apps not in the pack.

---

## Phase 10 — Premium Motion & Interaction Design

**Status:** 🆕 New  
**Goal:** Elevate every interaction to Material You / iOS-level polish. Motion is not decoration — it communicates state, establishes hierarchy, and makes the launcher feel physically grounded.

### Principles
- All animations use **spring physics**, not easing curves. Springs feel alive; bezier curves feel computed.
- **Native driver only** for transform and opacity — JS-driven animations on these properties cause dropped frames.
- Every transition has a clear **origin point** (the element that triggered it) and a clear **destination**.
- **Reduce motion** accessibility setting respected throughout — all animations collapse to a simple opacity fade when the system `reduceMotion` preference is on.

### Tasks

**App Launch Transition**
- [ ] When an app icon is tapped, it expands outward to fill the screen before the system app opens — a "portal" launch effect
- [ ] Implemented via a shared-element-style scale animation: the icon's `Animated.Value` scales from 1.0 to a large value while the home screen fades out
- [ ] On return to Home, the reverse animation plays (app window shrinks back to the icon position)
- [ ] This requires intercepting the app launch and using `AppState` + `InteractionManager` carefully to not block the actual launch

**Page Transition (Home pages)**
- [ ] Horizontal swipe between home screen pages uses a **parallax scroll**: app icons move at 1.0× speed, the wallpaper moves at 0.7× speed, and the clock widget moves at 0.5× — depth through differential motion
- [ ] Page dots animate with a spring stretch on the active dot (width expands from 8px to 22px)
- [ ] `FlatList` `scrollEventThrottle={16}` with `Animated.event` on native driver

**Icon Arrangement Mode (Edit Mode)**
- [ ] Long-pressing the home screen background (or holding an icon for 800ms+) enters **Edit Mode**
- [ ] In Edit Mode, all icons jiggle (subtle rotation oscillation, ±2°, staggered timing per icon — familiar from iOS)
- [ ] Icons become draggable — `PanResponder` per icon, drop zones highlight as the dragged icon hovers over them
- [ ] Delete badge (×) appears on each icon to remove it from the home screen (context menu action from Phase 6)
- [ ] Tap empty space or press back to exit Edit Mode with a spring settle

**Micro-interactions**
- [ ] Toggle on/off: thumb slides with spring, track color crossfades — 200ms, native driver
- [ ] Slider scrubbing: thumb scales up to 1.3× while dragging (haptic on each detent), snaps back on release
- [ ] Pull-to-refresh on home screen (pull down past dock): subtle elastic overscroll, then a small "checking for updates" animation before snapping back
- [ ] Dock icons pulse briefly (scale 1.0 → 1.08 → 1.0) when a notification arrives for that app
- [ ] Control Center tiles have a satisfying press state: scale 0.94 + background lightens — spring back on release

**Paradigm switch transition**
- [ ] Currently paradigm switches are instant. Replace with a 280ms crossfade that interpolates surface colors — so switching from Skeuo to Glass feels like watching the room change lighting rather than a hard cut
- [ ] Implemented via interpolated `Animated.Value` per color token, driven by a single `timing()` animation
- [ ] Profile toggles (which affect fewer tokens) use a shorter 180ms crossfade

**Exit criteria:** App icon taps show launch transition. Home page swipes have parallax depth. Long-press edit mode shows icon jiggle and drag reordering. Paradigm switch crossfades smoothly. All animations respect system reduce-motion preference.

---

## Phase 11 — Widget System

**Status:** 🆕 New (was Stretch Goal in v1.0.0)  
**Goal:** Resizable, repositionable widget slots on the home screen. Widgets are the single biggest functional feature that separates launchers like Nova Premium from free alternatives.

### Tasks

**Widget infrastructure**
- [ ] Kotlin module `WidgetHostModule.kt` — wraps Android `AppWidgetHost` and `AppWidgetManager` to host real Android widgets inside RN views
- [ ] `AppWidgetHostView` rendered inside a `ReactViewGroup` bridge — this is the standard approach used by Nova Launcher and KWGT
- [ ] Widget picker sheet: lists all installed apps that provide widgets (`AppWidgetManager.getInstalledProviders()`), with a preview of each widget's default size
- [ ] Widget placement: tap an empty grid cell in Edit Mode to open the widget picker

**Widget sizing**
- [ ] Widgets snap to the grid: 1×1, 2×1, 2×2, 4×1, 4×2 cell configurations
- [ ] `WidgetCard.tsx` refactored to act as a resizable container — drag handles on corners in Edit Mode
- [ ] Minimum size enforced per widget's `minWidth`/`minHeight` from its `AppWidgetProviderInfo`

**First-party Weft widgets**
Even before third-party widget hosting is complete, ship these native Weft widgets:
- [ ] **Clock + Date** widget (already exists as `ClockWidget.tsx` — promote to a proper widget slot)
- [ ] **Weather** widget — pulls from Open-Meteo API (free, no key required): current temperature, condition icon, high/low for the day
- [ ] **Battery** widget — large circular battery indicator with paradigm-aware fill color
- [ ] **Quick Notes** widget — a single-tap editable sticky note, persisted via `AsyncStorage`
- [ ] **Music/Media** widget — reads the active `MediaSession` via a Kotlin `MediaController` module; shows album art, track name, play/pause/skip controls

**Exit criteria:** User can place a real Android widget (e.g., Google Calendar) on the home screen from the widget picker. At least 3 first-party Weft widgets are available and functional.

---

## Phase 12 — Notification Badges & Live Data

**Status:** 🆕 New  
**Goal:** App icons show unread notification counts. The launcher feels alive and connected to the device state.

### Tasks

**Notification badges**
- [ ] Kotlin `NotificationListenerModule.kt` — extends `NotificationListenerService` to count active notifications per package
- [ ] Badge count rendered as a small pill on the `AppIcon` — top-right corner, paradigm-aware styling (Skeuo: cream pill with amber text, Glass: translucent pill, Minimal: flat accent dot)
- [ ] Token path: `component.appIcon.badge.background`, `component.appIcon.badge.textColor`, `component.appIcon.badge.size`
- [ ] Permission prompt: `NotificationListenerService` requires the user to grant access in Settings — Weft prompts on first launch with a clear explanation of why
- [ ] Badge count updates in real time via event emitter from the native module
- [ ] Option in Customization to show count vs. dot-only vs. hide badges entirely

**Live system status**
- [ ] Battery level + charging state shown in Control Center (already a tile — wire to real `BatteryManager` data)
- [ ] Network type indicator (WiFi / 4G / 5G) in the status row of Control Center
- [ ] Storage usage indicator: a subtle bar in the App Drawer header ("142 apps — 47 GB used")

**Exit criteria:** App icons show live notification badge counts. Counts update when notifications arrive or are dismissed. Customization option controls badge display style.

---

## Phase 13 — Gesture Navigation & Custom Shortcuts

**Status:** 🆕 New  
**Goal:** Power users can assign custom actions to gestures — a hallmark of premium launchers (Nova, Action Launcher). Casual users benefit from the sensible defaults.

### Default gestures (no configuration required)
| Gesture | Default Action |
|---|---|
| Swipe up from Home | Open All Apps Drawer |
| Swipe down from top edge | Open Control Center |
| Swipe down on home background | Notification shade (system) |
| Double-tap home background | Lock screen |
| Pinch in on home | Overview / recent apps |
| Swipe right on last page | Show Weft Customization |

### Custom gesture bindings
- [ ] "Gestures" section in Customization screen — lists all configurable gestures
- [ ] Each gesture can be bound to: Open App, Open Shortcut, Toggle Profile, Switch Paradigm, Open Control Center, Open App Drawer, Lock Screen, or Do Nothing
- [ ] Gesture bindings persisted in `WeftConfig` via `AsyncStorage`
- [ ] Token path: `WeftConfig` extended with `gestures: Record<GestureId, GestureAction>`

### Swipe-app shortcuts on Dock
- [ ] Swipe up on a dock icon launches a secondary app (user-assigned) — like iOS dock swipe shortcuts
- [ ] Long-press the dock to enter dock edit mode: reorder, remove, or assign swipe shortcuts

**Exit criteria:** Double-tap locks the screen. Gesture bindings in Customization persist across restarts. Dock swipe shortcuts work for at least two dock positions.

---

## Phase 14 — Theming Engine & Custom Color Palettes

**Status:** 🆕 New  
**Goal:** Beyond three paradigms, users can tweak individual color values and save named themes. This is where Weft goes from "a well-designed launcher" to "the launcher that is yours."

### Tasks

**Color override system**
- [ ] Each paradigm factory in `paradigms.ts` already returns a full `AppSemantics` object — extend the compose pipeline to accept an optional `ColorOverrides` map that patches specific semantic tokens after the paradigm factory runs but before profile deltas
- [ ] `WeftConfig` extended: `colorOverrides?: Partial<ColorOverrideMap>` — a flat map of semantic token paths to hex color strings
- [ ] Override editor in Customization: a list of "paintable" tokens (accent, surface background, tile background, text) with a color swatch that opens a color picker (`react-native-color-picker` or a custom HSL wheel)

**Saved themes**
- [ ] User can name and save the current `paradigm + colorOverrides + fontChoice` combination as a named theme
- [ ] Themes listed in a "My Themes" section — tap to apply, long-press to delete
- [ ] 3 built-in themes ship with Weft as starting points: "Midnight" (Glass, deep navy accent), "Parchment" (Skeuo, default), "Ash" (Minimal, cool grey accent)
- [ ] Themes exportable as a JSON string — shareable via the system share sheet

**Dynamic color (Android 12+ Monet)**
- [ ] On Android 12+ devices, detect if Monet dynamic color is available (`DynamicColors.isDynamicColorAvailable()`)
- [ ] If available, offer a "Use system colors" toggle — extracts the system's Material You seed color and applies it as the accent in the current paradigm
- [ ] Falls back gracefully on Android 10/11 (no Monet support)

**Exit criteria:** User can change the accent color, save it as a named theme, and restore it after a restart. On Android 12+, "Use system colors" maps the Monet palette into the Weft token system.

---

## Phase 15 — Performance, Stability & Release Hardening

**Status:** 🆕 New  
**Goal:** A launcher that stutters or crashes will be uninstalled immediately. This phase ensures Weft is genuinely daily-driveable before any public release.

### Performance targets
| Metric | Target |
|---|---|
| Cold launch to interactive | < 600ms on mid-range device (Snapdragon 6xx) |
| Paradigm switch recompose | < 16ms (single frame) |
| App drawer open animation | 60 fps consistently |
| App grid scroll | 60 fps, no jank on 100+ apps |
| Memory footprint | < 180 MB RSS in steady state |

### Tasks

**Rendering**
- [ ] Audit all `FlatList`s for missing `getItemLayout`, `keyExtractor`, and `removeClippedSubviews`
- [ ] Memoize all atom components with `React.memo` — props are stable token objects so this is safe
- [ ] Replace any remaining `StyleSheet.create` calls that recompute on render with static stylesheets
- [ ] Profile with Android GPU Profiler — identify and fix any overdraw hotspots (Glass paradigm blur is highest risk)
- [ ] Hermes engine confirmed enabled — verify in `android/app/build.gradle` (`hermesEnabled = true`)

**Stability**
- [ ] Error boundary wrapping each surface — a crash in Control Center doesn't kill the home screen
- [ ] `useInstalledApps` defensive handling: empty list, permission denied, and extremely large app counts (500+)
- [ ] Wallpaper module: handle `SecurityException` on devices where `READ_WALLPAPER_INTERNAL` is restricted by OEM
- [ ] Test on at least 3 device profiles: stock Android (Pixel), Samsung One UI, and a low-RAM device (3 GB)
- [ ] Memory leak audit: confirm all `Animated.Value` listeners, `BackHandler` listeners, and `AppState` subscriptions are removed on unmount

**Release**
- [ ] ProGuard/R8 rules verified — token system classes are not incorrectly stripped
- [ ] `versionName "1.0.1"` and `versionCode 2` in `android/app/build.gradle`
- [ ] Release APK signed with existing keystore
- [ ] `CHANGELOG.md` documents all v1.0.1 additions
- [ ] Screenshots updated for all new surfaces (All Apps, Context Menu, Wallpaper Picker, Widget Picker)
- [ ] README updated with new features, prerequisites unchanged

**Exit criteria:** App runs for 2 hours as default launcher on a physical device without crash or restart. Memory does not grow unboundedly. All surfaces animate at 60 fps on a mid-range device.

---

## Phase Dependencies (v1.0.1)

```
[v1.0.0 Phases 0–4 ✅]
        │
        ├── Phase 5  (Control Center complete)
        │
        ├── Phase 6  (Long-press Context Menu)
        │       └── Phase 7  (All Apps Drawer)  ← uses context menu
        │
        ├── Phase 8  (Wallpaper Customization)
        │
        ├── Phase 9  (Icon & Font Customization)
        │       └── Phase 14 (Theming Engine)   ← extends font/color system
        │
        ├── Phase 10 (Premium Motion)
        │       └── Phase 13 (Gesture Nav)      ← gesture layer built on motion
        │
        ├── Phase 11 (Widget System)
        │
        ├── Phase 12 (Notification Badges)
        │
        └── Phase 15 (Performance & Release)    ← depends on all above
```

Phases 5–12 can be worked in parallel. Phase 13 depends on Phase 10. Phase 14 depends on Phase 9. Phase 15 is the integration gate.

---

## Recommended Build Order

| Sprint | Phases | Rationale |
|---|---|---|
| Sprint 1 | 5, 6, 7 | Core launcher UX completeness — Control Center + context menu + app drawer are the most visible gaps |
| Sprint 2 | 8, 9 | Customization depth — wallpaper and icon/font are the most-requested launcher features |
| Sprint 3 | 10, 12 | Polish and liveliness — motion and badges make it feel premium and connected |
| Sprint 4 | 11, 13 | Power features — widgets and gesture nav differentiate from stock |
| Sprint 5 | 14, 15 | Theming and hardening — ship quality |

---

## New Token Additions Summary

All new semantic token paths introduced in v1.0.1 phases:

```ts
// Phase 6 — Context Menu
component.contextMenu.background
component.contextMenu.itemHeight
component.contextMenu.dividerColor
component.contextMenu.destructiveColor

// Phase 7 — All Apps Drawer
surface.allApps.background
surface.allApps.searchBar
surface.allApps.handleColor

// Phase 8 — Wallpaper Picker
surface.wallpaperPicker.background
surface.wallpaperPicker.cardRadius
surface.wallpaperPicker.selectedBorder

// Phase 9 — Icon Customization
component.appIcon.size
component.appIcon.labelVisible
component.appIcon.clipShape

// Phase 12 — Notification Badges
component.appIcon.badge.background
component.appIcon.badge.textColor
component.appIcon.badge.size
```

All tokens follow the existing three-tier pattern: raw value in `primitives.ts`, typed field in `semantics.ts`, populated in each paradigm factory in `paradigms.ts`, optionally overridden by profile deltas in `profiles.ts`.

---

*Weft v1.0.1 — from prototype to daily driver.*
