import { useCallback, useEffect, useState } from 'react';
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
  const [bpm, setBpm] = useState<number>(DEFAULT_METRONOME_BPM);
  const [isActive, setIsActive] = useState<boolean>(false);

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
    setIsActive((prev) => {
      const next = !prev;
      nativeStrunaEngine.setMetronomeActive(next);
      return next;
    });
  }, []);

  useEffect(() => {
    nativeStrunaEngine.setMetronomeBpm(DEFAULT_METRONOME_BPM);
    return () => {
      nativeStrunaEngine.setMetronomeActive(false);
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
