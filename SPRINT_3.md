# Weft — Sprint 3 Progress

> Session date: 2026-07-29  
> Tracking fixes for issues #1–#12 reported by owner.

---

## Status Overview

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | Background color shift on scroll | ✅ Done | Removed parallax `translateX` from `WallpaperBackground` |
| 2 | Wallpaper feature end-to-end | ✅ Done | See details below |
| 3 | UX loaders (skeleton, spinner) | ✅ Done | See details below |
| 4 | Control Center redesign — modern UI | ✅ Done | See details below |
| 5 | Control Center — permission pre-grant | ✅ Done | Bundled into #4 |
| 6 | Replace all emojis with vector icons | 🟡 Partial | Most replaced; 3 files still have emoji (see below) |
| 7 | Splash logo showing correctly | ✅ Done | `SplashTheme` parent fixed |
| 8 | Desktop vs All Apps split | ✅ Done | `pinnedApps` in config; desktop shows pinned, drawer shows all |
| 9 | All Apps screen styling | ✅ Done | Header, app count, vector search icon, clear X |
| 10 | Icon size slider not working | ✅ Done | `icons.size` fed into semantics after `compose()` |
| 11 | Context menu redesign | ✅ Done | Vector icons, no emoji, clean rows |
| 12 | Home long-press → wiggle + edit mode | ✅ Done | First long-press = edit mode; second = context menu |
| — | Adaptability / screen size | ✅ Done | All screens use `useWindowDimensions()` instead of static `Dimensions.get` |

---

## What Was Done

### Fix #1 — Background Scroll Shift
**File:** `src/components/WallpaperBackground.tsx`  
Removed the parallax `translateX` animated transform. The wallpaper `Animated.View` now uses `style={{ opacity: fadeAnim }}` only — it never translates, so the background stays perfectly fixed regardless of how many pages are scrolled.

---

### Fix #2 & #3 — Wallpaper + UX Loaders
**File:** `src/surfaces/WallpaperPickerSheet.tsx` — fully rewritten.

**What's fixed:**
- **Bundled swatches** — now actually set via a generated BMP bitmap sent to `WallpaperAPI.setFromBase64()`. No drawable asset needed. Each swatch's two colours are encoded into a minimal valid BMP header.
- **Gallery picker** — calls `WallpaperAPI.pickFromGallery()` correctly, opens native Android image picker, returns URI, shows full-screen preview before setting.
- **Unsplash set-wallpaper** — tapping a card opens a full-screen preview (using `urls.regular` for speed). The "Set Wallpaper" button fetches the image as a blob, converts to base64, and calls `WallpaperAPI.setFromBase64()`. Success = `ToastAndroid` confirmation + sheet dismissal.
- **Skeleton loaders** — a pulsing `SkeletonCard` component (looping `Animated.timing`) fills the grid while the first Unsplash page loads.
- **Download spinner** — the "Set Wallpaper" button shows `ActivityIndicator` while the image is being fetched and applied.
- **`useWindowDimensions`** — sheet height, thumb sizes all computed inside the component, responsive to any screen size.

---

### Fix #4 & #5 — Control Center Redesign
**File:** `src/surfaces/ControlCenterScreen.tsx` — fully rewritten.

**What's fixed:**
- All 6 control tiles use **geometric vector icons** built from pure `View`/`StyleSheet` — Wi-Fi, Bluetooth, Bell/Focus, Flashlight (bolt), Airplane, Rotation arc.
- Tiles are arranged in a **3-column grid** with a status dot in the top-right corner (accent-coloured when on, transparent when off).
- **Permission pre-grant**: on first open, `PermissionsAndroid.requestMultiple` is called for `CAMERA` (torch) and `BLUETOOTH_CONNECT` (BT on API 31+). This runs once per app session.
- Brightness and Volume sliders now have labelled rows (Sun icon / Volume icon + label text + percentage value).
- A panel title "CONTROL CENTRE" is shown below the drag handle.
- Sliders and BlurView (Glass paradigm) retained from the previous implementation.

---

### Fix #6 — Emoji Replacement
**Files touched:** `AppContextMenu.tsx`, `HomeScreen.tsx`, `CustomizationScreen.tsx`, `AllAppsScreen.tsx`, `ControlCenterScreen.tsx`

**Replaced:**
- Context menu: all `▶️ ℹ️ 📌 🗑️ ❌` replaced with geometric inline `View` icons (play arrow, info circle, pin, minus-circle, trash).
- HomeScreen: `⚙` gear → `GearIcon` (View-based), `📱` empty state → phone outline from Views.
- CustomizationScreen: `🖼` → `ImageIcon`, `👆` → `SwipeUpIcon`, `⚙ Dev:` prefix removed.
- AllAppsScreen: `🔍` → `SearchIcon` (magnifier from Views), `✕` clear → `View`-based X.
- ControlCenterScreen: `⌘ ⊞ 🔕 ⬡ ✈ ⟳ ☀ ♪` all replaced with custom View icons.

