import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { TuningSessionRecord } from '@/entities/tuning-session';
import { THEME_COLORS } from '@/shared/config/theme';
import { Surface } from '@/shared/ui/Surface';
import { Typography } from '@/shared/ui/Typography';
import { useHistoryPageModel } from '../model/useHistoryPageModel';

const renderHistoryItem = ({ item }: { item: TuningSessionRecord }) => {
  const sign = item.centsDeviation > 0 ? '+' : '';
  return (
    <Surface style={styles.recordCard}>
      <View style={styles.recordLeft}>
        <Text style={styles.noteTitle}>
          {item.stringLabel} / {item.noteName}
        </Text>
        <Text style={styles.presetSubtext}>
          {item.presetName} (A4 = {item.referenceA4Hz} Hz)
        </Text>
      </View>
      <View style={styles.recordRight}>
        <Text style={styles.freqText}>
          {item.measuredFrequencyHz.toFixed(2)} Hz
        </Text>
        <Text style={styles.centsBadge}>
          {sign}
          {item.centsDeviation.toFixed(1)} cents
        </Text>
      </View>
    </Surface>
  );
};

export const HistoryPage: React.FC = () => {
  const vm = useHistoryPageModel();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Typography variant="subtitle">TUNING SESSION LOG</Typography>
        <Pressable
          style={[
            styles.clearButton,
            !vm.hasRecords ? styles.clearButtonDisabled : null,
          ]}
          disabled={!vm.hasRecords}
          onPress={vm.clearAllHistory}
        >
          <Text style={styles.clearButtonText}>CLEAR ALL</Text>
        </Pressable>
      </View>

      {vm.hasRecords ? (
        <FlatList
          data={vm.records}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <Surface style={styles.emptyCard}>
          <Typography variant="body" tone="muted" align="center">
            No logged tuning measurements yet. Lock a pitch on the Tuner screen
            and press LOG READING.
          </Typography>
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.backgroundPrimary,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  clearButton: {
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonDisabled: {
    opacity: 0.35,
  },
  clearButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME_COLORS.accentDanger,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  recordLeft: {
    gap: 2,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME_COLORS.textPrimary,
  },
  presetSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.textMuted,
  },
  recordRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  freqText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME_COLORS.textSecondary,
  },
  centsBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.accentInTune,
  },
  emptyCard: {
    marginTop: 24,
    paddingVertical: 32,
  },
});
