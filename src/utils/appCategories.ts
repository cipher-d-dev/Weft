/**
 * Weft — App Auto-Categorization
 *
 * Maps installed app package names to AppCategory values based on known
 * package-name prefixes and patterns. Used to auto-group apps into folders
 * on first run and when new apps are installed.
 *
 * Pattern priority: checked top-to-bottom, first match wins.
 */

import type { AppCategory, FolderItem } from '../context/types';

// ---------------------------------------------------------------------------
// Category patterns
// ---------------------------------------------------------------------------

type CategoryRule = {
  category: AppCategory;
  /** Substring match against the full package name (lowercased). */
  patterns: string[];
};

const RULES: CategoryRule[] = [
  {
    category: 'google',
    patterns: [
      'com.google.',
      'com.android.chrome',
      'com.google.android.youtube',
    ],
  },
  {
    category: 'social',
    patterns: [
      'com.instagram.',
      'com.facebook.',
      'com.twitter.',
      'com.snapchat.',
      'com.tiktok.',
      'com.zhiliaoapp.',  // TikTok alternate
      'com.linkedin.',
      'com.pinterest.',
      'com.reddit.',
      'com.tumblr.',
      'com.discord.',
    ],
  },
  {
    category: 'messaging',
    patterns: [
      'com.whatsapp',
      'com.telegram.',
      'org.telegram.',
      'com.viber.',
      'com.skype.',
      'com.microsoft.teams',
      'com.slack.',
      'com.android.mms',
      'com.google.android.apps.messaging',
      'com.android.messaging',
      'org.thoughtcrime.securesms',  // Signal
    ],
  },
  {
    category: 'media',
    patterns: [
      'com.spotify.',
      'com.soundcloud.',
      'com.netflix.',
      'com.amazon.avod.',
      'com.disney.',
      'com.hbo.',
      'tv.twitch.',
      'com.google.android.youtube',
      'com.google.android.apps.photos',
      'com.sec.android.gallery3d',
      'com.miui.gallery',
      'com.android.gallery3d',
      'com.vlc.',
      'org.videolan.vlc',
      'com.mx.player',
      'com.apple.music',
    ],
  },
  {
    category: 'games',
    patterns: [
      'com.king.',
      'com.supercell.',
      'com.mojang.',
      'com.roblox.',
      'com.ea.',
      'com.activision.',
      'com.pubg.',
      'com.tencent.ig',
      'com.miniclip.',
      'com.gameloft.',
      'com.rovio.',
    ],
  },
  {
    category: 'productivity',
    patterns: [
      'com.microsoft.office',
      'com.microsoft.word',
      'com.microsoft.excel',
      'com.microsoft.powerpoint',
      'com.microsoft.outlook',
      'com.microsoft.onenote',
      'com.microsoft.teams',
      'com.google.android.apps.docs',
      'com.google.android.apps.sheets',
      'com.google.android.apps.slides',
      'com.google.android.apps.drive',
      'com.google.android.apps.keep',
      'com.google.android.calendar',
      'com.google.android.apps.tasks',
      'com.todoist.',
      'com.notion.',
      'com.evernote.',
      'com.dropbox.android',
      'com.adobe.',
      'com.canva.',
    ],
  },
  {
    category: 'utilities',
    patterns: [
      'com.android.settings',
      'com.android.calculator',
      'com.android.calendar',
      'com.android.contacts',
      'com.android.phone',
      'com.android.dialer',
      'com.android.camera',
      'com.android.clock',
      'com.android.deskclock',
      'com.android.filemanager',
      'com.google.android.apps.wellbeing',
      'com.google.android.gm',  // Gmail
      'com.android.email',
      'com.samsung.android.',
      'com.sec.android.',
      'com.miui.',
      'com.oneplus.',
      'com.motorola.',
      'com.huawei.',
      'com.sony.',
    ],
  },
  {
    category: 'system',
    patterns: [
      'com.android.',
      'android.',
      'com.google.android.gms',
      'com.google.android.gsf',
      'com.qualcomm.',
      'com.mediatek.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Categorize a single package
// ---------------------------------------------------------------------------

export function categorizePackage(packageName: string): AppCategory {
  const lower = packageName.toLowerCase();
  for (const rule of RULES) {
    if (rule.patterns.some(p => lower.includes(p.toLowerCase()))) {
      return rule.category;
    }
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// Category display names and colors
// ---------------------------------------------------------------------------

export const CATEGORY_META: Record<AppCategory, { name: string; color: string }> = {
  google:       { name: 'Google',       color: '#4285F4' },
  social:       { name: 'Social',       color: '#E91E63' },
  messaging:    { name: 'Messaging',    color: '#00BCD4' },
  media:        { name: 'Media',        color: '#9C27B0' },
  games:        { name: 'Games',        color: '#FF5722' },
  productivity: { name: 'Productivity', color: '#2196F3' },
  utilities:    { name: 'Utilities',    color: '#607D8B' },
  system:       { name: 'System',       color: '#455A64' },
  other:        { name: 'Other',        color: '#78909C' },
};

// ---------------------------------------------------------------------------
// High-priority apps pinned directly on the home screen
// ---------------------------------------------------------------------------

/**
 * These package name prefixes/exact matches are placed directly on the home
 * screen instead of being buried inside a folder.  They represent the apps
 * users reach for most often.  First match wins (same priority order).
 */
const HOME_SCREEN_PRIORITY: string[] = [
  // Phone & messaging
  'com.android.dialer',
  'com.android.phone',
  'com.google.android.apps.messaging',
  'com.android.mms',
  'com.android.messaging',
  'com.samsung.android.dialer',
  'com.sec.android.app.dialertab',
  // Browser
  'com.android.chrome',
  'com.google.android.apps.chrome',
  'org.mozilla.firefox',
  // Camera & gallery
  'com.android.camera',
  'com.android.camera2',
  'com.google.android.GoogleCamera',
  'com.sec.android.app.camera',
  'com.android.gallery3d',
  'com.google.android.apps.photos',
  'com.sec.android.gallery3d',
  // Maps & navigation
  'com.google.android.apps.maps',
  // Email
  'com.google.android.gm',
  'com.android.email',
  // Clock & calendar
  'com.android.deskclock',
  'com.android.clock',
  'com.google.android.calendar',
  'com.android.calendar',
  // Settings
  'com.android.settings',
  // App store
  'com.android.vending',
];

/**
 * Returns true if the given package should be pinned directly on the home
 * screen rather than placed inside a folder.
 */
function isHomePriority(packageName: string): boolean {
  const lower = packageName.toLowerCase();
  return HOME_SCREEN_PRIORITY.some(p => lower === p.toLowerCase() || lower.startsWith(p.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Build initial folders from a full app list
// ---------------------------------------------------------------------------

/**
 * Groups a list of package names into FolderItem objects by category.
 * High-priority apps (phone, browser, camera, etc.) are pinned directly on
 * the home screen so the launcher feels populated rather than sparse.
 * Categories with fewer than 2 non-priority apps are skipped.
 * Returns both the folder list and the pinnedApps array where folder entries
 * use the "folder:<id>" sentinel instead of the package name directly.
 */
export function buildInitialFolders(packageNames: string[]): {
  folders: FolderItem[];
  pinnedApps: string[];
} {
  // Separate priority (home-screen) apps from folder candidates
  const homePkgs: string[] = [];
  const folderCandidates: string[] = [];

  for (const pkg of packageNames) {
    if (isHomePriority(pkg)) {
      homePkgs.push(pkg);
    } else {
      folderCandidates.push(pkg);
    }
  }

  // Group remaining packages by category
  const byCategory = new Map<AppCategory, string[]>();
  for (const pkg of folderCandidates) {
    const cat = categorizePackage(pkg);
    const bucket = byCategory.get(cat);
    if (bucket) {
      bucket.push(pkg);
    } else {
      byCategory.set(cat, [pkg]);
    }
  }

  const folders: FolderItem[] = [];
  const folderPkgSet = new Set<string>();

  for (const [category, pkgs] of byCategory) {
    // Only create a folder if there are at least 2 apps in the category
    if (pkgs.length < 2) continue;
    const id = `folder-${category}-${Date.now()}`;
    folders.push({
      id,
      name: CATEGORY_META[category].name,
      packageNames: pkgs,
      category,
    });
    pkgs.forEach(p => folderPkgSet.add(p));
  }

  // pinnedApps order:
  //   1. Priority apps (phone, browser, camera, etc.) — placed first so they
  //      appear prominently on page 0 of the home grid.
  //   2. Folder sentinels (sorted by category name).
  //   3. Any uncategorized singles that didn't make it into a folder.
  const pinnedApps: string[] = [];

  // 1. Home-screen priority apps (respect the original priority order)
  for (const priorityPkg of HOME_SCREEN_PRIORITY) {
    const match = homePkgs.find(p =>
      p.toLowerCase() === priorityPkg.toLowerCase() ||
      p.toLowerCase().startsWith(priorityPkg.toLowerCase())
    );
    if (match && !pinnedApps.includes(match)) {
      pinnedApps.push(match);
    }
  }

  // 2. Folder sentinels (sorted by category name)
  folders
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(f => pinnedApps.push(`folder:${f.id}`));

  // 3. Individual apps that weren't grouped into any folder
  for (const pkg of folderCandidates) {
    if (!folderPkgSet.has(pkg) && !pinnedApps.includes(pkg)) {
      pinnedApps.push(pkg);
    }
  }

  return { folders, pinnedApps };
}

// ---------------------------------------------------------------------------
// Find which folder an app should go into (for new installs)
// ---------------------------------------------------------------------------

/**
 * Given a new package name and the existing folders, returns the folder ID
 * that this app should be added to (based on category match), or null if
 * no matching folder exists.
 */
export function findFolderForPackage(
  packageName: string,
  folders: FolderItem[],
): string | null {
  const category = categorizePackage(packageName);
  const match = folders.find(f => f.category === category);
  return match ? match.id : null;
}
