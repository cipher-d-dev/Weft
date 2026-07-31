/**
 * Weft — FolderModal
 *
 * Full-screen modal that opens when the user taps a folder icon.
 * Shows the folder name (editable), a grid of all apps inside the folder,
 * and a close button. Spring-animated scale-in from the folder position.
 *
 * Long-pressing an app inside the folder opens the same AppContextMenu used
 * on the home screen, anchored to the icon that was pressed.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RNLauncherKitHelper } from 'react-native-launcher-kit';
import type { AppDetail } from 'react-native-launcher-kit/lib/typescript/interfaces/InstalledApps';
import { useWeftConfig } from '../hooks/useWeftConfig';
import { AppIcon } from './AppIcon';
import { AppContextMenu } from './AppContextMenu';
import type { FolderItem } from '../context/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type FolderModalProps = {
  folder: FolderItem;
  apps: AppDetail[];
  visible: boolean;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FolderModal = React.memo<FolderModalProps>(({
  folder,
  apps,
  visible,
  onClose,
}) => {
  const { semantics, upsertFolder, setPinnedApps, pinnedApps } = useWeftConfig();
  const insets = useSafeAreaInsets();

  const s  = semantics;
  const bg = s.surface.home.background === 'transparent'
    ? 'rgba(12,20,40,0.92)'
    : s.surface.home.background;
  const textPrimary = s.surface.home.textPrimary;
  const textSec     = s.surface.home.textSecondary;
  const accent      = s.accent.primary;

  // ── Folder apps ───────────────────────────────────────────────────────────
  const byPkg = new Map(apps.map(a => [a.packageName, a]));
  const folderApps = folder.packageNames
    .map(p => byPkg.get(p))
    .filter((a): a is AppDetail => a !== undefined);

  // ── Editable name ─────────────────────────────────────────────────────────
  const [name, setName] = useState(folder.name);
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setName(folder.name);
  }, [folder.name]);

  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== folder.name) {
      upsertFolder({ ...folder, name: trimmed });
    } else {
      setName(folder.name);
    }
  }, [name, folder, upsertFolder]);

  // ── Context menu state ────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    packageName: string;
    appLabel: string;
    anchorPosition: { x: number; y: number; width: number; height: number } | null;
  } | null>(null);

  const dismissContextMenu = useCallback(() => {
    setContextMenu(prev => prev ? { ...prev, visible: false } : null);
  }, []);

  // ── Animation ─────────────────────────────────────────────────────────────
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, tension: 180, friction: 18, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 0.85, tension: 200, friction: 20, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,    duration: 130, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  // ── BackHandler ───────────────────────────────────────────────────────────
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (contextMenu?.visible) {
        dismissContextMenu();
        return true;
      }
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [visible, contextMenu, dismissContextMenu]);

  // ── App grid layout ───────────────────────────────────────────────────────
  const iconSize  = s.component.appIcon.containerSize;
  const { width: screenWidth } = useWindowDimensions();
  const columns   = 4;
  const gridGap   = s.layout.gridGap;
  const padH      = s.layout.screenPaddingH;

  // Each cell is exactly 1/4 of the card's usable width.
  // Card is screen - 32px (16px each side). Usable = card - 2*padH for the
  // contentContainerStyle padding, then divide by 4 columns.
  const cardInnerWidth = screenWidth - 32 - padH; // card left:16 right:16 + padH on content
  const cellWidth = Math.floor(cardInnerWidth / columns);

  const renderApp = useCallback(({ item }: { item: AppDetail }) => (
    <View style={[styles.gridCell, { width: cellWidth }]}>
      {/* Width-constrained wrapper — label cannot overflow this box */}
      <View style={{ width: cellWidth, alignItems: 'center', overflow: 'hidden' }}>
        <AppIcon
          icon={
            <Image
              source={{ uri: item.icon }}
              style={{ width: iconSize, height: iconSize, borderRadius: 12 }}
              resizeMode="cover"
            />
          }
          label={item.label}
          onPress={() => {
            RNLauncherKitHelper.launchApplication(item.packageName);
            onClose();
          }}
          onLongPressPosition={(pos) => {
            setContextMenu({
              visible: true,
              packageName: item.packageName,
              appLabel: item.label,
              anchorPosition: pos,
            });
          }}
        />
      </View>
    </View>
  ), [iconSize, cellWidth, onClose]);

  const keyExtractor = useCallback((item: AppDetail) => item.packageName, []);

  if (!visible && scaleAnim === scaleAnim) {
    // kept mounted for animation
  }

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { opacity: opacityAnim },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Scrim — tap to close */}
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      </TouchableWithoutFeedback>

      {/* Folder card */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: bg,
            borderColor: s.surface.home.border,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: padH,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close folder"
          activeOpacity={0.7}
        >
          <View style={[styles.closeBar, { backgroundColor: textSec, transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.closeBar, { backgroundColor: textSec, transform: [{ rotate: '-45deg' }], position: 'absolute' }]} />
        </TouchableOpacity>

        {/* Folder name — tap to edit */}
        {editingName ? (
          <TextInput
            ref={nameInputRef}
            value={name}
            onChangeText={setName}
            onBlur={commitName}
            onSubmitEditing={commitName}
            style={[styles.nameInput, { color: textPrimary, borderBottomColor: accent }]}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel="Folder name"
          />
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)} activeOpacity={0.7}>
            <Text style={[styles.folderName, { color: textPrimary }]} numberOfLines={1}>
              {name}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.appCount, { color: textSec }]}>
          {folderApps.length} {folderApps.length === 1 ? 'app' : 'apps'}
        </Text>

        {/* App grid */}
        <FlatList
          data={folderApps}
          renderItem={renderApp}
          keyExtractor={keyExtractor}
          numColumns={columns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          style={styles.flatList}
        />
      </Animated.View>

      {/* ── App context menu — rendered above the folder card ─────────── */}
      {contextMenu && (
        <AppContextMenu
          visible={contextMenu.visible}
          packageName={contextMenu.packageName}
          appLabel={contextMenu.appLabel}
          isSystemApp={false}
          anchorPosition={contextMenu.anchorPosition}
          onDismiss={dismissContextMenu}
          onOpen={() => {
            RNLauncherKitHelper.launchApplication(contextMenu.packageName);
            dismissContextMenu();
            onClose();
          }}
          onAppInfo={async () => {
            try {
              await Linking.openURL(
                `android-app://com.android.settings/com.android.settings.applications.InstalledAppDetails?inspecting_package=${contextMenu.packageName}`,
              );
            } catch {
              await Linking.openSettings();
            }
            dismissContextMenu();
          }}
          onUninstall={async () => {
            await Linking.openURL(`package:${contextMenu.packageName}`);
            dismissContextMenu();
          }}
          onAddToDock={() => {
            // Pin directly to home screen (outside folder)
            setPinnedApps(
              pinnedApps.includes(contextMenu.packageName)
                ? pinnedApps
                : [...pinnedApps, contextMenu.packageName],
            );
            dismissContextMenu();
          }}
          onRemoveFromHome={() => {
            // Remove from folder
            upsertFolder({
              ...folder,
              packageNames: folder.packageNames.filter(p => p !== contextMenu.packageName),
            });
            dismissContextMenu();
          }}
        />
      )}
    </Animated.View>
  );
});

FolderModal.displayName = 'FolderModal';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '10%',
    bottom: '10%',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBar: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  folderName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 2,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 2,
    borderBottomWidth: 2,
    paddingBottom: 2,
  },
  appCount: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    opacity: 0.7,
  },
  flatList: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 16,
  },
  // Each row is left-aligned so partial last rows don't center or stretch
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  gridCell: {
    // Width set inline from cellWidth calculation.
    // overflow hidden ensures label never bleeds outside the box.
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
});
