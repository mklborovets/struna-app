import { useCallback, useMemo } from 'react';
import {
  PitchReading,
  TuningStatus,
  usePitchStream,
} from '@/entities/pitch';
import {
  GuitarString,
  GuitarStringNumber,
  TuningPreset,
  TuningPresetId,
} from '@/entities/tuning-preset';
import { sessionRepository } from '@/entities/tuning-session';
import { useCalibrationControl } from '@/features/calibrate-a4';
import { useTuningSelection } from '@/features/select-tuning';
import { useStringLock } from '@/features/toggle-string-lock';
import { useAudioLifecycle } from '@/shared/lib/audio-session/useAppStateAudioGuard';
import { MicrophonePermissionStatus } from '@/shared/lib/permissions/useMicrophonePermission';
import { useStringMatching } from '@/widgets/fretboard-selector';
import {
  GaugeInterpolationResult,
  useGaugeInterpolation,
} from '@/widgets/pitch-gauge';
import {
  MonitorDisplayMode,
  SpectrumBarPoint,
  useWaveformFrame,
} from '@/widgets/spectrum-monitor';

export interface TunerPageViewModel {
  readonly permissionStatus: MicrophonePermissionStatus;
  readonly isPermissionGranted: boolean;
  readonly requestMicrophonePermission: () => void;
  readonly openSystemSettings: () => void;
  readonly activePreset: TuningPreset;
  readonly availablePresets: readonly TuningPreset[];
  readonly isMenuOpen: boolean;
  readonly toggleMenu: () => void;
  readonly selectPreset: (presetId: TuningPresetId) => void;
  readonly referenceA4Hz: number;
  readonly canDecrementA4: boolean;
  readonly canIncrementA4: boolean;
  readonly incrementA4: () => void;
  readonly decrementA4: () => void;
  readonly resetA4ToStandard: () => void;
  readonly isAutoMode: boolean;
  readonly isChromaticPreset: boolean;
  readonly lockedStringNumber: GuitarStringNumber | null;
  readonly lockedStringLabel: string | null;
  readonly selectManualString: (stringNumber: GuitarStringNumber) => void;
  readonly toggleLockMode: () => void;
  readonly reading: PitchReading | null;
  readonly status: TuningStatus;
  readonly rmsDb: number;
  readonly formattedFrequency: string;
  readonly formattedCents: string;
  readonly gauge: GaugeInterpolationResult;
  readonly activeStringNumber: GuitarStringNumber | null;
  readonly isMatchedStringInTune: boolean;
  readonly monitorMode: MonitorDisplayMode;
  readonly svgWaveformPath: string;
  readonly spectrumBars: readonly SpectrumBarPoint[];
  readonly toggleMonitorMode: () => void;
  readonly canRecordSession: boolean;
  readonly recordCurrentTuningToHistory: () => void;
}

const formatSignedCents = (cents: number, isLocked: boolean): string => {
  if (!isLocked) {
    return '0.0 cents';
  }
  const sign = cents > 0 ? '+' : '';
  return `${sign}${cents.toFixed(1)} cents`;
};

const formatFrequencyLabel = (
  reading: PitchReading | null,
  matchedString: GuitarString | null
): string => {
  if (!reading) {
    return '--.- Hz';
  }
  const targetHz = matchedString
    ? matchedString.frequencyHz
    : reading.targetFrequencyHz;
  return `${reading.frequencyHz.toFixed(2)} Hz / ${targetHz.toFixed(2)} Hz`;
};

