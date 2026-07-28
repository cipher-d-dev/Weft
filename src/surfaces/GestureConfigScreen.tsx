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
// Action labels
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<GestureAction, { label: string; icon: string }> = {
  none: { label: 'None', icon: '—' },
  controlCenter: { label: 'Control Center', icon: '⚙️' },
  allApps: { label: 'All Apps', icon: '📱' },
  notifications: { label: 'Notifications', icon: '🔔' },
  quickSettings: { label: 'Quick Settings', icon: '⚡' },
  recentApps: { label: 'Recent Apps', icon: '📊' },
};

const DIRECTION_LABELS: Record<keyof GestureBindings, { label: string; icon: string }> = {
  swipeDown: { label: 'Swipe Down', icon: '⬇️' },
  swipeUp: { label: 'Swipe Up', icon: '⬆️' },
  swipeLeft: { label: 'Swipe Left', icon: '⬅️' },
  swipeRight: { label: 'Swipe Right', icon: '➡️' },
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
        <Text style={styles.directionIcon}>{dirInfo.icon}</Text>
        <View style={styles.cardLabels}>
          <Text style={[styles.directionLabel, { color: textPrimary }]}>
            {dirInfo.label}
          </Text>
          <Text style={[styles.actionLabel, { color: accentColor }]}>
            {actionInfo.icon} {actionInfo.label}
          </Text>
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
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            {dirInfo.icon} {dirInfo.label}
          </Text>
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
                  <Text style={styles.actionIcon}>{actionInfo.icon}</Text>
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
  directionIcon: {
    fontSize: 28,
  },
  cardLabels: {
    flex: 1,
    gap: 3,
  },
  directionLabel: {
    fontSize: 15,
    fontWeight: '600',
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
  actionIcon: {
    fontSize: 22,
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
