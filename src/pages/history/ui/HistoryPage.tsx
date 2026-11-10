import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME_COLORS } from '@/shared/config/theme';
import { Surface } from '@/shared/ui/Surface';
import { Typography } from '@/shared/ui/Typography';
import { TrashIcon } from '@/shared/ui/icons/TrashIcon';
import {
  HistoryLogViewItem,
  useHistoryPageModel,
} from '../model/useHistoryPageModel';

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
        <FlatList<HistoryLogViewItem>
          data={vm.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Surface style={styles.recordCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.titleCluster}>
                  <Text style={styles.noteTitle}>{item.titleText}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { borderColor: item.statusColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: item.statusColor },
                      ]}
                    >
                      {item.statusLabel}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.deleteButton}
                  hitSlop={8}
                  onPress={() => vm.deleteHistoryRecord(item.id)}
                >
                  <TrashIcon size={15} color={THEME_COLORS.textMuted} />
                </Pressable>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>MEASURED</Text>
                  <Text style={styles.metricValue}>{item.measuredText}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>TARGET</Text>
                  <Text style={styles.metricValue}>{item.targetText}</Text>
                </View>
                <View style={[styles.metricCell, styles.metricCellRight]}>
                  <Text style={styles.metricLabel}>DEVIATION</Text>
                  <Text
                    style={[styles.metricValue, { color: item.statusColor }]}
                  >
                    {item.deviationText}
                  </Text>
                </View>
              </View>

              <Text style={styles.presetSubtext}>{item.metadataText}</Text>
            </Surface>
          )}
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME_COLORS.textPrimary,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: THEME_COLORS.backgroundElevated,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME_COLORS.backgroundPrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  metricCell: {
    flex: 1,
    gap: 2,
  },
  metricCellRight: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME_COLORS.textMuted,
    letterSpacing: 0.7,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME_COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  presetSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME_COLORS.textMuted,
  },
  emptyCard: {
    marginTop: 24,
    paddingVertical: 32,
  },
});
