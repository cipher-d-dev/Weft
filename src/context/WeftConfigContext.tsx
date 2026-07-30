import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { compose } from '../compose/compose';
import { DEFAULT_CONFIG } from './types';
import type {
  AccessibilityProfile,
  FontConfig,
  GestureAction,
  GestureBindings,
  IconConfig,
  Paradigm,
  WeftConfig,
  WallpaperConfig,
  WidgetConfig,
} from './types';
import type { AppSemantics } from '../tokens/semantics';

/** AsyncStorage key used to persist the user's Weft configuration. */
const STORAGE_KEY = 'weft:config';

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export type WeftConfigContextValue = {
  /** Resolved semantic token set derived from the active paradigm + profiles. */
  semantics: AppSemantics;
  /** Currently active paradigm (e.g. "light" | "dark" | custom). */
  paradigm: Paradigm;
  /** List of active accessibility overrides. */
  activeProfiles: AccessibilityProfile[];
  /** Current icon customization config. */
  icons: IconConfig;
  /** Current typography customization config. */
  font: FontConfig;
  /** Current wallpaper configuration. */
  wallpaper: WallpaperConfig;
  /** Active widgets with their order and settings. */
  widgets: WidgetConfig[];
  /** Gesture bindings for 4 swipe directions. */
  gestures: GestureBindings;
  /** Ordered package names pinned to the home grid. */
  pinnedApps: string[];
  /**
   * True once the persisted config has been read from AsyncStorage (or the
   * read has failed gracefully).  Use this to gate rendering in App.tsx so
   * the UI never flashes the wrong theme on first launch.
   */
  isHydrated: boolean;
  /** Replace the active paradigm and persist the change. */
  setParadigm: (paradigm: Paradigm) => void;
  /** Toggle an accessibility profile on/off and persist the change. */
  toggleProfile: (profile: AccessibilityProfile) => void;
  /** Merge a partial IconConfig into the current icons config. */
  setIcons: (icons: Partial<IconConfig>) => void;
  /** Merge a partial FontConfig into the current font config. */
  setFont: (font: Partial<FontConfig>) => void;
  /** Merge a partial WallpaperConfig into the current wallpaper config. */
  setWallpaper: (wallpaper: Partial<WallpaperConfig>) => void;
  /** Enable or disable a widget. */
  setWidgetEnabled: (id: string, enabled: boolean) => void;
  /** Update widget-specific settings. */
  setWidgetSettings: (id: string, settings: Record<string, any>) => void;
  /** Reorder widgets by providing new order array. */
  reorderWidgets: (newOrder: string[]) => void;
  /** Update a gesture binding. */
  setGestureBinding: (direction: keyof GestureBindings, action: GestureAction) => void;
  /** Replace the list of package names pinned to the home grid. */
  setPinnedApps: (packages: string[]) => void;
};

// ---------------------------------------------------------------------------
// Context object
// ---------------------------------------------------------------------------

export const WeftConfigContext = createContext<WeftConfigContextValue | null>(null);
WeftConfigContext.displayName = 'WeftConfigContext';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
  /**
   * Optional seed config.  Values supplied here take precedence over
   * DEFAULT_CONFIG but are overridden by whatever is already persisted in
   * AsyncStorage once hydration completes.
   */
  initialConfig?: Partial<WeftConfig>;
};

