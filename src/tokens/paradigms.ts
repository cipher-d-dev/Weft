/**
 * Weft — Paradigm Factories
 *
 * Tier 3a of the three-tier token system. Each factory returns a complete
 * AppSemantics object populated exclusively from primitive tokens.
 *
 * Rules:
 * - No raw values. Every assignment must trace back to a primitive.
 * - No branching inside components. Components never see the paradigm name.
 * - glassContainer is non-null only in semanticsGlass().
 */

import {
  neutral,
  glass,
  accentAmber,
  accentBlue,
  accentSage,
  alpha,
  spacing,
  radii,
  elevation,
  opacity,
  typography,
} from './primitives';
import type { AppSemantics } from './semantics';

// ---------------------------------------------------------------------------
// Helper — build a plain surface token block
// ---------------------------------------------------------------------------

type SurfaceArgs = {
  background: string;
  backgroundAlt: string;
  scrim: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
};

function surface(args: SurfaceArgs): AppSemantics['surface']['home'] {
  return args;
}

// ---------------------------------------------------------------------------
// semanticsSkeuo — warm textures, amber accent, layered depth
// ---------------------------------------------------------------------------

export function semanticsSkeuo(): AppSemantics {
  const homeSurface = surface({
    background: neutral[50],
    backgroundAlt: neutral[100],
    scrim: alpha.dark40,
    border: neutral[200],
    textPrimary: neutral[800],
    textSecondary: neutral[500],
    textDisabled: neutral[300],
  });

  return {
    surface: {
      home: homeSurface,
      controlCenter: surface({
        background: neutral[100],
        backgroundAlt: neutral[150],
        scrim: alpha.dark60,
        border: neutral[200],
        textPrimary: neutral[800],
        textSecondary: neutral[500],
        textDisabled: neutral[300],
      }),
      customization: surface({
        background: neutral[50],
        backgroundAlt: neutral[100],
        scrim: alpha.dark40,
        border: neutral[200],
        textPrimary: neutral[800],
        textSecondary: neutral[500],
        textDisabled: neutral[300],
      }),
      allApps: {
        background: neutral[50],
        searchBarBackground: neutral[100],
        searchBarBorder: neutral[200],
        searchBarText: neutral[800],
        searchBarPlaceholder: neutral[400],
        handleColor: neutral[300],
        indexBarText: neutral[400],
        indexBarActiveText: accentAmber[700],
        sectionHeaderText: neutral[500],
      },
      wallpaperPicker: {
        background: neutral[50],
        cardBackground: neutral[0],
        cardRadius: radii.lg,
        selectedBorder: accentAmber[500],
        selectedBorderWidth: 2.5,
        categoryChipBackground: neutral[100],
        categoryChipText: neutral[700],
        searchBarBackground: neutral[100],
        searchBarText: neutral[800],
      },
    },

    component: {
      tile: {
        background: neutral[0],
        backgroundSelected: accentAmber[100],
        backgroundPressed: neutral[100],
        backgroundDisabled: neutral[50],
        iconColor: neutral[700],
        labelColor: neutral[700],
        chipBackground: accentAmber[300],
        chipForeground: accentAmber[900],
        border: neutral[200],
        radius: radii.lg,
        touchTarget: 64,
        padding: spacing[4],
        shadow: elevation.sm,
        labelType: typography.labelSm,
        chipType: typography.captionMd,
      },
      slider: {
        trackBackground: neutral[150],
        trackFill: accentAmber[500],
        thumbFill: neutral[0],
        thumbBorder: accentAmber[500],
        trackHeight: 6,
        thumbSize: 22,
        trackRadius: radii.full,
      },
      toggle: {
        trackOff: neutral[200],
        trackOn: accentAmber[500],
        thumb: neutral[0],
        width: 50,
        height: 28,
        touchTarget: 44,
      },
      sectionHeader: {
        textColor: neutral[500],
        plateBackground: 'transparent',  // no plate in skeuo — clean label only
        plateRadius: radii.none,
        platePaddingV: 0,
        platePaddingH: 0,
        labelType: typography.labelSm,
      },
      widgetCard: {
        background: neutral[0],
        border: neutral[150],
        radius: radii.lg,
        padding: spacing[4],
        shadow: elevation.md,
      },
      dock: {
        background: `rgba(237, 232, 223, ${opacity[90]})`,
        border: neutral[200],
        radius: radii['2xl'],
        height: 80,
        paddingH: spacing[6],
        shadow: elevation.lg,
      },
      appIcon: {
        containerSize: 60,
        radius: radii.lg,
        shadow: {
          elevation: 2,
          shadowColor: '#5C4A32',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 2,
        },
        labelColor: neutral[800],
        labelType: typography.captionMd,
        labelTextShadow: null,  // light bg — no text shadow needed
      },
      glassContainer: null,
      contextMenu: {
        background: neutral[0],
        border: neutral[200],
        radius: radii.lg,
        itemHeight: 52,
        itemPaddingH: spacing[4],
        labelColor: neutral[800],
        labelType: typography.labelMd,
        dividerColor: neutral[150],
        destructiveColor: '#E53935',
        shadow: elevation.lg,
      },
      notificationBadge: {
        background: '#E53935',
        textColor: neutral[0],
        fontSize: 9,
        size: 16,
        borderColor: neutral[0],
        borderWidth: 1.5,
      },
    },

    state: {
      tile: {
        enabled: {
          background: neutral[0],
          border: neutral[200],
          iconColor: neutral[700],
          labelColor: neutral[700],
        },
        selected: {
          background: accentAmber[100],
          border: accentAmber[300],
          iconColor: accentAmber[700],
          labelColor: accentAmber[700],
        },
        pressed: {
          background: neutral[100],
          border: neutral[200],
          iconColor: neutral[600],
          labelColor: neutral[600],
        },
        disabled: {
          background: neutral[50],
          border: neutral[150],
          iconColor: neutral[300],
          labelColor: neutral[300],
        },
        focused: {
          background: neutral[0],
          border: accentAmber[500],
          iconColor: neutral[700],
          labelColor: neutral[700],
        },
      },
    },

    accent: {
      primary: accentAmber[500],
      subtle: accentAmber[100],
      onAccent: neutral[0],
    },

    layout: {
      screenPaddingH: spacing[4],
      sectionGap: spacing[6],
      gridGap: spacing[3],
      gridColumns: 4,
      thumbSide: 'center',
    },
  };
}

