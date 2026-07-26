/**
 * Weft — SectionHeader
 *
 * Atom component for section labels. Renders an optional backing plate that
 * disappears automatically when semantics sets plateBackground to 'transparent'
 * (e.g. Glass × Vision cascade). Zero paradigm branching — the token value
 * alone controls the visual.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionHeaderProps = {
  label: string;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SectionHeader = memo(function SectionHeader({
  label,
  style,
}: SectionHeaderProps) {
  const { semantics } = useWeftConfig();
  const sh = semantics.component.sectionHeader;

  const showPlate = sh.plateBackground !== 'transparent';

  const textElement = (
    <Text
      style={[
        styles.label,
        {
          color: sh.textColor,
          fontFamily: sh.labelType.fontFamily,
          fontSize: sh.labelType.fontSize,
          fontWeight: sh.labelType.fontWeight,
          letterSpacing: sh.labelType.letterSpacing,
          lineHeight: sh.labelType.lineHeight,
        },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  if (showPlate) {
    return (
      <View
        style={[
          styles.plate,
          {
            alignSelf: 'flex-start',
            backgroundColor: sh.plateBackground,
            borderRadius: sh.plateRadius,
            paddingVertical: sh.platePaddingV,
            paddingHorizontal: sh.platePaddingH,
          },
          style,
        ]}
      >
        {textElement}
      </View>
    );
  }

  // No plate — render text only, still aligned flex-start
  return (
    <View style={[styles.noPlate, style]}>
      {textElement}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Structural / layout styles only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  plate: {
    // alignSelf, backgroundColor, borderRadius, padding applied inline
  },
  noPlate: {
    alignSelf: 'flex-start',
  },
  label: {
    // color, font props applied inline
  },
});