export function WeftConfigProvider({ children, initialConfig }: Props) {
  // Start with the merged default so the UI renders something sensible even
  // before AsyncStorage responds.
  const [config, setConfig] = useState<WeftConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  // Becomes true once the AsyncStorage read (or its error handler) resolves.
  const [isHydrated, setIsHydrated] = useState(false);

  // Guard that prevents the persistence effect from writing back the config
  // that was just read from storage (which would be a no-op but noisy).
  const skipNextPersist = useRef(false);

  // -------------------------------------------------------------------------
  // Hydration – load persisted config on mount (runs once)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) {
          return;
        }
        if (raw !== null) {
          const parsed: Partial<WeftConfig> = JSON.parse(raw);
          // Merge with DEFAULT_CONFIG so any new fields added in a later app
          // version get their defaults rather than being undefined.
          skipNextPersist.current = true;
          setConfig(prev => ({ ...DEFAULT_CONFIG, ...prev, ...parsed }));
        }
      } catch (err) {
        // Storage read or JSON parse failed – fall back to the in-memory
        // default that was set by useState above.
        console.warn('[WeftConfig] Failed to load persisted config:', err);
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty – only run once on mount

  // -------------------------------------------------------------------------
  // Persistence – save config to AsyncStorage whenever it changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Skip the very first write that would immediately follow hydration to
    // avoid a redundant round-trip.
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }

    // Only persist after we have a fully hydrated state so we don't
    // accidentally overwrite stored data with the transient initial state.
    if (!isHydrated) {
      return;
    }

    async function persist() {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (err) {
        console.warn('[WeftConfig] Failed to persist config:', err);
      }
    }

    persist();
  }, [config, isHydrated]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const semantics = useMemo(() => {
    const base = compose(config.paradigm, config.activeProfiles);
    // Apply user icon size over the paradigm default
    return {
      ...base,
      component: {
        ...base.component,
        appIcon: {
          ...base.component.appIcon,
          containerSize: config.icons.size,
        },
      },
    } as typeof base;
  }, [config.paradigm, config.activeProfiles, config.icons.size]);

  // -------------------------------------------------------------------------
  // Setters
  // -------------------------------------------------------------------------

  // Defer config state updates until after any in-flight touch animations
  // complete. Paradigm and profile switches can trigger heavy re-renders
  // (semantics recompose + full tree re-style). Running them after interactions
  // prevents jank on the swipe/tap gesture that triggered the change.
  const setParadigm = useCallback((paradigm: Paradigm) => {
    InteractionManager.runAfterInteractions(() => {
      setConfig(prev => ({ ...prev, paradigm }));
    });
  }, []);

  const toggleProfile = useCallback((profile: AccessibilityProfile) => {
    InteractionManager.runAfterInteractions(() => {
      setConfig(prev => {
        const has = prev.activeProfiles.includes(profile);
        return {
          ...prev,
          activeProfiles: has
            ? prev.activeProfiles.filter(p => p !== profile)
            : [...prev.activeProfiles, profile],
        };
      });
    });
  }, []);

  const setIcons = useCallback((icons: Partial<IconConfig>) => {
    setConfig(prev => ({ ...prev, icons: { ...prev.icons, ...icons } }));
  }, []);

  const setFont = useCallback((font: Partial<FontConfig>) => {
    setConfig(prev => ({ ...prev, font: { ...prev.font, ...font } }));
  }, []);

  const setWallpaper = useCallback((wallpaper: Partial<WallpaperConfig>) => {
    setConfig(prev => ({ ...prev, wallpaper: { ...prev.wallpaper, ...wallpaper } }));
  }, []);

  const setWidgetEnabled = useCallback((id: string, enabled: boolean) => {
    setConfig(prev => {
      const existing = prev.widgets.find(w => w.id === id);
      if (existing) {
        // Update existing widget
        return {
          ...prev,
          widgets: prev.widgets.map(w => w.id === id ? { ...w, enabled } : w),
        };
      } else {
        // Add new widget
        const maxOrder = prev.widgets.reduce((max, w) => Math.max(max, w.order), -1);
        return {
          ...prev,
          widgets: [
            ...prev.widgets,
            { id, enabled, order: maxOrder + 1, settings: {} },
          ],
        };
      }
    });
  }, []);

  const setWidgetSettings = useCallback((id: string, settings: Record<string, any>) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === id ? { ...w, settings: { ...w.settings, ...settings } } : w
      ),
    }));
  }, []);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    setConfig(prev => {
      const widgetMap = new Map(prev.widgets.map(w => [w.id, w]));
      return {
        ...prev,
        widgets: newOrder
          .map((id, index) => {
            const widget = widgetMap.get(id);
            return widget ? { ...widget, order: index } : null;
          })
          .filter((w): w is WidgetConfig => w !== null),
      };
    });
  }, []);

  const setGestureBinding = useCallback(
    (direction: keyof GestureBindings, action: GestureAction) => {
      setConfig(prev => ({
        ...prev,
        gestures: { ...prev.gestures, [direction]: action },
      }));
    },
    []
  );

  const setPinnedApps = useCallback((packages: string[]) => {
    setConfig(prev => ({ ...prev, pinnedApps: packages }));
  }, []);

  // -------------------------------------------------------------------------
  // Context value (memoised to avoid unnecessary re-renders downstream)
  // -------------------------------------------------------------------------

  const value = useMemo<WeftConfigContextValue>(
    () => ({
      semantics,
      paradigm: config.paradigm,
      activeProfiles: config.activeProfiles,
      icons: config.icons,
      font: config.font,
      wallpaper: config.wallpaper,
      widgets: config.widgets,
      gestures: config.gestures,
      pinnedApps: config.pinnedApps,
      isHydrated,
      setParadigm,
      toggleProfile,
      setIcons,
      setFont,
      setWallpaper,
      setWidgetEnabled,
      setWidgetSettings,
      reorderWidgets,
      setGestureBinding,
      setPinnedApps,
    }),
    [
      semantics,
      config.paradigm,
      config.activeProfiles,
      config.icons,
      config.icons.size,
      config.font,
      config.wallpaper,
      config.widgets,
      config.gestures,
      config.pinnedApps,
      isHydrated,
      setParadigm,
      toggleProfile,
      setIcons,
      setFont,
      setWallpaper,
      setWidgetEnabled,
      setWidgetSettings,
      reorderWidgets,
      setGestureBinding,
      setPinnedApps,
    ],
  );

  return (
    <WeftConfigContext.Provider value={value}>
      {children}
    </WeftConfigContext.Provider>
  );
}
