/**
 * Weft — Tile
 *
 * Atom component for the launcher grid. All visual tokens are read from
 * semantics — no hardcoded colours, sizes, or fonts. Zero paradigm branching.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TileState = 'enabled' | 'selected' | 'pressed' | 'disabled' | 'focused';

type TileProps = {
  icon?: React.ReactNode;
  label: string;
  /** Text shown in the status chip (e.g. 'On'). */
  status?: string;
  tileState?: TileState;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Tile = memo(function Tile({
  icon,
  label,
  status,
  tileState,
  onPress,
  onLongPress,
  style,
}: TileProps) {
  const { semantics } = useWeftConfig();
  const tile = semantics.component.tile;
  const stateTokens = semantics.state.tile;

  // Internal press state — external tileState wins when provided.
  const [internalPressed, setInternalPressed] = useState(false);

  const resolvedState: TileState =
    tileState !== undefined
      ? tileState
      : internalPressed
      ? 'pressed'
      : 'enabled';

  const handlePressIn = useCallback(() => {
    if (tileState === undefined) {
      setInternalPressed(true);
    }
  }, [tileState]);

  const handlePressOut = useCallback(() => {
    if (tileState === undefined) {
      setInternalPressed(false);
    }
  }, [tileState]);

  const stateToken = stateTokens[resolvedState];

  // Shadow tokens spread directly (elevation, shadowColor, etc.)
  const shadow = tile.shadow;

  const showChip =
    status !== undefined &&
    status.length > 0 &&
    tile.chipBackground !== 'transparent';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={resolvedState === 'disabled'}
      accessible
      accessibilityRole="button"
      accessibilityState={{
        selected: resolvedState === 'selected',
        disabled: resolvedState === 'disabled',
      }}
      style={[
        styles.touchTarget,
        { width: tile.touchTarget, height: tile.touchTarget },
        style,
      ]}
    >
      <View
        style={[
          styles.container,
          {
            flex: 1,
            backgroundColor: stateToken.background,
            borderRadius: tile.radius,
            padding: tile.padding,
            borderWidth: stateToken.border !== 'transparent' ? 1 : 0,
            borderColor: stateToken.border,
            // Shadow
            elevation: shadow.elevation,
            shadowColor: shadow.shadowColor,
            shadowOffset: shadow.shadowOffset,
            shadowOpacity: shadow.shadowOpacity,
            shadowRadius: shadow.shadowRadius,
          },
        ]}
      >
        {/* Icon area */}
        {icon !== undefined && (
          <View style={styles.iconArea}>{icon}</View>
        )}

        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: stateToken.labelColor,
              fontFamily: tile.labelType.fontFamily,
              fontSize: tile.labelType.fontSize,
              fontWeight: tile.labelType.fontWeight,
              letterSpacing: tile.labelType.letterSpacing,
              lineHeight: tile.labelType.lineHeight,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {/* Status chip */}
        {showChip && (
          <View
            style={[
              styles.chip,
              {
                backgroundColor: tile.chipBackground,
                borderRadius: 9999,
                paddingVertical: 4,
                paddingHorizontal: 8,
              },
            ]}
          >
            <Text
              style={{
                color: tile.chipForeground,
                fontFamily: tile.chipType.fontFamily,
                fontSize: tile.chipType.fontSize,
                fontWeight: tile.chipType.fontWeight,
                letterSpacing: tile.chipType.letterSpacing,
                lineHeight: tile.chipType.lineHeight,
              }}
              numberOfLines={1}
            >
              {status}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Structural / layout styles only — no colours, radii, or visual props
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  touchTarget: {
    // width/height applied inline from semantics
  },
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  iconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  chip: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
});
