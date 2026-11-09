export type TuningPresetId =
  | 'standard'
  | 'drop_d'
  | 'open_g'
  | 'dadgad'
  | 'half_step_down'
  | 'chromatic';

export type GuitarStringNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type TuningNoteLabel =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

export interface GuitarString {
  readonly stringNumber: GuitarStringNumber;
  readonly label: string;
  readonly noteName: TuningNoteLabel;
  readonly octave: number;
  readonly midiNote: number;
  readonly frequencyHz: number;
}

export interface TuningPreset {
  readonly id: TuningPresetId;
  readonly name: string;
  readonly shortLabel: string;
  readonly isChromatic: boolean;
  readonly strings: readonly GuitarString[];
}