// ---------------------------------------------------------------------------
// semanticsGlass — frosted cool blues, blur tint, 22px radii
// ---------------------------------------------------------------------------

export function semanticsGlass(): AppSemantics {
  const homeSurface = surface({
    background: 'transparent',        // wallpaper shows through
    backgroundAlt: alpha.glass40,
    scrim: alpha.dark60,
    border: alpha.glass60,
    textPrimary: neutral[0],
    textSecondary: `rgba(255,255,255,${opacity[70]})`,
    textDisabled: `rgba(255,255,255,${opacity[30]})`,
  });

  return {
    surface: {
      home: homeSurface,
      controlCenter: surface({
        background: 'transparent',
        backgroundAlt: alpha.glass40,
        scrim: alpha.dark80,
        border: alpha.glass60,
        textPrimary: neutral[0],
        textSecondary: `rgba(255,255,255,${opacity[70]})`,
        textDisabled: `rgba(255,255,255,${opacity[30]})`,
      }),
      customization: surface({
        background: glass[900],
        backgroundAlt: glass[800],
        scrim: alpha.dark60,
        border: alpha.glass40,
        textPrimary: neutral[0],
        textSecondary: `rgba(255,255,255,${opacity[70]})`,
        textDisabled: `rgba(255,255,255,${opacity[30]})`,
      }),
      allApps: {
        background: glass[900],
        searchBarBackground: alpha.glass40,
        searchBarBorder: alpha.glass60,
        searchBarText: neutral[0],
        searchBarPlaceholder: `rgba(255,255,255,${opacity[40]})`,
        handleColor: alpha.glass60,
        indexBarText: `rgba(255,255,255,${opacity[50]})`,
        indexBarActiveText: accentBlue[300],
        sectionHeaderText: `rgba(255,255,255,${opacity[60]})`,
      },
      wallpaperPicker: {
        background: glass[900],
        cardBackground: alpha.glass40,
        cardRadius: radii.xl,
        selectedBorder: accentBlue[400],
        selectedBorderWidth: 2.5,
        categoryChipBackground: alpha.glass40,
        categoryChipText: neutral[0],
        searchBarBackground: alpha.glass40,
        searchBarText: neutral[0],
      },
    },

    component: {
      tile: {
        background: alpha.glass40,
        backgroundSelected: `rgba(33,150,243,${opacity[30]})`,
        backgroundPressed: alpha.glass60,
        backgroundDisabled: `rgba(255,255,255,${opacity[10]})`,
        iconColor: neutral[0],
        labelColor: neutral[0],
        chipBackground: `rgba(33,150,243,${opacity[40]})`,
        chipForeground: neutral[0],
        border: alpha.glass60,
        radius: radii.xl,         // 22px — glass-specific
        touchTarget: 64,
        padding: spacing[4],
        shadow: elevation.none,   // Glass: no elevation — depth comes from tint+blur
        labelType: typography.labelSm,
        chipType: typography.captionMd,
      },
      slider: {
        trackBackground: alpha.glass40,
        trackFill: accentBlue[500],
        thumbFill: neutral[0],
        thumbBorder: accentBlue[300],
        trackHeight: 6,
        thumbSize: 22,
        trackRadius: radii.full,
      },
      toggle: {
        trackOff: alpha.glass40,
        trackOn: accentBlue[500],
        thumb: neutral[0],
        width: 50,
        height: 28,
        touchTarget: 44,
      },
      sectionHeader: {
        textColor: neutral[0],
        plateBackground: alpha.glass40,
        plateRadius: radii.sm,
        platePaddingV: spacing[1],
        platePaddingH: spacing[3],
        labelType: typography.labelSm,
      },
      widgetCard: {
        background: alpha.glass40,
        border: alpha.glass60,
        radius: radii.xl,
        padding: spacing[4],
        shadow: elevation.md,
      },
      dock: {
        background: `rgba(10, 25, 47, 0.82)`,   // deep navy, not white glass — labels are white so dock must be dark
        border: alpha.glass60,
        radius: radii['2xl'],
        height: 80,
        paddingH: spacing[6],
        shadow: elevation.lg,
      },
      appIcon: {
        containerSize: 60,
        radius: radii.lg,
        shadow: {
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.45,
          shadowRadius: 8,
        },
        labelColor: neutral[0],
        labelType: typography.captionMd,
        labelTextShadow: {
          color: 'rgba(0,0,0,0.6)',
          offset: { width: 0, height: 1 },
          radius: 4,
        },
      },
      glassContainer: {
        tint: alpha.glass60,     // 60% white tint — deepens to 92% under Vision
        blurRadius: 40,
        radius: radii['2xl'],
      },
      contextMenu: {
        background: glass[800],
        border: alpha.glass60,
        radius: radii.xl,
        itemHeight: 52,
        itemPaddingH: spacing[4],
        labelColor: neutral[0],
        labelType: typography.labelMd,
        dividerColor: alpha.glass40,
        destructiveColor: '#EF5350',
        shadow: elevation.lg,
      },
      notificationBadge: {
        background: '#EF5350',
        textColor: neutral[0],
        fontSize: 9,
        size: 16,
        borderColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1.5,
      },
    },

    state: {
      tile: {
        enabled: {
          background: alpha.glass40,
          border: alpha.glass60,
          iconColor: neutral[0],
          labelColor: neutral[0],
        },
        selected: {
          background: `rgba(33,150,243,${opacity[30]})`,
          border: accentBlue[300],
          iconColor: neutral[0],
          labelColor: neutral[0],
        },
        pressed: {
          background: alpha.glass60,
          border: alpha.glass60,
          iconColor: `rgba(255,255,255,${opacity[80]})`,
          labelColor: `rgba(255,255,255,${opacity[80]})`,
        },
        disabled: {
          background: `rgba(255,255,255,${opacity[10]})`,
          border: `rgba(255,255,255,${opacity[20]})`,
          iconColor: `rgba(255,255,255,${opacity[30]})`,
          labelColor: `rgba(255,255,255,${opacity[30]})`,
        },
        focused: {
          background: alpha.glass40,
          border: accentBlue[300],
          iconColor: neutral[0],
          labelColor: neutral[0],
        },
      },
    },

    accent: {
      primary: accentBlue[500],
      subtle: `rgba(33,150,243,${opacity[20]})`,
      onAccent: neutral[0],
    },

    layout: {
      screenPaddingH: spacing[4],
      sectionGap: spacing[6],
      gridGap: spacing[3],
      gridColumns: 4,
      thumbSide: 'center',
    },
  };
}

