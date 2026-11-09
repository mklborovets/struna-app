import { useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { nativeStrunaEngine } from '@/shared/api/jsi';
import {
  DEFAULT_REFERENCE_A4_HZ,
  JSI_POLL_INTERVAL_MS,
} from '@/shared/config/constants';
import {
  clampCentsForGauge,
  convertFrequencyToPitchReading,
  resolveTuningStatus,
} from '../lib/noteFrequencyMath';
import { PitchReading, PitchStreamState, TuningStatus } from './types';

export interface UsePitchStreamParams {
  readonly referenceA4Hz?: number;
  readonly lockedTargetFrequencyHz?: number | null;
  readonly enabled?: boolean;
}

export const usePitchStream = ({
  referenceA4Hz = DEFAULT_REFERENCE_A4_HZ,
  lockedTargetFrequencyHz = null,
  enabled = true,
}: UsePitchStreamParams = {}): PitchStreamState => {
  const frequencyShared = useSharedValue<number>(0);
  const centsShared = useSharedValue<number>(0);
  const confidenceShared = useSharedValue<number>(0);
  const rmsDbShared = useSharedValue<number>(-100);
  const isLockedShared = useSharedValue<boolean>(false);

  const [reading, setReading] = useState<PitchReading | null>(null);
  const [status, setStatus] = useState<TuningStatus>('idle');
  const [rmsDb, setRmsDb] = useState<number>(-100);
  const [confidence, setConfidence] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const lastSummaryKeyRef = useRef<string>('idle');

  useEffect(() => {
    if (!enabled) {
      frequencyShared.value = 0;
      centsShared.value = 0;
      confidenceShared.value = 0;
      rmsDbShared.value = -100;
      isLockedShared.value = false;
      setReading(null);
      setStatus('idle');
      setIsLocked(false);
      return;
    }

    const intervalId = setInterval(() => {
      const frame = nativeStrunaEngine.pollPitchFrame();
      rmsDbShared.value = frame.rmsDb;
      confidenceShared.value = frame.confidence;
      isLockedShared.value = frame.isLocked;

      if (!frame.isLocked || frame.frequencyHz <= 0) {
        frequencyShared.value = 0;
        centsShared.value = 0;
        const idleKey = `idle:${Math.round(frame.rmsDb)}`;
        if (lastSummaryKeyRef.current !== idleKey) {
          lastSummaryKeyRef.current = idleKey;
          setReading(null);
          setStatus('idle');
          setIsLocked(false);
          setConfidence(0);
          setRmsDb(Math.round(frame.rmsDb));
        }
        return;
      }

      const nextReading = convertFrequencyToPitchReading(
        frame.frequencyHz,
        referenceA4Hz,
        lockedTargetFrequencyHz
      );

      if (!nextReading) {
        return;
      }

      frequencyShared.value = nextReading.frequencyHz;
      centsShared.value = clampCentsForGauge(nextReading.cents);

      const nextStatus = resolveTuningStatus(nextReading.cents, true);
      const summaryKey = `${nextReading.noteName}${nextReading.octave}:${nextReading.cents.toFixed(1)}:${nextStatus}`;

      if (lastSummaryKeyRef.current !== summaryKey) {
        lastSummaryKeyRef.current = summaryKey;
        setReading(nextReading);
        setStatus(nextStatus);
        setIsLocked(true);
        setConfidence(Math.round(frame.confidence * 100) / 100);
        setRmsDb(Math.round(frame.rmsDb));
      }
    }, JSI_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    centsShared,
    confidenceShared,
    enabled,
    frequencyShared,
    isLockedShared,
    lockedTargetFrequencyHz,
    referenceA4Hz,
    rmsDbShared,
  ]);

  return {
    reading,
    status,
    rmsDb,
    confidence,
    isLocked,
    frequencyShared,
    centsShared,
    confidenceShared,
    rmsDbShared,
    isLockedShared,
  };
};
