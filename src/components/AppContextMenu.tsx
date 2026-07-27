/**
 * Weft — AppContextMenu
 *
 * Long-press context menu that appears over an app icon. Renders as a full-
 * screen absolute overlay with a semi-transparent scrim and a spring-animated
 * card. All visual tokens come from semantics.component.contextMenu — zero
 * inline colour overrides.
 *
 * Positioning logic: the card places itself above the anchor if the icon is
 * in the lower half of the screen, below it otherwise.
 *
 * Cognitive profile: "Add to Dock" and "Remove from Home" are hidden to reduce
 * visual noise. itemHeight is already raised by the Motor profile via tokens.
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

// Estimated card width — used to keep the card within screen bounds.
const CARD_WIDTH = 240;

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

    // Animated values — created once via useRef, never recreated.
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // -------------------------------------------------------------------------
    // Open / close animation
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (visible) {
        // Fade scrim in and spring the card open simultaneously.
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            ...SPRING_CONFIG,
          }),
        ]).start();
      } else {
        // Reverse: spring card back to 0 and fade scrim out.
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 0,
            ...SPRING_CONFIG,
          }),
        ]).start();
      }
    }, [visible, scaleAnim, opacityAnim]);

    // -------------------------------------------------------------------------
    // Card positioning
    // -------------------------------------------------------------------------

    const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

    let cardStyle: ViewStyle = {};

    if (anchorPosition !== null) {
      const anchorCenterX = anchorPosition.x + anchorPosition.width / 2;
      const anchorCenterY = anchorPosition.y + anchorPosition.height / 2;
      const isBottomHalf = anchorCenterY > screenHeight / 2;

      // Horizontal: centre over the icon, clamped to screen edges.
      const rawLeft = anchorCenterX - CARD_WIDTH / 2;
      const clampedLeft = Math.max(8, Math.min(rawLeft, screenWidth - CARD_WIDTH - 8));

      if (isBottomHalf) {
        // Place card above the icon.
        cardStyle = {
          position: 'absolute',
          bottom: screenHeight - anchorPosition.y + 8,
          left: clampedLeft,
          width: CARD_WIDTH,
        };
      } else {
        // Place card below the icon.
        cardStyle = {
          position: 'absolute',
          top: anchorPosition.y + anchorPosition.height + 8,
          left: clampedLeft,
          width: CARD_WIDTH,
        };
      }
    } else {
      // Fallback: centre of screen
      cardStyle = {
        position: 'absolute',
        top: screenHeight / 2 - 160,
        left: screenWidth / 2 - CARD_WIDTH / 2,
        width: CARD_WIDTH,
      };
    }

    // -------------------------------------------------------------------------
    // Item press handlers — stable references via useCallback
    // -------------------------------------------------------------------------

    const handleOpen = useCallback(() => {
      onDismiss();
      onOpen();
    }, [onDismiss, onOpen]);

    const handleAppInfo = useCallback(() => {
      onDismiss();
      onAppInfo();
    }, [onDismiss, onAppInfo]);

    const handleAddToDock = useCallback(() => {
      onDismiss();
      onAddToDock();
    }, [onDismiss, onAddToDock]);

    const handleRemoveFromHome = useCallback(() => {
      onDismiss();
      onRemoveFromHome();
    }, [onDismiss, onRemoveFromHome]);

    const handleUninstall = useCallback(() => {
      if (isSystemApp) return;
      onDismiss();
      onUninstall();
    }, [isSystemApp, onDismiss, onUninstall]);

    // -------------------------------------------------------------------------
    // Shadow spread for the card
    // -------------------------------------------------------------------------

    const shadow = cm.shadow;

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
      <View
        style={[styles.root, { zIndex: 500 }]}
        // When not visible, pass touches through so the home screen is usable.
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Scrim — tappable to dismiss */}
        <TouchableWithoutFeedback onPress={onDismiss} accessible={false}>
          <Animated.View
            style={[styles.scrim, { opacity: opacityAnim }]}
          />
        </TouchableWithoutFeedback>

        {/* Menu card */}
        <Animated.View
          style={[
            cardStyle,
            styles.card,
            {
              backgroundColor: cm.background,
              borderRadius: cm.radius,
              borderWidth: 1,
              borderColor: cm.border,
              // Shadow
              elevation: shadow.elevation,
              shadowColor: shadow.shadowColor,
              shadowOffset: shadow.shadowOffset,
              shadowOpacity: shadow.shadowOpacity,
              shadowRadius: shadow.shadowRadius,
              // Spring origin: card scales from its centre point
              transform: [{ scale: scaleAnim }],
            },
          ]}
          accessible={false}
        >
          {/* App label header — non-tappable */}
          <View
            style={[
              styles.headerRow,
              {
                height: cm.itemHeight,
                paddingHorizontal: cm.itemPaddingH,
              },
            ]}
            accessible
            accessibilityRole="header"
            accessibilityLabel={appLabel}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.headerLabel,
                {
                  color: cm.labelColor,
                  fontFamily: cm.labelType.fontFamily,
                  fontSize: cm.labelType.fontSize,
                  fontWeight: '600',
                  letterSpacing: cm.labelType.letterSpacing,
                  lineHeight: cm.labelType.lineHeight,
                  opacity: 0.6,
                },
              ]}
            >
              {appLabel}
            </Text>
          </View>

          {/* Divider under header */}
          <View style={[styles.divider, { backgroundColor: cm.dividerColor }]} />

          {/* Open */}
          <MenuItem
            emoji="▶️"
            label="Open"
            height={cm.itemHeight}
            paddingH={cm.itemPaddingH}
            labelColor={cm.labelColor}
            labelType={cm.labelType}
            onPress={handleOpen}
          />

          {/* App Info */}
          <MenuItem
            emoji="ℹ️"
            label="App Info"
            height={cm.itemHeight}
            paddingH={cm.itemPaddingH}
            labelColor={cm.labelColor}
            labelType={cm.labelType}
            onPress={handleAppInfo}
          />

          {/* Add to Dock — hidden in Cognitive profile */}
          {!isCognitive && (
            <MenuItem
              emoji="📌"
              label="Add to Dock"
              height={cm.itemHeight}
              paddingH={cm.itemPaddingH}
              labelColor={cm.labelColor}
              labelType={cm.labelType}
              onPress={handleAddToDock}
            />
          )}

          {/* Remove from Home — hidden in Cognitive profile */}
          {!isCognitive && (
            <MenuItem
              emoji="🗑️"
              label="Remove from Home"
              height={cm.itemHeight}
              paddingH={cm.itemPaddingH}
              labelColor={cm.labelColor}
              labelType={cm.labelType}
              onPress={handleRemoveFromHome}
            />
          )}

          {/* Divider before destructive action */}
          <View style={[styles.divider, { backgroundColor: cm.dividerColor }]} />

          {/* Uninstall — disabled and muted for system apps */}
          <MenuItem
            emoji="❌"
            label="Uninstall"
            height={cm.itemHeight}
            paddingH={cm.itemPaddingH}
            labelColor={isSystemApp ? cm.labelColor : cm.destructiveColor}
            labelType={cm.labelType}
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
// MenuItem — internal atom
// ---------------------------------------------------------------------------