**Still has emoji (next phase):**
- `src/components/AppIcon.tsx` line 305 — delete handle `✕` text (minor, functional)
- `src/surfaces/GestureConfigScreen.tsx` lines 28–29 — `⚙️` and `📱` in action labels
- `src/widgets/WeatherWidget.tsx` lines 27, 121 — `☀️` weather condition icon

---

### Fix #7 — Splash Logo
**File:** `android/app/src/main/res/values/styles.xml`  
Changed `SplashTheme` parent from `Theme.AppCompat.NoActionBar` to `Theme.AppCompat.DayNight.NoActionBar`. Removed `windowLayoutInDisplayCutoutMode` (caused crashes on older API levels). Added `windowNoTitle` and explicit translucent status/nav flags. The `splash_logo.png`, `splash_background.xml`, manifest assignment, and `MainActivity.setTheme()` were already correct.

---

### Fix #8 — Desktop vs All Apps Split
**Files:** `src/context/types.ts`, `src/context/WeftConfigContext.tsx`, `src/surfaces/HomeScreen.tsx`

**What's done:**
- Added `pinnedApps: string[]` to `WeftConfig` type and `DEFAULT_CONFIG` (default = empty = show all apps on first run).
- `WeftConfigContext` exposes `pinnedApps` and `setPinnedApps(packages: string[])`.
- `HomeScreen` computes `desktopApps` — if `pinnedApps` is empty, shows all apps (first-run/legacy behaviour). Otherwise shows only the pinned subset in order.
- **Add to Home**: "Add to Dock" in the context menu (from both home grid and All Apps drawer) calls `setPinnedApps([...pinnedApps, pkg])`.
- **Remove from Home**: "Remove from Home" in context menu calls `setPinnedApps(pinnedApps.filter(...))`.
- All Apps drawer always shows the full app list regardless.

**Not yet done (next phase):**
- Animated folder support — folder creation, folder open animation, folder icon rendering.
- Visual "empty slot" placeholder (+ button on home grid when pinned list is non-empty but less than a full page).

---

### Fix #9 — All Apps Styling
**File:** `src/surfaces/AllAppsScreen.tsx`

- Added a `sheetHeader` row showing "**All Apps**" title + greyed app count (`N apps`).
- Replaced `🔍` emoji with `SearchIcon` (pure View magnifier).
- Replaced `✕` Text clear button with a View-based X icon.
- Removed unused static `Dimensions` import — uses `useWindowDimensions` throughout.

---

### Fix #10 — Icon Size Slider
**File:** `src/context/WeftConfigContext.tsx`  
The `semantics` useMemo now applies `config.icons.size` over the paradigm default `containerSize: 60`:
```ts
appIcon: { ...base.component.appIcon, containerSize: config.icons.size }
```
`config.icons.size` is in the dependency array, so any slider change triggers a re-render.

---

### Fix #11 — Context Menu Redesign
**File:** `src/components/AppContextMenu.tsx` — fully rewritten.

- Five geometric vector icons: `IconPlay`, `IconInfo`, `IconPin`, `IconRemove`, `IconTrash` — all pure `View`/`StyleSheet`.
- `MenuItem` renders icon in a fixed-width 28px cell, then label text.
- All emoji removed.
- Card animation, positioning logic, and accessibility roles retained.

---

### Fix #12 — Home Long-Press → Edit/Wiggle Mode
**File:** `src/surfaces/HomeScreen.tsx`

Changed `handleIconLongPress`: first long-press (when `editMode === false`) calls `setEditMode(true)` and returns early. Only a subsequent long-press while already in edit mode shows the context menu. Background long-press (existing `TouchableOpacity` on wallpaper layer) also enters edit mode — both paths now consistent.

---

### Adaptability
**Files:** `HomeScreen.tsx`, `AllAppsScreen.tsx`, `WallpaperPickerSheet.tsx`  
All three used static `Dimensions.get('window')` at module or component level. Replaced with `useWindowDimensions()` hook so layout recalculates on screen size / orientation changes, making the app correct on tablets and foldables.

---

## Remaining / Next Phase

### Phase 4A — Emoji cleanup (small, ~30 min)
- [ ] `AppIcon.tsx`: replace `✕` delete handle text with a View-based X
- [ ] `GestureConfigScreen.tsx`: replace `⚙️` and `📱` with View icons
- [ ] `WeatherWidget.tsx`: replace `☀️` with a View sun icon

### Phase 4B — Home grid folders (medium, ~2–3 hrs)
- [ ] Folder data model in `WeftConfig` (array of `{ id, name, apps: string[] }`)
- [ ] Folder icon component (stack of 4 app icons in a rounded container)
- [ ] Long-press-drag to group two apps → create folder
- [ ] Folder tap → spring-animated expand overlay showing folder contents
- [ ] Folder name editing (inline tap on title)

### Phase 4C — Home grid empty slots (small, ~1 hr)
- [ ] When `pinnedApps.length > 0` and home grid has room, show `+` placeholder cells
- [ ] Tapping `+` cell opens All Apps drawer with a "tap to pin" mode

### Phase 4D — Build verification
- [ ] `npm run android` clean build — confirm no TypeScript errors
- [ ] On-device smoke test of all 12 fixes
- [ ] Test on two screen densities (e.g. Pixel 4a + tablet emulator)
