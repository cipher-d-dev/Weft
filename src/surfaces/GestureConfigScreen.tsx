/**
 * Weft — GestureConfigScreen
 *
 * Configure gesture bindings for 4 swipe directions. Each direction shows its
 * current action and opens a picker sheet when tapped.
 */

import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWeftConfig } from '../hooks/useWeftConfig';
import type { GestureAction, GestureBindings } from '../context/types';

// ---------------------------------------------------------------------------
// Tiny View-based icons — no emoji, no native icon library
// ---------------------------------------------------------------------------

function IconArrowDown({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2, height: 14, backgroundColor: color, borderRadius: 1 }} />
      <View style={{
        position: 'absolute', bottom: 2,
        width: 10, height: 10,
        borderRightWidth: 2, borderBottomWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  );
}

function IconArrowUp({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2, height: 14, backgroundColor: color, borderRadius: 1 }} />
      <View style={{
        position: 'absolute', top: 2,
        width: 10, height: 10,
        borderLeftWidth: 2, borderTopWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  );
}

function IconArrowLeft({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{
        position: 'absolute', left: 2,
        width: 10, height: 10,
        borderLeftWidth: 2, borderBottomWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  );
}

function IconArrowRight({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{
        position: 'absolute', right: 2,
        width: 10, height: 10,
        borderRightWidth: 2, borderTopWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  );
}

/** Gear / settings icon */
function IconGear({ color }: { color: string }) {
  const s = 22;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: s * 0.55, height: s * 0.55,
        borderRadius: s * 0.275,
        borderWidth: s * 0.1,
        borderColor: color,
      }} />
      {[0, 45, 90, 135].map(deg => (
        <View key={deg} style={{
          position: 'absolute',
          width: s * 0.18, height: s * 0.95,
          borderRadius: s * 0.09,
          backgroundColor: color,
          transform: [{ rotate: `${deg}deg` }],
          opacity: 0.9,
        }} />
      ))}
    </View>
  );
}

/** Phone outline */
function IconPhone({ color }: { color: string }) {
  const s = 22;
  return (
    <View style={{
      width: s * 0.6, height: s,
      borderWidth: s * 0.09,
      borderColor: color,
      borderRadius: s * 0.12,
    }}>
      <View style={{
        width: s * 0.25, height: s * 0.06,
        backgroundColor: color,
        borderRadius: s * 0.03,
        alignSelf: 'center',
        marginTop: s * 0.08,
      }} />
    </View>
  );
}

/** Bell icon */
function IconBell({ color }: { color: string }) {
  const s = 22;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: s * 0.65, height: s * 0.6,
        borderTopLeftRadius: s * 0.325,
        borderTopRightRadius: s * 0.325,
        borderWidth: s * 0.1,
        borderColor: color,
        marginTop: s * 0.1,
      }} />
      <View style={{
        width: s * 0.85, height: s * 0.1,
        backgroundColor: color,
        borderRadius: s * 0.05,
        marginTop: 1,
      }} />
      <View style={{
        width: s * 0.25, height: s * 0.12,
        borderBottomLeftRadius: s * 0.125,
        borderBottomRightRadius: s * 0.125,
        borderWidth: s * 0.09,
        borderTopWidth: 0,
        borderColor: color,
        marginTop: 1,
      }} />
    </View>
  );
}

/** Lightning bolt */
function IconBolt({ color }: { color: string }) {
  const s = 22;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: s * 0.32,
        borderRightWidth: 0,
        borderBottomWidth: s * 0.55,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        position: 'absolute', top: 0, left: s * 0.22,
      }} />
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: s * 0.32,
        borderRightWidth: 0,
        borderTopWidth: s * 0.55,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: color,
        position: 'absolute', bottom: 0, right: s * 0.22,
      }} />
    </View>
  );
}

