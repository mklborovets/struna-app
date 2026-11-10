export interface NativePitchFrame {
  readonly frequencyHz: number;
  readonly confidence: number;
  readonly rmsDb: number;
  readonly isLocked: boolean;
}

export interface StrunaJsiEngine {
  startAudioCapture(): boolean;
  stopAudioCapture(): void;
  pollPitchFrame(): NativePitchFrame;
  getWaveformSnapshot(targetArray: Float32Array): void;
  getSpectrumSnapshot(targetArray: Float32Array): void;
  setNoiseGateThresholdDb(decibels: number): void;
  setMetronomeBpm(bpm: number): void;
  setMetronomeActive(active: boolean): void;
  getMetronomeBpm?(): number;
  isMetronomeActive?(): boolean;
  setDemoMode?(enabled: boolean, frequencyHz?: number): void;
  isDemoModeActive?(): boolean;
}

declare global {
  var __StrunaEngine: StrunaJsiEngine | undefined;
}
