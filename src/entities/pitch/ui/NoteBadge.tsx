import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

  return (
    <View style={styles.container}>
      <View style={[styles.noteCircle, badgeColorStyle]}>
        <Text style={styles.noteText}>
          {reading ? reading.noteName : '--'}
        </Text>
        {reading ? (
          <Text style={styles.octaveText}>{reading.octave}</Text>
        ) : null}
      </View>
      <View style={styles.metricsRow}>
        <Text style={styles.frequencyText}>{formattedFrequency}</Text>
        <Text style={styles.centsText}>{formattedCents}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  noteCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#12161F',
  },
  statusIdle: {
    borderColor: '#2A3242',
  },
  statusActive: {
    borderColor: '#F59E0B',
  },
  statusInTune: {
    borderColor: '#10B981',
  },
  noteText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -1,
  },
  octaveText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 18,
    marginLeft: 2,
  },
  metricsRow: {
    marginTop: 10,
    alignItems: 'center',
    gap: 4,
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  centsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