export const useTunerPageModel = (): TunerPageViewModel => {
  const {
    permissionStatus,
    isPermissionGranted,
    isCapturing,
    requestPermission,
    openSystemSettings,
  } = useAudioLifecycle();

  const {
    activePreset,
    availablePresets,
    isMenuOpen,
    toggleMenu,
    selectPreset,
  } = useTuningSelection();

  const {
    referenceA4Hz,
    canDecrement,
    canIncrement,
    incrementA4,
    decrementA4,
    resetA4ToStandard,
  } = useCalibrationControl();

  const {
    isAutoMode,
    isChromaticPreset,
    lockedStringNumber,
    lockedGuitarString,
    selectManualString,
    toggleLockMode,
  } = useStringLock();

  const candidateTargetFrequenciesHz = useMemo<readonly number[]>(
    () =>
      activePreset.isChromatic
        ? []
        : activePreset.strings.map((guitarString) => guitarString.frequencyHz),
    [activePreset.isChromatic, activePreset.strings]
  );

  const pitchStream = usePitchStream({
    referenceA4Hz,
    lockedTargetFrequencyHz: lockedGuitarString
      ? lockedGuitarString.frequencyHz
      : null,
    candidateTargetFrequenciesHz,
    enabled: isCapturing,
  });

  const currentFreq = pitchStream.reading?.frequencyHz ?? 0;

  const stringMatch = useStringMatching({
    activePreset,
    currentFrequencyHz: currentFreq,
    isSignalLocked: pitchStream.isLocked,
    lockedStringNumber,
  });

  const effectiveCents =
    !activePreset.isChromatic && stringMatch.matchedString
      ? stringMatch.centsFromMatchedString
      : (pitchStream.reading?.cents ?? 0);

  const gauge = useGaugeInterpolation({
    centsShared: pitchStream.centsShared,
    isLockedShared: pitchStream.isLockedShared,
    status: pitchStream.status,
    cents: effectiveCents,
  });

  const waveformMonitor = useWaveformFrame(isCapturing);

  const handleRequestPermission = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  const handleOpenSettings = useCallback(() => {
    void openSystemSettings();
  }, [openSystemSettings]);

  const recordCurrentTuningToHistory = useCallback(() => {
    if (!pitchStream.reading) {
      return;
    }
    const targetString = stringMatch.matchedString;
    sessionRepository.recordTunedString({
      presetId: activePreset.id,
      presetName: activePreset.shortLabel,
      stringLabel: targetString ? targetString.label : 'CHM',
      noteName: `${pitchStream.reading.noteName}${pitchStream.reading.octave}`,
      targetFrequencyHz:
        Math.round(
          (targetString
            ? targetString.frequencyHz
            : pitchStream.reading.targetFrequencyHz) * 100
        ) / 100,
      measuredFrequencyHz:
        Math.round(pitchStream.reading.frequencyHz * 100) / 100,
      centsDeviation: effectiveCents,
      referenceA4Hz,
    });
  }, [
    activePreset.id,
    activePreset.shortLabel,
    effectiveCents,
    pitchStream.reading,
    referenceA4Hz,
    stringMatch.matchedString,
  ]);

  return {
    permissionStatus,
    isPermissionGranted,
    requestMicrophonePermission: handleRequestPermission,
    openSystemSettings: handleOpenSettings,
    activePreset,
    availablePresets,
    isMenuOpen,
    toggleMenu,
    selectPreset,
    referenceA4Hz,
    canDecrementA4: canDecrement,
    canIncrementA4: canIncrement,
    incrementA4,
    decrementA4,
    resetA4ToStandard,
    isAutoMode,
    isChromaticPreset,
    lockedStringNumber,
    lockedStringLabel: lockedGuitarString ? lockedGuitarString.label : null,
    selectManualString,
    toggleLockMode,
    reading: pitchStream.reading,
    status: pitchStream.status,
    rmsDb: pitchStream.rmsDb,
    formattedFrequency: formatFrequencyLabel(
      pitchStream.reading,
      stringMatch.matchedString
    ),
    formattedCents: formatSignedCents(effectiveCents, pitchStream.isLocked),
    gauge,
    activeStringNumber: stringMatch.matchedString
      ? stringMatch.matchedString.stringNumber
      : null,
    isMatchedStringInTune: stringMatch.isMatchedStringInTune,
    monitorMode: waveformMonitor.mode,
    svgWaveformPath: waveformMonitor.svgWaveformPath,
    spectrumBars: waveformMonitor.spectrumBars,
    toggleMonitorMode: waveformMonitor.toggleMode,
    canRecordSession: pitchStream.isLocked && pitchStream.reading !== null,
    recordCurrentTuningToHistory,
  };
};
