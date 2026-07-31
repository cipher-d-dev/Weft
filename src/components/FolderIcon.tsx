/**
 * Weft — FolderIcon
 *
 * Renders a folder as a rounded container holding a 2×2 grid of up to 4
 * mini app icons (same pattern as iOS/Android folder previews).
 *
 * Tapping opens the FolderModal. Long-press enters edit mode on the home grid.
 * In edit mode shows a wiggle animation and a delete handle.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Vibration,
  View,
} from 'react-native';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { CATEGORY_META } from '../utils/appCategories';
import type { FolderItem } from '../context/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type FolderIconProps = {
  folder: FolderItem;
  apps: AppDetail[];
  /** Called when the folder is tapped (open modal). */
  onOpen: () => void;
  /** Called on long-press with position info. */
  onLongPressPosition?: (pos: { x: number; y: number; width: number; height: number }) => void;
  editMode?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FolderIcon = React.memo<FolderIconProps>(({
  folder,
  apps,
  onOpen,
  onLongPressPosition,
  editMode = false,
}) => {
  const { semantics } = useWeftConfig();
  const ai = semantics.component.appIcon;
  const size = ai.containerSize;
  const folderSize = size; // folder cell is same size as an app icon cell

  // Resolve first 4 app icons for the preview grid
  const byPkg = new Map(apps.map(a => [a.packageName, a]));
  const previewApps = folder.packageNames
    .slice(0, 4)
    .map(p => byPkg.get(p))
    .filter((a): a is AppDetail => a !== undefined);

  // Folder background color from category meta
  const catColor = folder.category
    ? CATEGORY_META[folder.category].color
    : '#607D8B';

  // ── Animations ────────────────────────────────────────────────────────────
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const wiggleLoop = useRef<Animated.CompositeAnimation | null>(null);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (editMode) {
      const phaseDelay = Math.random() * 120;
      wiggleLoop.current = Animated.loop(
        Animated.sequence([
          Animated.delay(phaseDelay),
          Animated.timing(wiggleAnim, { toValue: 1,  duration: 100, useNativeDriver: true }),
          Animated.timing(wiggleAnim, { toValue: -1, duration: 200, useNativeDriver: true }),
          Animated.timing(wiggleAnim, { toValue: 0,  duration: 100, useNativeDriver: true }),
        ]),
      );
      wiggleLoop.current.start();
    } else {
      wiggleLoop.current?.stop();
      Animated.spring(wiggleAnim, { toValue: 0, tension: 300, friction: 12, useNativeDriver: true }).start();
    }
    return () => { wiggleLoop.current?.stop(); };
  }, [editMode, wiggleAnim]);

  const wiggleRotate = wiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  const handlePressIn = useCallback(() => {
    if (editMode) return;
    Animated.spring(scaleAnim, { toValue: 0.86, tension: 400, friction: 12, useNativeDriver: true }).start();
  }, [scaleAnim, editMode]);

  const handlePressOut = useCallback(() => {
    if (editMode) return;
    Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 14, useNativeDriver: true }).start();
  }, [scaleAnim, editMode]);

  const handlePress = useCallback(() => {
    if (editMode) return;
    onOpen();
  }, [editMode, onOpen]);

  const handleLongPress = useCallback(() => {
    Vibration.vibrate(50);
    if (onLongPressPosition && containerRef.current) {
      containerRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        onLongPressPosition({ x: pageX, y: pageY, width, height });
      });
    }
  }, [onLongPressPosition]);

  // Mini icon size: 4 icons in a 2×2 grid with a little padding
  // Use percentage-based slots so the 2-column layout is always guaranteed
  // regardless of rounding. Each slot is 50% of the folder width.
  const innerPad = Math.round(folderSize * 0.1);
  const innerSize = folderSize - innerPad * 2;
  const miniPad = Math.round(innerSize * 0.055);
  const miniSize = Math.round((innerSize - miniPad * 2) / 2);
  const miniRadius = Math.round(miniSize * 0.22);

  return (
    <TouchableWithoutFeedback
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityLabel={`${folder.name} folder, ${folder.packageNames.length} apps`}
      accessibilityRole="button"
    >
      <Animated.View
        ref={containerRef}
        style={[
          styles.outer,
          { transform: [{ scale: scaleAnim }, { rotate: wiggleRotate }] },
        ]}
      >
        {/* Folder container */}
        <View
          style={[
            styles.container,
            {
              width: folderSize,
              height: folderSize,
              borderRadius: folderSize * 0.22,
              backgroundColor: catColor + 'CC', // semi-transparent
              borderColor: catColor + '66',
            },
          ]}
        >
          {/* 2×2 mini icon grid — explicit row/col layout for reliable 2-per-row */}
          <View style={[styles.grid, { padding: innerPad, gap: miniPad }]}>
            {Array.from({ length: 4 }).map((_, i) => {
              const app = previewApps[i];
              return (
                <View
                  key={i}
                  style={[
                    styles.miniSlot,
                    {
                      width: miniSize,
                      height: miniSize,
                      borderRadius: miniRadius,
                    },
                  ]}
                >
                  {app ? (
                    <Image
                      source={{ uri: app.icon }}
                      style={{ width: miniSize, height: miniSize, borderRadius: miniRadius }}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Edit mode delete handle */}
        {editMode && (
          <View style={styles.deleteHandle}>
            <View style={[styles.deleteXBar, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.deleteXBar, { transform: [{ rotate: '-45deg' }] }]} />
          </View>
        )}

        {/* Folder label */}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              fontFamily: ai.labelType.fontFamily,
              fontSize: ai.labelType.fontSize,
              lineHeight: ai.labelType.lineHeight,
              fontWeight: ai.labelType.fontWeight,
              color: ai.labelColor,
              ...(ai.labelTextShadow !== null && {
                textShadowColor: ai.labelTextShadow.color,
                textShadowOffset: ai.labelTextShadow.offset,
                textShadowRadius: ai.labelTextShadow.radius,
              }),
            },
          ]}
        >
          {folder.name}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

FolderIcon.displayName = 'FolderIcon';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
  },
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  miniSlot: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  label: {
    textAlign: 'center',
    marginTop: 4,
  },
  deleteHandle: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
  },
  deleteXBar: {
    position: 'absolute',
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#ffffff',
  },
});
