# Sprint 4 Implementation Plan
**Phase 11 (Widget System) + Phase 13 (Gesture Nav Bindings)**

---

## Overview

Sprint 4 adds two major UX layers:
1. **Widgets** — contextual information cards on the home screen
2. **Gesture bindings** — user-configurable swipe actions

Both systems share a common requirement: **user configuration persistence** and **non-intrusive UI** that doesn't clutter the existing clean launcher aesthetic.

---

## Phase 11: Widget System

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Widget Framework                                            │
│                                                             │
│  WidgetRegistry                                             │
│    ├─ id, name, icon, defaultConfig                        │
│    ├─ render() → React.ComponentType                       │
│    └─ configScreen (optional) → React.ComponentType        │
│                                                             │
│  WidgetSlot (on HomeScreen)                                │
│    ├─ Renders active widgets in vertical stack             │
│    ├─ Reads from WeftConfig.activeWidgets[]                │
│    └─ Respects semantics tokens (WidgetCard)               │
│                                                             │
│  Widget Configuration Screen                                │
│    ├─ "Add Widget" gallery                                 │
│    ├─ Drag-to-reorder active widgets                       │
│    └─ Per-widget settings (optional)                       │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-step Tasks

#### 11.1 — Widget Context & Types (30 min)
**Files**: `src/context/types.ts`, `src/context/WeftConfigContext.tsx`

- [ ] Add `WidgetConfig` type:
  ```ts
  type WidgetConfig = {
    id: string;           // e.g. 'weather', 'calendar'
    enabled: boolean;
    order: number;        // 0-indexed position in stack
    settings: Record<string, any>; // widget-specific config
  };
  ```
- [ ] Add `activeWidgets: WidgetConfig[]` to `WeftConfig`
- [ ] Add `setWidgetEnabled(id, enabled)`, `reorderWidgets(newOrder)`, `setWidgetSettings(id, settings)` to context

#### 11.2 — Widget Registry (45 min)
**File**: `src/widgets/WidgetRegistry.ts`

- [ ] Define `WidgetDefinition` type:
  ```ts
  type WidgetDefinition = {
    id: string;
    name: string;
    icon: string; // emoji or icon name
    description: string;
    defaultSettings: Record<string, any>;
    component: React.ComponentType<WidgetProps>;
    configComponent?: React.ComponentType<WidgetConfigProps>;
  };
  ```
- [ ] Create `WIDGET_REGISTRY: Map<string, WidgetDefinition>`
- [ ] Export `getWidget(id)`, `getAllWidgets()`

#### 11.3 — WidgetCard Semantic Tokens (15 min)
**Already exists** in `semantics.ts` — verify it has:
- `background`, `border`, `radius`, `padding`, `shadow`
- Update paradigm factories if needed (skeuo/glass/minimal)

#### 11.4 — Widget Slot Component (30 min)
**File**: `src/components/WidgetSlot.tsx`

- [ ] Read `activeWidgets` from `useWeftConfig()`
- [ ] Filter by `enabled: true`, sort by `order`
- [ ] Map to `<WidgetCard>` wrapping each widget's `component`
- [ ] Render in vertical stack with `layout.sectionGap` between cards
- [ ] Handle widget render errors with `<ErrorBoundary>`

#### 11.5 — Built-in Widget: Weather (1 hour)
**File**: `src/widgets/WeatherWidget.tsx`

- [ ] Mock weather data (sunny, 72°F) — no API yet
- [ ] Layout: icon + temp on left, "Sunny" label + location on right
- [ ] Read colors from `semantics.surface.home.textPrimary/textSecondary`
- [ ] Typography from `semantics.component.widgetCard` or `appIcon.labelType`
- [ ] Register in `WidgetRegistry`

#### 11.6 — Built-in Widget: Calendar (1 hour)
**File**: `src/widgets/CalendarWidget.tsx`

- [ ] Mock 2 upcoming events (today 3PM, tomorrow 10AM)
- [ ] Layout: date badge + event title + time, stacked vertically
- [ ] Tap event → open system calendar via `Linking.openURL('content://com.android.calendar/time')`
- [ ] Register in `WidgetRegistry`

#### 11.7 — Built-in Widget: Quick Notes (45 min)
**File**: `src/widgets/QuickNotesWidget.tsx`

- [ ] Single-line text input, stores in `widgetSettings.noteText`
- [ ] Placeholder: "Tap to add a note..."
- [ ] Auto-save on blur via `setWidgetSettings('quicknotes', { noteText })`
- [ ] Register in `WidgetRegistry`

#### 11.8 — Widget Configuration Screen (2 hours)
**File**: `src/surfaces/WidgetConfigScreen.tsx`

- [ ] **Top section**: "Active Widgets" — drag-to-reorder list
  - Use `react-native-draggable-flatlist` or custom gesture
  - Show widget name + toggle switch
  - Reorder calls `reorderWidgets(newOrder)`
- [ ] **Bottom section**: "Available Widgets" gallery
  - Grid of cards (2 columns)
  - Show name + icon + description
  - Tap → `setWidgetEnabled(id, true)`