/** Stacked bars / recent apps */
function IconStack({ color }: { color: string }) {
  const s = 22;
  return (
    <View style={{ width: s, height: s, justifyContent: 'center', gap: 3 }}>
      {[0.9, 0.75, 0.6].map((w, i) => (
        <View key={i} style={{
          width: s * w, height: s * 0.12,
          backgroundColor: color,
          borderRadius: s * 0.06,
          alignSelf: 'flex-start',
        }} />
      ))}
    </View>
  );
}

/** Dash — for "None" action */
function IconDash({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Action labels
// ---------------------------------------------------------------------------

type IconComponent = React.FC<{ color: string }>;

const ACTION_LABELS: Record<GestureAction, { label: string; Icon: IconComponent }> = {
  none:          { label: 'None',           Icon: IconDash  },
  controlCenter: { label: 'Control Center', Icon: IconGear  },
  allApps:       { label: 'All Apps',       Icon: IconPhone },
  notifications: { label: 'Notifications',  Icon: IconBell  },
  quickSettings: { label: 'Quick Settings', Icon: IconBolt  },
  recentApps:    { label: 'Recent Apps',    Icon: IconStack },
};

const DIRECTION_LABELS: Record<keyof GestureBindings, { label: string; Icon: IconComponent }> = {
  swipeDown:  { label: 'Swipe Down',  Icon: IconArrowDown  },
  swipeUp:    { label: 'Swipe Up',    Icon: IconArrowUp    },
  swipeLeft:  { label: 'Swipe Left',  Icon: IconArrowLeft  },
  swipeRight: { label: 'Swipe Right', Icon: IconArrowRight },
};

// ---------------------------------------------------------------------------
// DirectionCard
// ---------------------------------------------------------------------------

function DirectionCard({
  direction,
  currentAction,
  onPress,
  accentColor,
  textPrimary,
  textSecondary,
  cardBg,
  cardBorder,
  cardRadius,
}: {
  direction: keyof GestureBindings;
  currentAction: GestureAction;
  onPress: () => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  cardBorder: string;
  cardRadius: number;
}) {
  const dirInfo = DIRECTION_LABELS[direction];
  const actionInfo = ACTION_LABELS[currentAction];

  return (
    <TouchableOpacity
      style={[
        styles.directionCard,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderRadius: cardRadius,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${dirInfo.label}, currently set to ${actionInfo.label}`}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconCell}>
          <dirInfo.Icon color={textSecondary} />
        </View>
        <View style={styles.cardLabels}>
          <Text style={[styles.directionLabel, { color: textPrimary }]}>
            {dirInfo.label}
          </Text>
          <View style={styles.actionLabelRow}>
            <actionInfo.Icon color={accentColor} />
            <Text style={[styles.actionLabel, { color: accentColor }]}>
              {actionInfo.label}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.chevron, { color: textSecondary }]}>›</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// ActionPickerSheet
// ---------------------------------------------------------------------------

function ActionPickerSheet({
  visible,
  direction,
  currentAction,
  onSelect,
  onDismiss,
  accentColor,
  textPrimary,
  textSecondary,
  surfaceBg,
  cardBg,
  cardRadius,
}: {
  visible: boolean;
  direction: keyof GestureBindings | null;
  currentAction: GestureAction;
  onSelect: (action: GestureAction) => void;
  onDismiss: () => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  surfaceBg: string;
  cardBg: string;
  cardRadius: number;
}) {
  if (!direction) return null;

  const dirInfo = DIRECTION_LABELS[direction];
  const actions: GestureAction[] = [
    'none',
    'controlCenter',
    'allApps',
    'notifications',
    'quickSettings',
    'recentApps',
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <View
          style={[
            styles.sheetContent,
            { backgroundColor: surfaceBg, borderRadius: cardRadius },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.sheetTitleRow}>
            <dirInfo.Icon color={textPrimary} />
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>
              {dirInfo.label}
            </Text>
          </View>
          <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
            Choose an action
          </Text>

          <View style={styles.sheetActions}>
            {actions.map(action => {
              const actionInfo = ACTION_LABELS[action];
              const isSelected = action === currentAction;
              return (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.actionRow,
                    {
                      backgroundColor: cardBg,
                      borderRadius: cardRadius * 0.6,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: isSelected ? accentColor : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    onSelect(action);
                    onDismiss();
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                >
                  <View style={styles.iconCell}>
                    <actionInfo.Icon color={isSelected ? accentColor : textSecondary} />
                  </View>
                  <Text style={[styles.actionRowLabel, { color: textPrimary }]}>
                    {actionInfo.label}
                  </Text>
                  {isSelected && (
                    <Text style={[styles.checkmark, { color: accentColor }]}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// GestureConfigScreen
// ---------------------------------------------------------------------------

export function GestureConfigScreen({
  onBack,
}: {
  onBack?: () => void;
}) {
  const { semantics, gestures, setGestureBinding } = useWeftConfig();
  const s = semantics;

  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeDirection, setActiveDirection] = useState<keyof GestureBindings | null>(null);

  const handleCardPress = (direction: keyof GestureBindings) => {
    setActiveDirection(direction);
    setPickerVisible(true);
  };

  const handleActionSelect = (action: GestureAction) => {
    if (activeDirection) {
      setGestureBinding(activeDirection, action);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: s.surface.customization.background }]}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />

      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.backIcon, { color: s.surface.customization.textPrimary }]}>
              ‹
            </Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: s.surface.customization.textPrimary }]}>
          Gesture Bindings
        </Text>
      </View>

      {/* Direction cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <DirectionCard
          direction="swipeDown"
          currentAction={gestures.swipeDown}
          onPress={() => handleCardPress('swipeDown')}
          accentColor={s.accent.primary}
          textPrimary={s.surface.customization.textPrimary}
          textSecondary={s.surface.customization.textSecondary}
          cardBg={s.component.tile.background}
          cardBorder={s.component.tile.border}
          cardRadius={s.component.tile.radius}
        />
        <DirectionCard
          direction="swipeUp"
          currentAction={gestures.swipeUp}
          onPress={() => handleCardPress('swipeUp')}
          accentColor={s.accent.primary}
          textPrimary={s.surface.customization.textPrimary}
          textSecondary={s.surface.customization.textSecondary}
          cardBg={s.component.tile.background}
          cardBorder={s.component.tile.border}
          cardRadius={s.component.tile.radius}
        />
        <DirectionCard
          direction="swipeLeft"
          currentAction={gestures.swipeLeft}
          onPress={() => handleCardPress('swipeLeft')}
          accentColor={s.accent.primary}
          textPrimary={s.surface.customization.textPrimary}
          textSecondary={s.surface.customization.textSecondary}
          cardBg={s.component.tile.background}
          cardBorder={s.component.tile.border}
          cardRadius={s.component.tile.radius}
        />
        <DirectionCard
          direction="swipeRight"
          currentAction={gestures.swipeRight}
          onPress={() => handleCardPress('swipeRight')}
          accentColor={s.accent.primary}
          textPrimary={s.surface.customization.textPrimary}
          textSecondary={s.surface.customization.textSecondary}
          cardBg={s.component.tile.background}
          cardBorder={s.component.tile.border}
          cardRadius={s.component.tile.radius}
        />
      </ScrollView>

      {/* Action picker sheet */}
      <ActionPickerSheet
        visible={pickerVisible}
        direction={activeDirection}
        currentAction={activeDirection ? gestures[activeDirection] : 'none'}
        onSelect={handleActionSelect}
        onDismiss={() => setPickerVisible(false)}
        accentColor={s.accent.primary}
        textPrimary={s.surface.customization.textPrimary}
        textSecondary={s.surface.customization.textSecondary}
        surfaceBg={s.surface.customization.background}
        cardBg={s.component.tile.background}
        cardRadius={s.component.tile.radius}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  directionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabels: {
    flex: 1,
    gap: 4,
  },
  directionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  sheetContent: {
    marginHorizontal: 16,
    padding: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  sheetActions: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  actionRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
