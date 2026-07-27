/**
 * useWallpaper
 *
 * JS bridge over WallpaperSetModule (Kotlin). Provides:
 * - setFromGallery()   — pick photo from device gallery via react-native ImagePicker
 * - setFromUri()       — set wallpaper from any URI (Unsplash download, bundled asset)
 * - setFromBase64()    — set wallpaper from base64 string
 * - extractColor()     — extract dominant palette from a base64 string
 * - All methods return typed result objects
 *
 * Does NOT depend on react-native-image-picker being installed.
 * Gallery picking is handled via the platform's ACTION_PICK intent through
 * a lightweight approach using Linking or a simple NativeModules call.
 *
 * Since react-native-image-picker may not be installed, we expose
 * setFromUri() and the caller provides the URI (WallpaperPickerSheet handles
 * the picker UI separately).
 */

import { NativeModules } from 'react-native';

const { WallpaperSet } = NativeModules as {
  WallpaperSet?: {
    setWallpaperFromBase64(data: string, target: string): Promise<{ success?: boolean; target?: string }>;
    setWallpaperFromUri(uri: string, target: string): Promise<{ success?: boolean; target?: string }>;
    extractDominantColor(data: string): Promise<{
      dominant?: string;
      vibrant?: string;
      muted?: string;
      darkVibrant?: string;
      darkMuted?: string;
    }>;
  };
};

export type WallpaperTarget = 'home' | 'lock' | 'both';

export type SetWallpaperResult =
  | { success: true; target: WallpaperTarget }
  | { error: string };

export type DominantColors = {
  dominant?: string;
  vibrant?: string;
  muted?: string;
  darkVibrant?: string;
  darkMuted?: string;
};

export const WallpaperAPI = {
  async setFromUri(
    uri: string,
    target: WallpaperTarget = 'both',
  ): Promise<SetWallpaperResult> {
    if (!WallpaperSet) return { error: 'WallpaperSet module not available' };
    try {
      const result = await WallpaperSet.setWallpaperFromUri(uri, target);
      if (result?.success) return { success: true, target };
      return { error: 'Failed to set wallpaper' };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },

  async setFromBase64(
    base64: string,
    target: WallpaperTarget = 'both',
  ): Promise<SetWallpaperResult> {
    if (!WallpaperSet) return { error: 'WallpaperSet module not available' };
    try {
      const result = await WallpaperSet.setWallpaperFromBase64(base64, target);
      if (result?.success) return { success: true, target };
      return { error: 'Failed to set wallpaper' };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },

  async extractDominantColor(base64: string): Promise<DominantColors> {
    if (!WallpaperSet) return {};
    try {
      return await WallpaperSet.extractDominantColor(base64);
    } catch {
      return {};
    }
  },
} as const;
