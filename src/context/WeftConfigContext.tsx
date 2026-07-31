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
  FolderItem,
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
  /** Folders on the home grid. */
  folders: FolderItem[];
  /** Version of the last seeding run — compare to SEED_VERSION in HomeScreen. */
  seedVersion: number;
  /** Persist a new seedVersion after seeding completes. */
  setSeedVersion: (v: number) => void;
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
  /** Replace the list of package names pinned to the home grid. Also accepts an updater function. */
  setPinnedApps: (packages: string[] | ((prev: string[]) => string[])) => void;
  /** Replace the full folders list. */
  setFolders: (folders: FolderItem[] | ((prev: FolderItem[]) => FolderItem[])) => void;
  /** Add a new folder (or replace one with the same id). */
  upsertFolder: (folder: FolderItem) => void;
  /** Remove a folder by id. Apps inside it are moved back to pinnedApps. */
  removeFolder: (folderId: string) => void;
  /** Move an app into a folder (removes it from pinnedApps directly). */
  moveAppToFolder: (packageName: string, folderId: string) => void;
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

  const setPinnedApps = useCallback((packages: string[] | ((prev: string[]) => string[])) => {
    setConfig(prev => ({
      ...prev,
      pinnedApps: typeof packages === 'function' ? packages(prev.pinnedApps) : packages,
    }));
  }, []);

  const setSeedVersion = useCallback((v: number) => {
    setConfig(prev => ({ ...prev, seedVersion: v }));
  }, []);

  const setFolders = useCallback((folders: FolderItem[] | ((prev: FolderItem[]) => FolderItem[])) => {
    setConfig(prev => ({
      ...prev,
      folders: typeof folders === 'function' ? folders(prev.folders) : folders,
    }));
  }, []);

  const upsertFolder = useCallback((folder: FolderItem) => {
    setConfig(prev => {
      const exists = prev.folders.some(f => f.id === folder.id);
      const folders = exists
        ? prev.folders.map(f => f.id === folder.id ? folder : f)
        : [...prev.folders, folder];
      // Add sentinel to pinnedApps if this is a new folder
      const pinnedApps = exists
        ? prev.pinnedApps
        : [...prev.pinnedApps, `folder:${folder.id}`];
      return { ...prev, folders, pinnedApps };
    });
  }, []);

  const removeFolder = useCallback((folderId: string) => {
    setConfig(prev => {
      const folder = prev.folders.find(f => f.id === folderId);
      if (!folder) return prev;
      // Remove folder sentinel from pinnedApps, insert contained apps at that position
      const sentinelIdx = prev.pinnedApps.indexOf(`folder:${folderId}`);
      const newPinned = [...prev.pinnedApps];
      if (sentinelIdx >= 0) {
        newPinned.splice(sentinelIdx, 1, ...folder.packageNames);
      } else {
        newPinned.push(...folder.packageNames);
      }
      return {
        ...prev,
        folders: prev.folders.filter(f => f.id !== folderId),
        pinnedApps: newPinned,
      };
    });
  }, []);

  const moveAppToFolder = useCallback((packageName: string, folderId: string) => {
    setConfig(prev => {
      // Remove app from pinnedApps (if it's there directly)
      const pinnedApps = prev.pinnedApps.filter(p => p !== packageName);
      // Remove app from any other folder it's in
      const folders = prev.folders.map(f => {
        if (f.id === folderId) {
          // Add to target folder (avoid dupes)
          const already = f.packageNames.includes(packageName);
          return already ? f : { ...f, packageNames: [...f.packageNames, packageName] };
        }
        // Remove from any other folder
        return { ...f, packageNames: f.packageNames.filter(p => p !== packageName) };
      });
      return { ...prev, pinnedApps, folders };
    });
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
      folders: config.folders,
      seedVersion: config.seedVersion ?? 0,
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
      setSeedVersion,
      setFolders,
      upsertFolder,
      removeFolder,
      moveAppToFolder,
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
      config.folders,
      config.seedVersion,
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
      setSeedVersion,
      setFolders,
      upsertFolder,
      removeFolder,
      moveAppToFolder,
    ],
  );

  return (
    <WeftConfigContext.Provider value={value}>
      {children}
    </WeftConfigContext.Provider>
  );
}
