import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NoteBadge } from '@/entities/pitch';
import { CalibrationStepper } from '@/features/calibrate-a4';
import { TuningDropdown } from '@/features/select-tuning';
import { StringLockSwitch } from '@/features/toggle-string-lock';
import { THEME_COLORS } from '@/shared/config/theme';
import { MicIcon } from '@/shared/ui/icons/MicIcon';
import { Surface } from '@/shared/ui/Surface';
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
      {!vm.isPermissionGranted && vm.permissionStatus !== 'checking' ? (
        <Surface style={styles.permissionBanner}>
          <View style={styles.permissionTextBlock}>
            <Text style={styles.permissionTitle}>
              MICROPHONE ACCESS REQUIRED
            </Text>
            <Text style={styles.permissionDescription}>
              Grant microphone permission to analyze guitar string frequencies
              in real time.
            </Text>
          </View>
          <Pressable
            style={styles.permissionActionButton}
            onPress={
              vm.permissionStatus === 'blocked'
                ? vm.openSystemSettings
                : vm.requestMicrophonePermission
            }
          >
            <Text style={styles.permissionActionText}>
              {vm.permissionStatus === 'blocked' ? 'SETTINGS' : 'ALLOW MIC'}
            </Text>
          </Pressable>
        </Surface>
      ) : null}

      <View style={styles.topControlsSection}>
        <View style={styles.controlsRow}>
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
        </View>

        <View style={styles.controlsRow}>
          <StringLockSwitch
            isAutoMode={vm.isAutoMode}
            isDisabled={vm.isChromaticPreset}
            lockedLabel={vm.lockedStringLabel}
            onToggleLockMode={vm.toggleLockMode}
          />

          <Pressable
            style={[
              styles.micToggleButton,
              !vm.isListening ? styles.micTogglePaused : null,
            ]}
            onPress={vm.toggleListening}
          >
            <MicIcon
              size={15}
              color={
                vm.isListening
                  ? THEME_COLORS.accentInTune
                  : THEME_COLORS.accentDanger
              }
              muted={!vm.isListening}
            />
            <Text
              style={[
                styles.micToggleText,
                !vm.isListening ? styles.micToggleTextPaused : null,
              ]}
              numberOfLines={1}
            >
              {vm.isListening ? 'MIC ACTIVE' : 'MIC PAUSED'}
            </Text>
          </Pressable>
        </View>
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
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: THEME_COLORS.accentWarning,
    gap: 12,
  },
  permissionTextBlock: {
    flex: 1,
    gap: 2,
  },
  permissionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME_COLORS.accentWarning,
    letterSpacing: 0.8,
  },
  permissionDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.textSecondary,
  },
  permissionActionButton: {
    backgroundColor: THEME_COLORS.accentWarning,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME_COLORS.backgroundPrimary,
    letterSpacing: 0.6,
  },
  topControlsSection: {
    gap: 8,
    zIndex: 30,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micToggleButton: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.accentInTune,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  micTogglePaused: {
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.backgroundSurface,
  },
  micToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.accentInTune,
    letterSpacing: 0.6,
  },
  micToggleTextPaused: {
    color: THEME_COLORS.textMuted,
  },
  centerNoteRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSnapshotButton: {
    marginTop: 4,
    height: 34,
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 16,
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
