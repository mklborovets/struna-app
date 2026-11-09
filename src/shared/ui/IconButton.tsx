import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { THEME_COLORS, THEME_RADII } from '@/shared/config/theme';

export interface IconButtonProps {
  readonly icon: React.ReactNode;
  readonly label?: string;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  active = false,
  disabled = false,
  onPress,
  style,
}) => {
  return (
    <Pressable
      style={[
        styles.button,
        active ? styles.buttonActive : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.iconSlot}>{icon}</View>
      {label ? (
        <Text
          style={[
            styles.labelText,
            active ? styles.labelTextActive : null,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: THEME_RADII.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  buttonActive: {
    backgroundColor: THEME_COLORS.backgroundInteractive,
    borderColor: THEME_COLORS.accentInTune,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  labelTextActive: {
    color: THEME_COLORS.accentInTune,
  },
});