- [ ] **Navigation**: Accessible via Customization screen → "Widgets" tab or button

#### 11.9 — Integrate WidgetSlot into HomeScreen (15 min)
**File**: `src/surfaces/HomeScreen.tsx`

- [ ] Add `<WidgetSlot />` below `<ClockWidget />` on page 0 only
- [ ] Wrap in conditional: `{activeWidgets.length > 0 && <WidgetSlot />}`
- [ ] Adjust page padding if widget stack gets tall (optional scroll handling)

#### 11.10 — Widget Persistence (15 min)
**File**: `src/context/WeftConfigContext.tsx`

- [ ] `activeWidgets` already part of `WeftConfig` → auto-persisted to AsyncStorage
- [ ] Add default widgets on first launch: `['weather', 'calendar']` enabled

---

## Phase 13: Gesture Nav Bindings

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Gesture System                                              │
│                                                             │
│  GestureConfig (in WeftConfig)                             │
│    ├─ swipeDown: 'controlCenter' | 'notifications' | ...   │
│    ├─ swipeUp: 'allApps' | 'search' | ...                  │
│    ├─ swipeLeft: 'none' | 'quickSettings' | ...            │
│    └─ swipeRight: 'none' | 'recentApps' | ...              │
│                                                             │
│  GestureHandler (HomeScreen)                                │
│    ├─ PanResponder detects direction + distance            │
│    ├─ Maps gesture → action via GestureConfig              │
│    └─ Executes action + haptic feedback                    │
│                                                             │
│  Gesture Config Screen                                      │
│    ├─ Visual preview of 4 swipe directions                 │
│    ├─ Tap direction → action picker sheet                  │
│    └─ Shows current binding per direction                  │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-step Tasks

#### 13.1 — Gesture Types & Config (20 min)
**File**: `src/context/types.ts`

- [ ] Define `GestureAction` union type:
  ```ts
  type GestureAction =
    | 'none'
    | 'controlCenter'
    | 'allApps'
    | 'notifications'     // Android notification shade
    | 'quickSettings'     // Android quick settings
    | 'recentApps'        // Recent apps switcher
    | 'search'            // Future: global search
    | 'launchApp:{packageName}'; // Future: direct app launch
  ```
- [ ] Add `GestureConfig` to `WeftConfig`:
  ```ts
  gestureBindings: {
    swipeDown: GestureAction;
    swipeUp: GestureAction;
    swipeLeft: GestureAction;
    swipeRight: GestureAction;
  };
  ```
- [ ] Default bindings:
  ```ts
  swipeDown: 'controlCenter',
  swipeUp: 'allApps',
  swipeLeft: 'none',
  swipeRight: 'none',
  ```

#### 13.2 — Gesture Handler Refactor (1 hour)
**File**: `src/surfaces/HomeScreen.tsx`

- [ ] Extract current `swipeGesture` PanResponder into `useGestureHandler` hook
- [ ] Move to `src/hooks/useGestureHandler.ts`
- [ ] Read `gestureBindings` from `useWeftConfig()`
- [ ] Detect 4 directions (up/down/left/right) based on `dx`/`dy` ratio
- [ ] Threshold: 80dp for up/down, 100dp for left/right (harder to trigger horizontally)
- [ ] Map direction → action via `gestureBindings`
- [ ] Execute action via `executeGestureAction(action, callbacks)`

#### 13.3 — Gesture Action Executor (45 min)
**File**: `src/hooks/useGestureHandler.ts`

- [ ] `executeGestureAction(action, callbacks)`:
  - `'controlCenter'` → `callbacks.onOpenControlCenter?.()`
  - `'allApps'` → `callbacks.onOpenAllApps?.()`
  - `'notifications'` → `NativeModules.StatusBarManager.expandNotifications()`
  - `'quickSettings'` → `NativeModules.StatusBarManager.expandSettings()`
  - `'recentApps'` → `NativeModules.ActivityManager.showRecentApps()`
  - `'none'` → no-op
  - `'launchApp:*'` → parse packageName, call `RNLauncherKitHelper.launchApplication()`
- [ ] Haptic feedback per action type (50ms for local, 30ms for system)

#### 13.4 — Native Module: System Gestures (1 hour)
**File**: `android/app/src/main/java/com/weft/SystemGesturesModule.kt`

- [ ] `expandNotifications()` → `statusBarService.expandNotificationsPanel()`
- [ ] `expandSettings()` → `statusBarService.expandSettingsPanel()`
- [ ] `showRecentApps()` → `ActivityManager.getRecentTasks()` or system intent
- [ ] Register in `MainApplication.kt`
- [ ] Export to JS: `NativeModules.SystemGestures`

#### 13.5 — Gesture Config Screen (2 hours)
**File**: `src/surfaces/GestureConfigScreen.tsx`

- [ ] **Layout**: 4 directional cards in a grid (2×2)
  - Each card shows arrow icon + current action label
  - Tap card → open action picker bottom sheet
- [ ] **Action Picker Sheet**:
  - List of all `GestureAction` options
  - Radio selection (current selected highlighted)
  - Confirm → `setGestureBinding(direction, action)`
