import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { THEME_COLORS } from '@/shared/config/theme';
import { PitchReading, TuningStatus } from '../model/types';

export interface NoteBadgeProps {
  readonly reading: PitchReading | null;
  readonly status: TuningStatus;
  readonly formattedCents: string;
  readonly formattedFrequency: string;
}

export const NoteBadge: React.FC<NoteBadgeProps> = ({
  reading,
  status,
  formattedCents,
  formattedFrequency,
}) => {
  const badgeColorStyle =
    status === 'in-tune'
      ? styles.statusInTune
      : status === 'flat' || status === 'sharp'
        ? styles.statusActive
        : styles.statusIdle;

  const centsToneStyle =
    status === 'in-tune'
      ? styles.centsInTune
      : status === 'flat' || status === 'sharp'
        ? styles.centsActive
        : null;

  return (
    <View style={styles.container}>
      <View style={[styles.noteCircle, badgeColorStyle]}>
        <Text style={styles.noteText}>
          {reading ? reading.noteName : '--'}
        </Text>
        <Text style={styles.octaveText}>
          {reading ? reading.octave : ''}
        </Text>
      </View>

      <View style={styles.metricsColumn}>
        <Text
          style={styles.frequencyText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {formattedFrequency}
        </Text>
        <Text style={[styles.centsText, centsToneStyle]} numberOfLines={1}>
          {formattedCents}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    backgroundColor: THEME_COLORS.backgroundPrimary,
  },
  statusIdle: {
    borderColor: THEME_COLORS.borderStrong,
  },
  statusActive: {
    borderColor: THEME_COLORS.accentWarning,
  },
  statusInTune: {
    borderColor: THEME_COLORS.accentInTune,
  },
  noteText: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME_COLORS.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  octaveText: {
    position: 'absolute',
    right: 8,
    bottom: 9,
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.textMuted,
  },
  metricsColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  frequencyText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME_COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  centsText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  centsActive: {
    color: THEME_COLORS.accentWarning,
  },
  centsInTune: {
    color: THEME_COLORS.accentInTune,
  },
});
