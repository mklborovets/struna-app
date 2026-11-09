import type { SharedValue } from 'react-native-reanimated';

export type NoteName =
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

export type OctaveNumber = number;

export type TuningStatus = 'idle' | 'flat' | 'sharp' | 'in-tune';

export interface PitchReading {
  readonly frequencyHz: number;
  readonly targetFrequencyHz: number;
  readonly cents: number;
  readonly noteName: NoteName;
  readonly octave: OctaveNumber;
  readonly midiNote: number;
}

export interface PitchStreamState {
  readonly reading: PitchReading | null;
  readonly status: TuningStatus;
  readonly rmsDb: number;
  readonly confidence: number;
  readonly isLocked: boolean;
  readonly frequencyShared: SharedValue<number>;
  readonly centsShared: SharedValue<number>;
  readonly confidenceShared: SharedValue<number>;
  readonly rmsDbShared: SharedValue<number>;
  readonly isLockedShared: SharedValue<boolean>;
}