// ---------------------------------------------------------------------------
// semanticsMinimal — flat, high contrast, neutral palette
// ---------------------------------------------------------------------------

export function semanticsMinimal(): AppSemantics {
  const homeSurface = surface({
    background: neutral[950],
    backgroundAlt: neutral[900],
    scrim: alpha.dark80,
    border: neutral[700],
    textPrimary: neutral[50],
    textSecondary: neutral[400],
    textDisabled: neutral[600],
  });

  return {
    surface: {
      home: homeSurface,
      controlCenter: surface({
        background: neutral[900],
        backgroundAlt: neutral[800],
        scrim: alpha.dark80,
        border: neutral[700],
        textPrimary: neutral[50],
        textSecondary: neutral[400],
        textDisabled: neutral[600],
      }),
      customization: surface({
        background: neutral[950],
        backgroundAlt: neutral[900],
        scrim: alpha.dark80,
        border: neutral[700],
        textPrimary: neutral[50],
        textSecondary: neutral[400],
        textDisabled: neutral[600],
      }),
      allApps: {
        background: neutral[950],
        searchBarBackground: neutral[900],
        searchBarBorder: neutral[700],
        searchBarText: neutral[50],
        searchBarPlaceholder: neutral[500],
        handleColor: neutral[600],
        indexBarText: neutral[500],
        indexBarActiveText: accentSage[300],
        sectionHeaderText: neutral[500],
      },
      wallpaperPicker: {
        background: neutral[950],
        cardBackground: neutral[900],
        cardRadius: radii.md,
        selectedBorder: accentSage[400],
        selectedBorderWidth: 2,
        categoryChipBackground: neutral[800],
        categoryChipText: neutral[200],
        searchBarBackground: neutral[900],
        searchBarText: neutral[50],
      },
    },

    component: {
      tile: {
        background: neutral[900],
        backgroundSelected: accentSage[700],
        backgroundPressed: neutral[800],
        backgroundDisabled: neutral[900],
        iconColor: neutral[50],
        labelColor: neutral[50],
        chipBackground: accentSage[700],
        chipForeground: neutral[50],
        border: neutral[700],
        radius: radii.md,          // tighter radius — minimal aesthetic
        touchTarget: 64,
        padding: spacing[4],
        shadow: elevation.none,    // flat — no shadows in minimal
        labelType: typography.labelSm,
        chipType: typography.captionMd,
      },
      slider: {
        trackBackground: neutral[700],
        trackFill: accentSage[500],
        thumbFill: neutral[50],
        thumbBorder: neutral[700],
        trackHeight: 4,            // thinner — minimal
        thumbSize: 20,
        trackRadius: radii.full,
      },
      toggle: {
        trackOff: neutral[700],
        trackOn: accentSage[500],
        thumb: neutral[50],
        width: 48,
        height: 26,
        touchTarget: 44,
      },
      sectionHeader: {
        textColor: neutral[400],
        plateBackground: 'transparent',  // no plate in minimal
        plateRadius: radii.none,
        platePaddingV: 0,
        platePaddingH: 0,
        labelType: typography.labelSm,
      },
      widgetCard: {
        background: neutral[900],
        border: neutral[700],
        radius: radii.md,
        padding: spacing[4],
        shadow: elevation.none,
      },
      dock: {
        background: neutral[900],
        border: neutral[700],
        radius: radii.lg,
        height: 72,
        paddingH: spacing[6],
        shadow: elevation.none,
      },
      appIcon: {
        containerSize: 56,           // slightly smaller — tighter grid
        radius: radii.md,
        shadow: elevation.none,
        labelColor: neutral[300],
        labelType: typography.captionMd,
        labelTextShadow: {
          color: 'rgba(0,0,0,0.5)',
          offset: { width: 0, height: 1 },
          radius: 3,
        },
      },
      glassContainer: null,
      contextMenu: {
        background: neutral[900],
        border: neutral[700],
        radius: radii.md,
        itemHeight: 52,
        itemPaddingH: spacing[4],
        labelColor: neutral[50],
        labelType: typography.labelMd,
        dividerColor: neutral[800],
        destructiveColor: '#EF5350',
        shadow: elevation.md,
      },
      notificationBadge: {
        background: '#EF5350',
        textColor: neutral[0],
        fontSize: 9,
        size: 16,
        borderColor: 'rgba(0,0,0,0.6)',
        borderWidth: 1.5,
      },
    },

    state: {
      tile: {
        enabled: {
          background: neutral[900],
          border: neutral[700],
          iconColor: neutral[50],
          labelColor: neutral[50],
        },
        selected: {
          background: accentSage[700],
          border: accentSage[500],
          iconColor: neutral[50],
          labelColor: neutral[50],
        },
        pressed: {
          background: neutral[800],
          border: neutral[600],
          iconColor: neutral[200],
          labelColor: neutral[200],
        },
        disabled: {
          background: neutral[900],
          border: neutral[800],
          iconColor: neutral[600],
          labelColor: neutral[600],
        },
        focused: {
          background: neutral[900],
          border: accentSage[500],
          iconColor: neutral[50],
          labelColor: neutral[50],
        },
      },
    },

    accent: {
      primary: accentSage[500],
      subtle: `rgba(76,175,80,${opacity[20]})`,
      onAccent: neutral[950],
    },

    layout: {
      screenPaddingH: spacing[4],
      sectionGap: spacing[6],
      gridGap: spacing[2],          // tighter grid gap in minimal
      gridColumns: 4,
      thumbSide: 'center',
    },
  };
}
