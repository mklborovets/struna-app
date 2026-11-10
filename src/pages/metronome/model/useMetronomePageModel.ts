import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { nativeStrunaEngine } from '@/shared/api/jsi';
import {
  AUDIO_SAMPLE_RATE_HZ,
  DEFAULT_METRONOME_BPM,
  MAX_METRONOME_BPM,
  METRONOME_BEATS_PER_BAR,
  MIN_METRONOME_BPM,
} from '@/shared/config/constants';

export interface MetronomePageViewModel {
  readonly bpm: number;
  readonly isActive: boolean;
  readonly beatsPerBar: number;
  readonly samplesPerBeat: number;
  readonly tempoMarking: string;
  readonly toggleActive: () => void;
  readonly adjustBpmBy: (delta: number) => void;
  readonly setExactBpm: (nextBpm: number) => void;
}

const resolveTempoMarking = (bpm: number): string => {
  if (bpm < 60) {
    return 'LARGO';
  }
  if (bpm < 76) {
    return 'ADAGIO';
  }
  if (bpm < 108) {
    return 'ANDANTE';
  }
  if (bpm < 120) {
    return 'MODERATO';
  }
  if (bpm < 168) {
    return 'ALLEGRO';
  }
  return 'PRESTO';
};

export const useMetronomePageModel = (): MetronomePageViewModel => {
  const [bpm, setBpm] = useState<number>(() => {
    const current = nativeStrunaEngine.getMetronomeBpm?.();
    return current && current >= MIN_METRONOME_BPM && current <= MAX_METRONOME_BPM
      ? Math.round(current)
      : DEFAULT_METRONOME_BPM;
  });
  const [isActive, setIsActive] = useState<boolean>(() => {
    return nativeStrunaEngine.isMetronomeActive?.() ?? false;
  });

  const setExactBpm = useCallback((nextBpm: number) => {
    const clamped = Math.max(
      MIN_METRONOME_BPM,
      Math.min(MAX_METRONOME_BPM, Math.round(nextBpm))
    );
    setBpm(clamped);
    nativeStrunaEngine.setMetronomeBpm(clamped);
  }, []);

  const adjustBpmBy = useCallback(
    (delta: number) => {
      setExactBpm(bpm + delta);
    },
    [bpm, setExactBpm]
  );

  const toggleActive = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    nativeStrunaEngine.setMetronomeActive(next);
  }, [isActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState !== 'active') {
          setIsActive(false);
          nativeStrunaEngine.setMetronomeActive(false);
        } else {
          setIsActive(nativeStrunaEngine.isMetronomeActive?.() ?? false);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const samplesPerBeat = Math.round((AUDIO_SAMPLE_RATE_HZ * 60) / bpm);

  return {
    bpm,
    isActive,
    beatsPerBar: METRONOME_BEATS_PER_BAR,
    samplesPerBeat,
    tempoMarking: resolveTempoMarking(bpm),
    toggleActive,
    adjustBpmBy,
    setExactBpm,
  };
};