- [ ] **Visual preview**: animated swipe hint (optional, nice-to-have)
- [ ] **Accessibility**: VoiceOver labels per gesture

#### 13.6 — Integrate Gesture Config into Customization (15 min)
**File**: `src/surfaces/CustomizationScreen.tsx`

- [ ] Add "Gestures" section below accessibility profiles
- [ ] Show 4 compact rows: direction icon + action label + chevron
- [ ] Tap row → navigate to `GestureConfigScreen`
- [ ] Or inline edit: tap row → action picker sheet (no separate screen)

#### 13.7 — Gesture Hints (First Launch) (1 hour)
**File**: `src/components/GestureHints.tsx`

- [ ] Show subtle animated arrows on first 3 launches
  - Up arrow at bottom: "Swipe up for apps"
  - Down arrow at top: "Swipe down for controls"
- [ ] Fade out after 3 seconds or first gesture
- [ ] Track in AsyncStorage: `gestureHintsShown: boolean`
- [ ] Render in `HomeScreen` conditionally

#### 13.8 — Gesture Persistence (10 min)
**File**: `src/context/WeftConfigContext.tsx`

- [ ] `gestureBindings` already part of `WeftConfig` → auto-persisted
- [ ] No additional work needed

---

## Integration Points

### Where Phase 11 + 13 Overlap

1. **Customization Screen**:
   - Add "Widgets" button/tab
   - Add "Gestures" section
   - Both read from `WeftConfig`, update via context methods

2. **HomeScreen Layout**:
   - WidgetSlot sits between ClockWidget and app grid
   - Gesture handler wraps entire screen (already does via PanResponder)
   - Both must not conflict with pagination swipes (horizontal)

3. **Semantic Tokens**:
   - Widgets use `WidgetCard` tokens (already defined)
   - Gesture config screen uses `surface.customization` + `component.tile` for cards
   - No new token types needed

4. **AsyncStorage**:
   - Both persist to same `WeftConfig` object
   - Single read/write path via `WeftConfigContext`

---

## Implementation Order (Optimal Path)

### Week 1: Widget Foundation
1. Widget context types (11.1) — 30min
2. Widget registry (11.2) — 45min
3. WidgetSlot component (11.4) — 30min
4. Weather widget (11.5) — 1hr
5. Integrate into HomeScreen (11.9) — 15min
6. Test: one widget rendering, paradigm switches work

### Week 1: Widget Expansion
7. Calendar widget (11.6) — 1hr
8. Quick Notes widget (11.7) — 45min
9. Widget config screen (11.8) — 2hrs
10. Widget persistence (11.10) — 15min
11. Test: add/remove/reorder widgets, settings persist

### Week 2: Gesture Foundation
12. Gesture types (13.1) — 20min
13. Refactor gesture handler (13.2) — 1hr
14. Gesture action executor (13.3) — 45min
15. Test: up/down gestures work with new system

### Week 2: Gesture Native + Config
16. Native module for system gestures (13.4) — 1hr
17. Gesture config screen (13.5) — 2hrs
18. Integrate into Customization (13.6) — 15min
19. Gesture hints (13.7) — 1hr
20. Test: all 4 directions configurable, hints show once

### Week 2: Polish + Hardening
21. Error boundaries around widgets
22. Gesture conflict resolution (don't trigger during horizontal page swipes)
23. Haptic feedback tuning
24. Accessibility audit (VoiceOver, TalkBack)
25. Performance: widget render throttling if needed

---

## Estimated Total Time

- **Phase 11 (Widgets)**: ~8 hours active coding
- **Phase 13 (Gestures)**: ~7 hours active coding
- **Integration + Testing**: ~3 hours
- **Total**: ~18 hours (2-3 days of focused work)

---

## Risk Mitigation

### Potential Issues

1. **Widget render performance** → Use `React.memo` + `ErrorBoundary` per widget
2. **Gesture conflicts with pagination** → Only trigger if `dy > dx * 1.5` (mostly vertical)
3. **System gesture permissions** → Some actions may require SYSTEM_ALERT_WINDOW (fallback to Linking)
4. **Widget API calls** → Mock data first, add real APIs in Sprint 5

### Rollback Plan

- Widgets are opt-in (start with 0 active widgets if needed)
- Gestures default to current behavior (down→control center, up→all apps)
- Both features can be disabled via config flags if bugs found

---

## Definition of Done

### Phase 11 Complete When:
- [ ] 3 widgets render correctly (Weather, Calendar, Notes)
- [ ] Widget config screen allows add/remove/reorder
- [ ] Widgets respond to paradigm switches
- [ ] Widget state persists across app restarts
- [ ] No performance impact on page swipes

### Phase 13 Complete When:
- [ ] All 4 swipe directions configurable
- [ ] System actions work (notifications, recent apps)
- [ ] Gesture config screen is intuitive
- [ ] Gesture hints show once on first launch
- [ ] No false triggers during horizontal pagination

---

## Next Steps

1. **Review this plan** — adjust priorities if needed
2. **Start with 11.1** (widget types) — smallest atomic task
3. **Build vertically** — one complete widget before adding more
4. **Test on device** — gestures feel different on emulator vs physical
