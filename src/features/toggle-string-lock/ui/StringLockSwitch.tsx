import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface StringLockSwitchProps {
  readonly isAutoMode: boolean;
  readonly isDisabled: boolean;
  readonly lockedLabel: string | null;
  readonly onToggleLockMode: () => void;
}

export const StringLockSwitch: React.FC<StringLockSwitchProps> = ({
  isAutoMode,
  isDisabled,
  lockedLabel,
  onToggleLockMode,
}) => {
  return (
    <Pressable
      style={[
        styles.switchButton,
        !isAutoMode ? styles.switchButtonLocked : null,
        isDisabled ? styles.switchButtonDisabled : null,
      ]}
      disabled={isDisabled}
      onPress={onToggleLockMode}
    >
      <View
        style={[
          styles.indicatorDot,
          isAutoMode ? styles.dotAuto : styles.dotLocked,
        ]}
      />
      <Text style={styles.modeText}>
        {isAutoMode ? 'AUTO' : `LOCK ${lockedLabel ?? ''}`}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B26',
    borderWidth: 1,
    borderColor: '#2A3242',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  switchButtonLocked: {
    borderColor: '#F59E0B',
    backgroundColor: '#1F1B16',
  },
  switchButtonDisabled: {
    opacity: 0.4,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotAuto: {
    backgroundColor: '#10B981',
  },
  dotLocked: {
    backgroundColor: '#F59E0B',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.6,
  },
});
