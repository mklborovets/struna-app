import { NativeModules } from 'react-native';
import {
  DEFAULT_METRONOME_BPM,
  DEFAULT_NOISE_GATE_DB,
} from '@/shared/config/constants';
import { NativePitchFrame, StrunaJsiEngine } from './types';

interface NativeStrunaAudioModuleSpec {
  installJsiBindings?: () => boolean;
  startNativeCapture?: () => boolean;
  stopNativeCapture?: () => void;
}

const SILENT_PITCH_FRAME: NativePitchFrame = Object.freeze({
  frequencyHz: 0,
  confidence: 0,
  rmsDb: -100,
  isLocked: false,
});

let jsiInstallAttempted = false;
let fallbackGateDb = DEFAULT_NOISE_GATE_DB;
let fallbackMetronomeBpm = DEFAULT_METRONOME_BPM;
let fallbackMetronomeActive = false;

const getNativeAudioModule = (): NativeStrunaAudioModuleSpec | undefined => {
  const modules = NativeModules as Record<
    string,
    NativeStrunaAudioModuleSpec | undefined
  >;
  return modules.StrunaAudioModule;
};

const readGlobalEngine = (): StrunaJsiEngine | undefined => {
  return globalThis.__StrunaEngine;
};

const resolveJsiEngine = (): StrunaJsiEngine | undefined => {
  const existing = readGlobalEngine();
  if (existing !== undefined) {
    return existing;
  }

  if (!jsiInstallAttempted) {
    jsiInstallAttempted = true;
    const nativeModule = getNativeAudioModule();
    if (nativeModule?.installJsiBindings) {
      nativeModule.installJsiBindings();
    }
    const installed = readGlobalEngine();
    if (installed) {
      installed.setNoiseGateThresholdDb(fallbackGateDb);
      installed.setMetronomeBpm(fallbackMetronomeBpm);
      if (fallbackMetronomeActive) {
        installed.setMetronomeActive(true);
      }
    }
  }

  return readGlobalEngine();
};

export const nativeStrunaEngine: StrunaJsiEngine = {
  startAudioCapture(): boolean {
    const engine = resolveJsiEngine();
    const nativeModule = getNativeAudioModule();
    const nativeStarted = nativeModule?.startNativeCapture
      ? nativeModule.startNativeCapture()
      : true;
    if (engine) {
      return engine.startAudioCapture() && nativeStarted;
    }
    return nativeStarted;
  },

  stopAudioCapture(): void {
    const engine = resolveJsiEngine();
    if (engine) {
      engine.stopAudioCapture();
    }
    const nativeModule = getNativeAudioModule();
    if (nativeModule?.stopNativeCapture) {
      nativeModule.stopNativeCapture();
    }
  },

  pollPitchFrame(): NativePitchFrame {
    const engine = resolveJsiEngine();
    if (!engine) {
      return SILENT_PITCH_FRAME;
    }
    return engine.pollPitchFrame();
  },

  getWaveformSnapshot(targetArray: Float32Array): void {
    const engine = resolveJsiEngine();
    if (!engine) {
      targetArray.fill(0);
      return;
    }
    engine.getWaveformSnapshot(targetArray);
  },

  getSpectrumSnapshot(targetArray: Float32Array): void {
    const engine = resolveJsiEngine();
    if (!engine || typeof engine.getSpectrumSnapshot !== 'function') {
      targetArray.fill(0);
      return;
    }
    engine.getSpectrumSnapshot(targetArray);
  },

  setNoiseGateThresholdDb(decibels: number): void {
    fallbackGateDb = decibels;
    const engine = resolveJsiEngine();
    if (engine) {
      engine.setNoiseGateThresholdDb(fallbackGateDb);
    }
  },

  setMetronomeBpm(bpm: number): void {
    fallbackMetronomeBpm = bpm;
    const engine = resolveJsiEngine();
    if (engine) {
      engine.setMetronomeBpm(fallbackMetronomeBpm);
    }
  },

  setMetronomeActive(active: boolean): void {
    fallbackMetronomeActive = active;
    const engine = resolveJsiEngine();
    if (engine) {
      engine.setMetronomeActive(fallbackMetronomeActive);
    }
  },

  getMetronomeBpm(): number {
    const engine = resolveJsiEngine();
    if (engine && typeof engine.getMetronomeBpm === 'function') {
      return engine.getMetronomeBpm();
    }
    return fallbackMetronomeBpm;
  },

  isMetronomeActive(): boolean {
    const engine = resolveJsiEngine();
    if (engine && typeof engine.isMetronomeActive === 'function') {
      return engine.isMetronomeActive();
    }
    return fallbackMetronomeActive;
  },

  setDemoMode(enabled: boolean, frequencyHz?: number): void {
    const engine = resolveJsiEngine();
    if (engine && typeof engine.setDemoMode === 'function') {
      engine.setDemoMode(enabled, frequencyHz ?? 110.0);
    }
  },

  isDemoModeActive(): boolean {
    const engine = resolveJsiEngine();
    if (engine && typeof engine.isDemoModeActive === 'function') {
      return engine.isDemoModeActive();
    }
    return false;
  },
};
