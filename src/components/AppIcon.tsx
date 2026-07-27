import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableWithoutFeedback, Vibration, View, ViewStyle } from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppIconProps = {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AppIcon = React.memo<AppIconProps>(({ icon, label, onPress, onLongPress, style }) => {
  const { semantics } = useWeftConfig();
  const ai = semantics.component.appIcon;

  // Spring-driven press scale — squishes to 0.88 on press, snaps back on release
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleLongPress = useCallback(() => {
    // Short haptic pulse — standard launcher long-press feedback
    Vibration.vibrate(50);
    onLongPress?.();
  }, [onLongPress]);

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Animated.View
        style={[styles.outer, style, { transform: [{ scale: scaleAnim }] }]}
      >
        {/*
         * Shadow container — NO overflow:hidden here.
         * overflow:hidden clips the shadow to the view bounds on Android,
         * making it invisible. The shadow must render on an un-clipped view.
         */}
        <View
          style={[
            styles.shadowContainer,
            {
              width: ai.containerSize,
              height: ai.containerSize,
              borderRadius: ai.radius,
              elevation: ai.shadow.elevation,
              shadowColor: ai.shadow.shadowColor,
              shadowOffset: ai.shadow.shadowOffset,
              shadowOpacity: ai.shadow.shadowOpacity,
              shadowRadius: ai.shadow.shadowRadius,
              // Android elevation REQUIRES a non-transparent backgroundColor
              // to render the shadow. 'transparent' silently kills the shadow.
              // We use white here — it's covered by the clipContainer child anyway.
              backgroundColor: '#FFFFFF',
            },
          ]}
        >
          {/*
           * Clip container — overflow:hidden lives HERE, on a child view,
           * so the icon image is clipped to the border radius without
           * interfering with the parent's shadow rendering.
           */}
          <View
            style={[
              styles.clipContainer,
              { borderRadius: ai.radius },
            ]}
          >
            {icon}
          </View>
        </View>

        {/* Label — text shadow only on dark-background paradigms (Glass/Minimal). */}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              fontFamily: ai.labelType.fontFamily,
              fontSize: ai.labelType.fontSize,
              lineHeight: ai.labelType.lineHeight,
              fontWeight: ai.labelType.fontWeight,
              letterSpacing: ai.labelType.letterSpacing,
              color: ai.labelColor,
              ...(ai.labelTextShadow !== null && {
                textShadowColor: ai.labelTextShadow.color,
                textShadowOffset: ai.labelTextShadow.offset,
                textShadowRadius: ai.labelTextShadow.radius,
              }),
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

AppIcon.displayName = 'AppIcon';

// ---------------------------------------------------------------------------
// Styles — structural props only
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
  },
  shadowContainer: {
    backgroundColor: 'transparent',
  },
  clipContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  label: {
    textAlign: 'center',
    marginTop: 4,
  },
});

export { AppIcon };
