import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { THEME_COLORS } from '@/shared/config/theme';
import { LockIcon } from '@/shared/ui/icons/LockIcon';
import { UnlockIcon } from '@/shared/ui/icons/UnlockIcon';

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
      {isAutoMode ? (
        <UnlockIcon size={14} color={THEME_COLORS.accentInTune} />
      ) : (
        <LockIcon size={14} color={THEME_COLORS.accentWarning} />
      )}
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
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  switchButtonLocked: {
    borderColor: THEME_COLORS.accentWarning,
    backgroundColor: THEME_COLORS.backgroundInteractive,
  },
  switchButtonDisabled: {
    opacity: 0.4,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.textPrimary,
    letterSpacing: 0.6,
  },
});
