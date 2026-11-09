import {
  DEFAULT_REFERENCE_A4_HZ,
  MIDI_A4_NOTE_NUMBER,
  SEMITONES_PER_OCTAVE,
} from '@/shared/config/constants';
import {
  GuitarString,
  GuitarStringNumber,
  TuningNoteLabel,
  TuningPreset,
  TuningPresetId,
} from './types';

interface RawStringDefinition {
  readonly stringNumber: GuitarStringNumber;
  readonly label: string;
  readonly noteName: TuningNoteLabel;
  readonly octave: number;
  readonly midiNote: number;
}

interface RawPresetDefinition {
  readonly id: TuningPresetId;
  readonly name: string;
  readonly shortLabel: string;
  readonly isChromatic: boolean;
  readonly rawStrings: readonly RawStringDefinition[];
}

export const computeMidiNoteFrequencyHz = (
  midiNote: number,
  referenceA4Hz: number = DEFAULT_REFERENCE_A4_HZ
): number => {
  const exactHz =
    referenceA4Hz *
    Math.pow(
      2,
      (midiNote - MIDI_A4_NOTE_NUMBER) / SEMITONES_PER_OCTAVE
    );
  return Math.round(exactHz * 10000) / 10000;
};

const RAW_PRESETS: readonly RawPresetDefinition[] = [
  {
    id: 'standard',
    name: 'Standard (E A D G B e)',
    shortLabel: 'Standard',
    isChromatic: false,
    rawStrings: [
      { stringNumber: 6, label: '6E', noteName: 'E', octave: 2, midiNote: 40 },
      { stringNumber: 5, label: '5A', noteName: 'A', octave: 2, midiNote: 45 },
      { stringNumber: 4, label: '4D', noteName: 'D', octave: 3, midiNote: 50 },
      { stringNumber: 3, label: '3G', noteName: 'G', octave: 3, midiNote: 55 },
      { stringNumber: 2, label: '2B', noteName: 'B', octave: 3, midiNote: 59 },
      { stringNumber: 1, label: '1e', noteName: 'E', octave: 4, midiNote: 64 },
    ],
  },
  {
    id: 'drop_d',
    name: 'Drop D (D A D G B e)',
    shortLabel: 'Drop D',
    isChromatic: false,
    rawStrings: [
      { stringNumber: 6, label: '6D', noteName: 'D', octave: 2, midiNote: 38 },
      { stringNumber: 5, label: '5A', noteName: 'A', octave: 2, midiNote: 45 },
      { stringNumber: 4, label: '4D', noteName: 'D', octave: 3, midiNote: 50 },
      { stringNumber: 3, label: '3G', noteName: 'G', octave: 3, midiNote: 55 },
      { stringNumber: 2, label: '2B', noteName: 'B', octave: 3, midiNote: 59 },
      { stringNumber: 1, label: '1e', noteName: 'E', octave: 4, midiNote: 64 },
    ],
  },
  {
    id: 'open_g',
    name: 'Open G (D G D G B D)',
    shortLabel: 'Open G',
    isChromatic: false,
    rawStrings: [
      { stringNumber: 6, label: '6D', noteName: 'D', octave: 2, midiNote: 38 },
      { stringNumber: 5, label: '5G', noteName: 'G', octave: 2, midiNote: 43 },
      { stringNumber: 4, label: '4D', noteName: 'D', octave: 3, midiNote: 50 },
      { stringNumber: 3, label: '3G', noteName: 'G', octave: 3, midiNote: 55 },
      { stringNumber: 2, label: '2B', noteName: 'B', octave: 3, midiNote: 59 },
      { stringNumber: 1, label: '1D', noteName: 'D', octave: 4, midiNote: 62 },
    ],
  },
  {
    id: 'dadgad',
    name: 'DADGAD (D A D G A D)',
    shortLabel: 'DADGAD',
    isChromatic: false,
    rawStrings: [
      { stringNumber: 6, label: '6D', noteName: 'D', octave: 2, midiNote: 38 },
      { stringNumber: 5, label: '5A', noteName: 'A', octave: 2, midiNote: 45 },
      { stringNumber: 4, label: '4D', noteName: 'D', octave: 3, midiNote: 50 },
      { stringNumber: 3, label: '3G', noteName: 'G', octave: 3, midiNote: 55 },
      { stringNumber: 2, label: '2A', noteName: 'A', octave: 3, midiNote: 57 },
      { stringNumber: 1, label: '1D', noteName: 'D', octave: 4, midiNote: 62 },
    ],
  },
  {
    id: 'half_step_down',
    name: 'Half-Step Down (D# G# C# F# A# D#)',
    shortLabel: 'Eb Standard',
    isChromatic: false,
    rawStrings: [
      { stringNumber: 6, label: '6D#', noteName: 'D#', octave: 2, midiNote: 39 },
      { stringNumber: 5, label: '5G#', noteName: 'G#', octave: 2, midiNote: 44 },
      { stringNumber: 4, label: '4C#', noteName: 'C#', octave: 3, midiNote: 49 },
      { stringNumber: 3, label: '3F#', noteName: 'F#', octave: 3, midiNote: 54 },
      { stringNumber: 2, label: '2A#', noteName: 'A#', octave: 3, midiNote: 58 },
      { stringNumber: 1, label: '1D#', noteName: 'D#', octave: 4, midiNote: 63 },
    ],
  },
  {
    id: 'chromatic',
    name: 'Chromatic (All 12 Notes)',
    shortLabel: 'Chromatic',
    isChromatic: true,
    rawStrings: [],
  },
];

export const buildCalibratedPreset = (
  presetId: TuningPresetId,
  referenceA4Hz: number = DEFAULT_REFERENCE_A4_HZ
): TuningPreset => {
  const found =
    RAW_PRESETS.find((item) => item.id === presetId) ?? RAW_PRESETS[0]!;

  const calibratedStrings: GuitarString[] = found.rawStrings.map((raw) => ({
    stringNumber: raw.stringNumber,
    label: raw.label,
    noteName: raw.noteName,
    octave: raw.octave,
    midiNote: raw.midiNote,
    frequencyHz: computeMidiNoteFrequencyHz(raw.midiNote, referenceA4Hz),
  }));

  return {
    id: found.id,
    name: found.name,
    shortLabel: found.shortLabel,
    isChromatic: found.isChromatic,
    strings: calibratedStrings,
  };
};

export const getAllCalibratedPresets = (
  referenceA4Hz: number = DEFAULT_REFERENCE_A4_HZ
): readonly TuningPreset[] => {
  return RAW_PRESETS.map((preset) =>
    buildCalibratedPreset(preset.id, referenceA4Hz)
  );
};

export const TUNING_PRESET_IDS: readonly TuningPresetId[] = RAW_PRESETS.map(
  (preset) => preset.id
);
