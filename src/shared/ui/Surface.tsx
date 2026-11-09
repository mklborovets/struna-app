import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  THEME_COLORS,
  THEME_RADII,
  THEME_SPACING,
} from '@/shared/config/theme';

export interface SurfaceProps {
  readonly elevated?: boolean;
  readonly padded?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: React.ReactNode;
}

export const Surface: React.FC<SurfaceProps> = ({
  elevated = false,
  padded = true,
  style,
  children,
}) => {
  return (
    <View
      style={[
        styles.base,
        elevated ? styles.elevated : styles.standard,
        padded ? styles.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: THEME_RADII.lg,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderSubtle,
  },
  standard: {
    backgroundColor: THEME_COLORS.backgroundSurface,
  },
  elevated: {
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderColor: THEME_COLORS.borderStrong,
  },
  padded: {
    padding: THEME_SPACING.lg,
  },
});
