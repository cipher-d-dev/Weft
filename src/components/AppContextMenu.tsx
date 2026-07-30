/**
 * Weft — AppContextMenu
 *
 * Long-press context menu that appears over an app icon. Renders as a full-
 * screen absolute overlay with a semi-transparent scrim and a spring-animated
 * card. All visual tokens come from semantics.component.contextMenu.
 *
 * Design: icon-first rows, no emojis, clean geometric vector icons rendered
 * entirely from View/StyleSheet primitives — no native icon library required.
 *
 * Positioning: card sits above the anchor when in the lower half of the screen,
 * below it otherwise.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from 'react-native';
import type { AccessibilityProfile } from '../context/types';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnchorPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AppContextMenuProps = {
  visible: boolean;
  packageName: string;
  appLabel: string;
  isSystemApp: boolean;
  anchorPosition: AnchorPosition | null;
  onDismiss: () => void;
  onOpen: () => void;
  onAppInfo: () => void;
  onUninstall: () => void;
  onAddToDock: () => void;
  onRemoveFromHome: () => void;
};

// ---------------------------------------------------------------------------
// Spring config
// ---------------------------------------------------------------------------

const SPRING_CONFIG = {
  tension: 280,
  friction: 22,
  useNativeDriver: true,
} as const;

const CARD_WIDTH = 248;

// ---------------------------------------------------------------------------
// Inline vector icons — pure View/StyleSheet, zero native dependencies
// ---------------------------------------------------------------------------

/** Play / launch arrow */
function IconPlay({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 0, height: 0,
        borderTopWidth: size * 0.38, borderBottomWidth: size * 0.38,
        borderLeftWidth: size * 0.65, borderTopColor: 'transparent',
        borderBottomColor: 'transparent', borderLeftColor: color,
        marginLeft: size * 0.08,
      }} />
    </View>
  );
}

/** Info circle — ring + dot + stem */
function IconInfo({ color, size }: { color: string; size: number }) {
  const r = size / 2;
  const border = size * 0.1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: r,
        borderWidth: border, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{ width: border * 1.6, height: border * 1.6, borderRadius: border,
          backgroundColor: color, marginBottom: size * 0.04 }} />
        <View style={{ width: border * 1.4, height: size * 0.28, borderRadius: border / 2,
          backgroundColor: color, marginTop: size * 0.01 }} />
      </View>
    </View>
  );
}

/** Pin icon — circle with stem */
function IconPin({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.55, height: size * 0.55, borderRadius: size * 0.28,
        backgroundColor: color, marginBottom: size * 0.04 }} />
      <View style={{ width: size * 0.1, height: size * 0.3, borderRadius: size * 0.05,
        backgroundColor: color }} />
    </View>
  );
}

