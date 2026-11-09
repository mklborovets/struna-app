import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { THEME_COLORS, THEME_FONT_SIZES } from '@/shared/config/theme';

export type TypographyVariant =
  | 'caption'
  | 'bodySm'
  | 'body'
  | 'subtitle'
  | 'title'
  | 'hero';

export type TypographyTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'success'
  | 'warning'
  | 'danger';

export interface TypographyProps {
  readonly variant?: TypographyVariant;
  readonly tone?: TypographyTone;
  readonly align?: 'left' | 'center' | 'right';
  readonly style?: StyleProp<TextStyle>;
  readonly children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  tone = 'primary',
  align = 'left',
  style,
  children,
}) => {
  return (
    <Text
      style={[
        styles[variant],
        toneStyles[tone],
        { textAlign: align },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  caption: {
    fontSize: THEME_FONT_SIZES.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bodySm: {
    fontSize: THEME_FONT_SIZES.bodySm,
    fontWeight: '500',
  },
  body: {
    fontSize: THEME_FONT_SIZES.body,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: THEME_FONT_SIZES.subtitle,
    fontWeight: '700',
  },
  title: {
    fontSize: THEME_FONT_SIZES.title,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  hero: {
    fontSize: THEME_FONT_SIZES.hero,
    fontWeight: '800',
    letterSpacing: -1,
  },
});

const toneStyles = StyleSheet.create({
  primary: {
    color: THEME_COLORS.textPrimary,
  },
  secondary: {
    color: THEME_COLORS.textSecondary,
  },
  muted: {
    color: THEME_COLORS.textMuted,
  },
  success: {
    color: THEME_COLORS.accentInTune,
  },
  warning: {
    color: THEME_COLORS.accentWarning,
  },
  danger: {
    color: THEME_COLORS.accentDanger,
  },
});
