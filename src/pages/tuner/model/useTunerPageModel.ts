import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
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
import {
  TuningMenuAnchor,
  useTuningSelection,
} from '@/features/select-tuning';
import { useStringLock } from '@/features/toggle-string-lock';
import { nativeStrunaEngine } from '@/shared/api/jsi';
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
  readonly isListening: boolean;
  readonly toggleListening: () => void;
  readonly activeDemoTone: string | null;
  readonly cycleDemoTone: () => void;
  readonly requestMicrophonePermission: () => void;
  readonly openSystemSettings: () => void;
  readonly activePreset: TuningPreset;
  readonly availablePresets: readonly TuningPreset[];
  readonly isMenuOpen: boolean;
  readonly tuningTriggerRef: RefObject<View>;
  readonly tuningMenuAnchor: TuningMenuAnchor;
  readonly toggleMenu: () => void;
  readonly closeMenu: () => void;
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
  readonly isSessionJustLogged: boolean;
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
    isCaptureRequested,
    setCaptureRequested,
    requestPermission,
    openSystemSettings,
  } = useAudioLifecycle();

  const {
    activePreset,
    availablePresets,
    isMenuOpen,
    triggerRef: tuningTriggerRef,
    menuAnchor: tuningMenuAnchor,
    toggleMenu,
    closeMenu,
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

  const toggleListening = useCallback(() => {
    setCaptureRequested(!isCaptureRequested);
  }, [isCaptureRequested, setCaptureRequested]);

  const [demoToneIndex, setDemoToneIndex] = useState<number>(-1);
  const demoTones = useMemo(
    () => [
      { label: 'A2 (110 Hz)', freq: 110.0 },
      { label: 'E2 (82.4 Hz)', freq: 82.41 },
      { label: 'D3 (-18c)', freq: 145.31 },
      { label: 'D3 (146.8 Hz)', freq: 146.83 },
      { label: 'G3 (+16c)', freq: 197.82 },
      { label: 'G3 (196 Hz)', freq: 196.0 },
      { label: 'B3 (246.9 Hz)', freq: 246.94 },
      { label: 'E4 (329.6 Hz)', freq: 329.63 },
    ],
    []
  );

  const cycleDemoTone = useCallback(() => {
    setDemoToneIndex((prev) => {
      const next = prev + 1;
      if (next >= demoTones.length) {
        nativeStrunaEngine.setDemoMode?.(false);
        return -1;
      }
      const tone = demoTones[next];
      if (tone) {
        nativeStrunaEngine.setDemoMode?.(true, tone.freq);
      }
      return next;
    });
  }, [demoTones]);

  const activeDemoTone =
    demoToneIndex >= 0 && demoToneIndex < demoTones.length
      ? demoTones[demoToneIndex]!.label
      : null;

  const isStreamActive = isCapturing || activeDemoTone !== null;

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
    enabled: isStreamActive,
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

  const waveformMonitor = useWaveformFrame(isStreamActive);

  const lastValidSnapshotRef = useRef<{
    reading: PitchReading;
    matchedString: GuitarString | null;
    cents: number;
  } | null>(null);
  const [hasSnapshotToLog, setHasSnapshotToLog] = useState<boolean>(false);
  const [isSessionJustLogged, setIsSessionJustLogged] =
    useState<boolean>(false);

  useEffect(() => {
    if (pitchStream.isLocked && pitchStream.reading) {
      lastValidSnapshotRef.current = {
        reading: pitchStream.reading,
        matchedString: stringMatch.matchedString,
        cents: effectiveCents,
      };
      if (!hasSnapshotToLog) {
        setHasSnapshotToLog(true);
      }
    }
  }, [
    effectiveCents,
    hasSnapshotToLog,
    pitchStream.isLocked,
    pitchStream.reading,
    stringMatch.matchedString,
  ]);

  const handleRequestPermission = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  const handleOpenSettings = useCallback(() => {
    void openSystemSettings();
  }, [openSystemSettings]);

  const recordCurrentTuningToHistory = useCallback(() => {
    const activeReading =
      pitchStream.reading ?? lastValidSnapshotRef.current?.reading ?? null;
    if (!activeReading) {
      return;
    }
    const targetString = pitchStream.reading
      ? stringMatch.matchedString
      : (lastValidSnapshotRef.current?.matchedString ?? null);
    const centsToRecord = pitchStream.reading
      ? effectiveCents
      : (lastValidSnapshotRef.current?.cents ?? activeReading.cents);

    sessionRepository.recordTunedString({
      presetId: activePreset.id,
      presetName: activePreset.shortLabel,
      stringLabel: targetString ? targetString.label : 'CHM',
      noteName: `${activeReading.noteName}${activeReading.octave}`,
      targetFrequencyHz:
        Math.round(
          (targetString
            ? targetString.frequencyHz
            : activeReading.targetFrequencyHz) * 100
        ) / 100,
      measuredFrequencyHz: Math.round(activeReading.frequencyHz * 100) / 100,
      centsDeviation: centsToRecord,
      referenceA4Hz,
    });

    setIsSessionJustLogged(true);
    setTimeout(() => {
      setIsSessionJustLogged(false);
    }, 1200);
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
    isListening: isCapturing,
    toggleListening,
    activeDemoTone,
    cycleDemoTone,
    requestMicrophonePermission: handleRequestPermission,
    openSystemSettings: handleOpenSettings,
    activePreset,
    availablePresets,
    isMenuOpen,
    tuningTriggerRef,
    tuningMenuAnchor,
    toggleMenu,
    closeMenu,
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
    canRecordSession:
      (pitchStream.isLocked && pitchStream.reading !== null) ||
      hasSnapshotToLog,
    isSessionJustLogged,
    recordCurrentTuningToHistory,
  };
};
