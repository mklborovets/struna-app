export interface TuningSessionRecord {
  readonly id: number;
  readonly presetId: string;
  readonly presetName: string;
  readonly stringLabel: string;
  readonly noteName: string;
  readonly targetFrequencyHz: number;
  readonly measuredFrequencyHz: number;
  readonly centsDeviation: number;
  readonly referenceA4Hz: number;
  readonly createdAtIso: string;
}

export interface CreateTuningSessionInput {
  readonly presetId: string;
  readonly presetName: string;
  readonly stringLabel: string;
  readonly noteName: string;
  readonly targetFrequencyHz: number;
  readonly measuredFrequencyHz: number;
  readonly centsDeviation: number;
  readonly referenceA4Hz: number;
}

export interface PersistedUserPreferences {
  readonly presetId: string;
  readonly referenceA4Hz: number;
}