type MenuItemProps = {
  emoji: string;
  label: string;
  height: number;
  paddingH: number;
  labelColor: string;
  labelType: { fontFamily: string; fontSize: number; fontWeight: string; letterSpacing: number; lineHeight: number };
  onPress: () => void;
  disabled?: boolean;
};

const MenuItem = React.memo<MenuItemProps>(
  ({ emoji, label, height, paddingH, labelColor, labelType, onPress, disabled = false }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        accessible
        accessibilityRole="menuitem"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        activeOpacity={0.7}
        style={[
          styles.menuItem,
          {
            height,
            paddingHorizontal: paddingH,
            opacity: disabled ? 0.35 : 1,
          },
        ]}
      >
        <Text style={styles.emoji} accessible={false}>
          {emoji}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: labelColor,
            fontFamily: labelType.fontFamily,
            fontSize: labelType.fontSize,
            fontWeight: labelType.fontWeight as '400' | '500' | '600' | '700',
            letterSpacing: labelType.letterSpacing,
            lineHeight: labelType.lineHeight,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  },
);

MenuItem.displayName = 'MenuItem';

// ---------------------------------------------------------------------------
// Structural / layout styles — no colours, radii, or visual tokens
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    // Visual props applied inline from tokens.
    // overflow hidden ensures items are clipped to the card's border radius.
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLabel: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
  },
});

export { AppContextMenu };
