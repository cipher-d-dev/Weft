/**
 * useIconPack
 *
 * JS bridge over IconPackModule (Kotlin) with an in-memory LRU-style cache.
 * Provides:
 * - getInstalledPacks()     — list all installed icon packs
 * - getIcon(pkg, packPkg)   — load icon for app from pack (cached)
 * - getPreviewIcons(packPkg)— load first 6 icons from a pack for picker preview
 * - clearCache()            — clear the in-memory icon cache
 *
 * Icons are returned as "data:image/png;base64,..." data URIs ready for
 * use as Image source props.
 *
 * Cache strategy: simple Map keyed by "packPkg:appPkg".
 * Max 500 entries (launchers typically show ~50 apps per page; 500 is generous).
 */

import { NativeModules } from 'react-native';

const { IconPack } = NativeModules as {
  IconPack?: {
    getInstalledIconPacks(): Promise<Array<{ packageName: string; label: string; icon: string }>>;
    getIconFromPack(appPackageName: string, packPackageName: string): Promise<{ icon: string | null }>;
    getPackPreviewIcons(packPackageName: string): Promise<string[]>;
  };
};

export type IconPackInfo = {
  packageName: string;
  label: string;
  /** base64 PNG of the pack's own app icon, as data URI */
  icon: string;
};

const MAX_CACHE = 500;
const iconCache = new Map<string, string | null>();

function pruneCache() {
  if (iconCache.size <= MAX_CACHE) return;
  // Delete oldest entries (Map preserves insertion order)
  const toDelete = iconCache.size - MAX_CACHE;
  let count = 0;
  for (const key of iconCache.keys()) {
    iconCache.delete(key);
    if (++count >= toDelete) break;
  }
}

export const IconPackAPI = {
  async getInstalledPacks(): Promise<IconPackInfo[]> {
    if (!IconPack) return [];
    try {
      const packs = await IconPack.getInstalledIconPacks();
      return packs.map(p => ({
        ...p,
        icon: p.icon ? `data:image/png;base64,${p.icon}` : '',
      }));
    } catch {
      return [];
    }
  },

  async getIcon(
    appPackageName: string,
    packPackageName: string,
  ): Promise<string | null> {
    if (!IconPack) return null;
    const cacheKey = `${packPackageName}:${appPackageName}`;
    if (iconCache.has(cacheKey)) return iconCache.get(cacheKey) ?? null;

    try {
      const result = await IconPack.getIconFromPack(appPackageName, packPackageName);
      const dataUri = result.icon ? `data:image/png;base64,${result.icon}` : null;
      iconCache.set(cacheKey, dataUri);
      pruneCache();
      return dataUri;
    } catch {
      iconCache.set(cacheKey, null);
      return null;
    }
  },

  async getPreviewIcons(packPackageName: string): Promise<string[]> {
    if (!IconPack) return [];
    try {
      const icons = await IconPack.getPackPreviewIcons(packPackageName);
      return icons
        .filter(Boolean)
        .map(b64 => `data:image/png;base64,${b64}`);
    } catch {
      return [];
    }
  },

  clearCache() {
    iconCache.clear();
  },
} as const;
