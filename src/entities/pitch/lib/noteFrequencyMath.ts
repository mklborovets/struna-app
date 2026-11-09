import {
  CENTS_PER_OCTAVE,
  CLOSE_TUNE_THRESHOLD_CENTS,
  GAUGE_MAX_CENTS_RANGE,
  IN_TUNE_THRESHOLD_CENTS,
  MIDI_A4_NOTE_NUMBER,
  SEMITONES_PER_OCTAVE,
} from '@/shared/config/constants';
import { NoteName, PitchReading, TuningStatus } from '../model/types';

const NOTE_NAMES: readonly NoteName[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

export const calculateCentsDeviation = (
  frequencyHz: number,
  targetFrequencyHz: number
): number => {
  if (frequencyHz <= 0 || targetFrequencyHz <= 0) {
    return 0;
  }
  const rawCents =
    CENTS_PER_OCTAVE * Math.log2(frequencyHz / targetFrequencyHz);
  if (Math.abs(rawCents) < 0.1) {
    return 0;
  }
  const rounded = Math.round(rawCents * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
};

export const clampCentsForGauge = (cents: number): number => {
  return Math.max(
    -GAUGE_MAX_CENTS_RANGE,
    Math.min(GAUGE_MAX_CENTS_RANGE, cents)
  );
};

export const resolveTuningStatus = (
  cents: number,
  isLocked: boolean
): TuningStatus => {
  if (!isLocked) {
    return 'idle';
  }
  if (Math.abs(cents) <= IN_TUNE_THRESHOLD_CENTS) {
    return 'in-tune';
  }
  return cents < 0 ? 'flat' : 'sharp';
};

export const isWithinCloseTuneRange = (cents: number): boolean => {
  return Math.abs(cents) <= CLOSE_TUNE_THRESHOLD_CENTS;
};

export const convertFrequencyToPitchReading = (
  frequencyHz: number,
  referenceA4Hz: number,
  lockedTargetHz?: number | null
): PitchReading | null => {
  if (frequencyHz <= 0 || referenceA4Hz <= 0) {
    return null;
  }

  const effectiveFrequencyForMidi =
    lockedTargetHz && lockedTargetHz > 0 ? lockedTargetHz : frequencyHz;

  const exactMidiNote =
    MIDI_A4_NOTE_NUMBER +
    SEMITONES_PER_OCTAVE * Math.log2(effectiveFrequencyForMidi / referenceA4Hz);
  const nearestMidiNote = Math.round(exactMidiNote);

  const targetFrequencyHz =
    lockedTargetHz && lockedTargetHz > 0
      ? lockedTargetHz
      : referenceA4Hz *
        Math.pow(
          2,
          (nearestMidiNote - MIDI_A4_NOTE_NUMBER) / SEMITONES_PER_OCTAVE
        );

  const cents = calculateCentsDeviation(frequencyHz, targetFrequencyHz);

  const noteIndex =
    ((nearestMidiNote % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE;
  const octave = Math.floor(nearestMidiNote / SEMITONES_PER_OCTAVE) - 1;
  const resolvedNoteName = NOTE_NAMES[noteIndex] ?? 'A';

  return {
    frequencyHz: Math.round(frequencyHz * 100) / 100,
    targetFrequencyHz: Math.round(targetFrequencyHz * 100) / 100,
    cents,
    noteName: resolvedNoteName,
    octave,
    midiNote: nearestMidiNote,
  };
};