/** Minus-in-circle (remove) */
function IconRemove({ color, size }: { color: string; size: number }) {
  const r = size / 2;
  const border = size * 0.1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: r,
        borderWidth: border, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{ width: size * 0.5, height: border * 1.4, borderRadius: border,
          backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Trash bin */
function IconTrash({ color, size }: { color: string; size: number }) {
  const sw = size * 0.08;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Lid */}
      <View style={{ width: size * 0.7, height: sw * 1.4, backgroundColor: color,
        borderRadius: sw, marginBottom: sw }} />
      {/* Body */}
      <View style={{ width: size * 0.56, height: size * 0.52, borderWidth: sw,
        borderColor: color, borderRadius: sw,
        alignItems: 'center', justifyContent: 'space-around', flexDirection: 'row',
        paddingHorizontal: sw,
      }}>
        <View style={{ width: sw, height: '70%', borderRadius: sw / 2,
          backgroundColor: color }} />
        <View style={{ width: sw, height: '70%', borderRadius: sw / 2,
          backgroundColor: color }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AppContextMenu = React.memo<AppContextMenuProps>(
  ({
    visible,
    appLabel,
    isSystemApp,
    anchorPosition,
    onDismiss,
    onOpen,
    onAppInfo,
    onUninstall,
    onAddToDock,
    onRemoveFromHome,
  }) => {
    const { semantics, activeProfiles } = useWeftConfig();
    const cm = semantics.component.contextMenu;

    const isCognitive = activeProfiles.includes('cognitive' as AccessibilityProfile);

    const scaleAnim   = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // ── Animation ────────────────────────────────────────────────────────────
    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, ...SPRING_CONFIG }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 0, ...SPRING_CONFIG }),
        ]).start();
      }
    }, [visible, scaleAnim, opacityAnim]);

    // ── Positioning ───────────────────────────────────────────────────────────
    const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
    let cardStyle: ViewStyle = {};

    if (anchorPosition !== null) {
      const anchorCenterX = anchorPosition.x + anchorPosition.width / 2;
      const anchorCenterY = anchorPosition.y + anchorPosition.height / 2;
      const isBottomHalf = anchorCenterY > screenHeight / 2;
      const rawLeft = anchorCenterX - CARD_WIDTH / 2;
      const clampedLeft = Math.max(8, Math.min(rawLeft, screenWidth - CARD_WIDTH - 8));

      if (isBottomHalf) {
        cardStyle = { position: 'absolute', bottom: screenHeight - anchorPosition.y + 8,
          left: clampedLeft, width: CARD_WIDTH };
      } else {
        cardStyle = { position: 'absolute',
          top: anchorPosition.y + anchorPosition.height + 8,
          left: clampedLeft, width: CARD_WIDTH };
      }
    } else {
      cardStyle = { position: 'absolute', top: screenHeight / 2 - 180,
        left: screenWidth / 2 - CARD_WIDTH / 2, width: CARD_WIDTH };
    }

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleOpen        = useCallback(() => { onDismiss(); onOpen(); },          [onDismiss, onOpen]);
    const handleAppInfo     = useCallback(() => { onDismiss(); onAppInfo(); },        [onDismiss, onAppInfo]);
    const handleAddToDock   = useCallback(() => { onDismiss(); onAddToDock(); },      [onDismiss, onAddToDock]);
    const handleRemove      = useCallback(() => { onDismiss(); onRemoveFromHome(); }, [onDismiss, onRemoveFromHome]);
    const handleUninstall   = useCallback(() => {
      if (isSystemApp) return;
      onDismiss(); onUninstall();
    }, [isSystemApp, onDismiss, onUninstall]);

    const iconSize = Math.round(cm.itemHeight * 0.36);
    const shadow   = cm.shadow;

    return (
      <View style={[styles.root, { zIndex: 500, pointerEvents: visible ? 'auto' : 'none' }]}>
        {/* Scrim */}
        <TouchableWithoutFeedback onPress={onDismiss} accessible={false}>
          <Animated.View style={[styles.scrim, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>

        {/* Card */}
        <Animated.View
          style={[
            cardStyle,
            styles.card,
            {
              backgroundColor: cm.background,
              borderRadius: cm.radius,
              borderWidth: 1,
              borderColor: cm.border,
              elevation: shadow.elevation,
              shadowColor: shadow.shadowColor,
              shadowOffset: shadow.shadowOffset,
              shadowOpacity: shadow.shadowOpacity,
              shadowRadius: shadow.shadowRadius,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          accessible={false}
        >
          {/* App name header */}
          <View style={[styles.headerRow, { height: cm.itemHeight, paddingHorizontal: cm.itemPaddingH }]}
            accessible accessibilityRole="header" accessibilityLabel={appLabel}>
            <Text numberOfLines={1} style={[styles.headerLabel, {
              color: cm.labelColor, fontFamily: cm.labelType.fontFamily,
              fontSize: cm.labelType.fontSize, fontWeight: '600',
              letterSpacing: cm.labelType.letterSpacing, opacity: 0.55,
            }]}>
              {appLabel}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: cm.dividerColor }]} />

          {/* Open */}
          <MenuItem
            icon={<IconPlay color={cm.labelColor} size={iconSize} />}
            label="Open"
            cm={cm}
            onPress={handleOpen}
          />

          {/* App Info */}
          <MenuItem
            icon={<IconInfo color={cm.labelColor} size={iconSize} />}
            label="App Info"
            cm={cm}
            onPress={handleAppInfo}
          />

          {/* Add to Home — hidden in Cognitive */}
          {!isCognitive && (
            <MenuItem
              icon={<IconPin color={cm.labelColor} size={iconSize} />}
              label="Add to Home"
              cm={cm}
              onPress={handleAddToDock}
            />
          )}

          {/* Remove from Home — hidden in Cognitive */}
          {!isCognitive && (
            <MenuItem
              icon={<IconRemove color={cm.labelColor} size={iconSize} />}
              label="Remove from Home"
              cm={cm}
              onPress={handleRemove}
            />
          )}

          <View style={[styles.divider, { backgroundColor: cm.dividerColor }]} />

          {/* Uninstall — destructive */}
          <MenuItem
            icon={<IconTrash color={isSystemApp ? cm.labelColor : cm.destructiveColor} size={iconSize} />}
            label="Uninstall"
            cm={cm}
            labelColor={isSystemApp ? cm.labelColor : cm.destructiveColor}
            onPress={handleUninstall}
            disabled={isSystemApp}
          />
        </Animated.View>
      </View>
    );
  },
);

AppContextMenu.displayName = 'AppContextMenu';

// ---------------------------------------------------------------------------
// MenuItem atom
// ---------------------------------------------------------------------------

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  cm: ReturnType<typeof useWeftConfig>['semantics']['component']['contextMenu'];
  labelColor?: string;
  onPress: () => void;
  disabled?: boolean;
};

const MenuItem = React.memo<MenuItemProps>(
  ({ icon, label, cm, labelColor, onPress, disabled = false }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      activeOpacity={0.65}
      style={[
        styles.menuItem,
        { height: cm.itemHeight, paddingHorizontal: cm.itemPaddingH, opacity: disabled ? 0.3 : 1 },
      ]}
    >
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text
        numberOfLines={1}
        style={{
          color: labelColor ?? cm.labelColor,
          fontFamily: cm.labelType.fontFamily,
          fontSize: cm.labelType.fontSize,
          fontWeight: cm.labelType.fontWeight as '400' | '500' | '600',
          letterSpacing: cm.labelType.letterSpacing,
          lineHeight: cm.labelType.lineHeight,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  ),
);

MenuItem.displayName = 'MenuItem';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  card: { overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLabel: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { AppContextMenu };
