import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NoteBadge } from '@/entities/pitch';
import { CalibrationStepper } from '@/features/calibrate-a4';
import { TuningDropdown } from '@/features/select-tuning';
import { StringLockSwitch } from '@/features/toggle-string-lock';
import { THEME_COLORS } from '@/shared/config/theme';
import { FretboardSelector } from '@/widgets/fretboard-selector';
import { PitchGauge } from '@/widgets/pitch-gauge';
import { SpectrumCanvas } from '@/widgets/spectrum-monitor';
import { useTunerPageModel } from '../model/useTunerPageModel';

export const TunerPage: React.FC = () => {
  const vm = useTunerPageModel();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      <View style={styles.topControlsBar}>
        <TuningDropdown
          activePreset={vm.activePreset}
          availablePresets={vm.availablePresets}
          isMenuOpen={vm.isMenuOpen}
          onToggleMenu={vm.toggleMenu}
          onSelectPreset={vm.selectPreset}
        />

        <CalibrationStepper
          referenceA4Hz={vm.referenceA4Hz}
          canDecrement={vm.canDecrementA4}
          canIncrement={vm.canIncrementA4}
          onDecrement={vm.decrementA4}
          onIncrement={vm.incrementA4}
          onReset={vm.resetA4ToStandard}
        />

        <StringLockSwitch
          isAutoMode={vm.isAutoMode}
          isDisabled={vm.isChromaticPreset}
          lockedLabel={vm.lockedStringLabel}
          onToggleLockMode={vm.toggleLockMode}
        />
      </View>

      <PitchGauge
        needleAnimatedStyle={vm.gauge.needleAnimatedStyle}
        needleColor={vm.gauge.needleColor}
        statusLabel={vm.gauge.statusLabel}
        isInTune={vm.gauge.isInTune}
      />

      <View style={styles.centerNoteRow}>
        <NoteBadge
          reading={vm.reading}
          status={vm.status}
          formattedCents={vm.formattedCents}
          formattedFrequency={vm.formattedFrequency}
        />
        <Pressable
          style={[
            styles.saveSnapshotButton,
            !vm.canRecordSession ? styles.saveSnapshotDisabled : null,
          ]}
          disabled={!vm.canRecordSession}
          onPress={vm.recordCurrentTuningToHistory}
        >
          <Text style={styles.saveSnapshotText}>LOG READING</Text>
        </Pressable>
      </View>

      <FretboardSelector
        strings={vm.activePreset.strings}
        isChromatic={vm.activePreset.isChromatic}
        activeStringNumber={vm.activeStringNumber}
        lockedStringNumber={vm.lockedStringNumber}
        isMatchedStringInTune={vm.isMatchedStringInTune}
        onSelectString={vm.selectManualString}
      />

      <SpectrumCanvas
        mode={vm.monitorMode}
        svgWaveformPath={vm.svgWaveformPath}
        spectrumBars={vm.spectrumBars}
        rmsDb={vm.rmsDb}
        onToggleMode={vm.toggleMonitorMode}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME_COLORS.backgroundPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  topControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 30,
  },
  centerNoteRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSnapshotButton: {
    marginTop: 6,
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  saveSnapshotDisabled: {
    opacity: 0.35,
  },
  saveSnapshotText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME_COLORS.textSecondary,
    letterSpacing: 0.8,
  },
});
