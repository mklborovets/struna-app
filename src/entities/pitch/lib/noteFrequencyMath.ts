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

export const resolveClosestTargetFrequency = (
  frequencyHz: number,
  candidateTargetsHz: readonly number[]
): number | null => {
  if (frequencyHz <= 0 || candidateTargetsHz.length === 0) {
    return null;
  }
  let closestHz: number | null = null;
  let smallestAbsCents = Number.POSITIVE_INFINITY;

  for (const candidateHz of candidateTargetsHz) {
    if (candidateHz <= 0) {
      continue;
    }
    const absCents = Math.abs(calculateCentsDeviation(frequencyHz, candidateHz));
    if (absCents < smallestAbsCents) {
      smallestAbsCents = absCents;
      closestHz = candidateHz;
    }
  }

  return closestHz;
};

export const convertFrequencyToPitchReading = (
  frequencyHz: number,
  referenceA4Hz: number,
  lockedTargetHz?: number | null,
  candidateTargetsHz?: readonly number[]
): PitchReading | null => {
  if (frequencyHz <= 0 || referenceA4Hz <= 0) {
    return null;
  }

  const exactMidiNote =
    MIDI_A4_NOTE_NUMBER +
    SEMITONES_PER_OCTAVE * Math.log2(frequencyHz / referenceA4Hz);
  const nearestMidiNote = Math.round(exactMidiNote);

  const standardNoteTargetHz =
    referenceA4Hz *
    Math.pow(2, (nearestMidiNote - MIDI_A4_NOTE_NUMBER) / SEMITONES_PER_OCTAVE);

  let matchedTargetHz = standardNoteTargetHz;
  if (lockedTargetHz && lockedTargetHz > 0) {
    matchedTargetHz = lockedTargetHz;
  } else if (candidateTargetsHz && candidateTargetsHz.length > 0) {
    const closestStringHz = resolveClosestTargetFrequency(
      frequencyHz,
      candidateTargetsHz
    );
    if (closestStringHz !== null) {
      const centsFromGuitarString = Math.abs(
        calculateCentsDeviation(frequencyHz, closestStringHz)
      );
      if (centsFromGuitarString <= 150) {
        matchedTargetHz = closestStringHz;
      }
    }
  }

  const cents = calculateCentsDeviation(frequencyHz, matchedTargetHz);

  const noteIndex =
    ((nearestMidiNote % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE;
  const octave = Math.floor(nearestMidiNote / SEMITONES_PER_OCTAVE) - 1;
  const resolvedNoteName = NOTE_NAMES[noteIndex] ?? 'A';

  return {
    frequencyHz,
    targetFrequencyHz: matchedTargetHz,
    cents,
    noteName: resolvedNoteName,
    octave,
    midiNote: nearestMidiNote,
  };
};
