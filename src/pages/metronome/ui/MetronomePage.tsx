import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME_COLORS } from '@/shared/config/theme';
import { Surface } from '@/shared/ui/Surface';
import { Typography } from '@/shared/ui/Typography';
import { useMetronomePageModel } from '../model/useMetronomePageModel';

const QUICK_BPM_PRESETS: readonly number[] = [60, 90, 120, 140, 180];

export const MetronomePage: React.FC = () => {
  const vm = useMetronomePageModel();

  return (
    <View style={styles.container}>
      <Surface style={styles.heroCard}>
        <Typography variant="caption" tone="muted">
          {vm.tempoMarking} / 4-4 TIME
        </Typography>
        <Typography variant="hero" style={styles.bpmNumber}>
          {vm.bpm}
        </Typography>
        <Typography variant="bodySm" tone="secondary">
          BPM ({vm.samplesPerBeat} samples/beat at 48 kHz)
        </Typography>

        <View style={styles.steppersRow}>
          <Pressable
            style={styles.adjustButton}
            onPress={() => vm.adjustBpmBy(-5)}
          >
            <Text style={styles.adjustText}>-5</Text>
          </Pressable>
          <Pressable
            style={styles.adjustButton}
            onPress={() => vm.adjustBpmBy(-1)}
          >
            <Text style={styles.adjustText}>-1</Text>
          </Pressable>
          <Pressable
            style={styles.adjustButton}
            onPress={() => vm.adjustBpmBy(1)}
          >
            <Text style={styles.adjustText}>+1</Text>
          </Pressable>
          <Pressable
            style={styles.adjustButton}
            onPress={() => vm.adjustBpmBy(5)}
          >
            <Text style={styles.adjustText}>+5</Text>
          </Pressable>
        </View>
      </Surface>

      <Surface style={styles.presetsCard}>
        <Typography variant="caption" tone="muted">
          TEMPO PRESETS
        </Typography>
        <View style={styles.presetsRow}>
          {QUICK_BPM_PRESETS.map((presetBpm) => {
            const isSelected = vm.bpm === presetBpm;
            return (
              <Pressable
                key={presetBpm}
                style={[
                  styles.presetChip,
                  isSelected ? styles.presetChipActive : null,
                ]}
                onPress={() => vm.setExactBpm(presetBpm)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    isSelected ? styles.presetChipTextActive : null,
                  ]}
                >
                  {presetBpm}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Surface>

      <Pressable
        style={[
          styles.primaryActionButton,
          vm.isActive ? styles.primaryActionStop : styles.primaryActionStart,
        ]}
        onPress={vm.toggleActive}
      >
        <Text style={styles.primaryActionText}>
          {vm.isActive ? 'STOP METRONOME' : 'START METRONOME'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.backgroundPrimary,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  bpmNumber: {
    fontSize: 64,
    marginVertical: 4,
  },
  steppersRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  adjustButton: {
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  adjustText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME_COLORS.textPrimary,
  },
  presetsCard: {
    gap: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
  },
  presetChipActive: {
    borderColor: THEME_COLORS.accentElectric,
    backgroundColor: THEME_COLORS.backgroundInteractive,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME_COLORS.textSecondary,
  },
  presetChipTextActive: {
    color: THEME_COLORS.accentElectric,
  },
  primaryActionButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionStart: {
    backgroundColor: THEME_COLORS.accentInTune,
  },
  primaryActionStop: {
    backgroundColor: THEME_COLORS.accentDanger,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME_COLORS.backgroundPrimary,
    letterSpacing: 1,
  },
});
