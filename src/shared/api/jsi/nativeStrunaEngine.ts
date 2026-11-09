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
  const modules = NativeModules as Record<string, NativeStrunaAudioModuleSpec | undefined>;
  return modules.StrunaAudioModule;
};

const resolveJsiEngine = (): StrunaJsiEngine | undefined => {
  if (globalThis.__StrunaEngine !== undefined) {
    return globalThis.__StrunaEngine;
  }

  if (!jsiInstallAttempted) {
    jsiInstallAttempted = true;
    const nativeModule = getNativeAudioModule();
    if (nativeModule?.installJsiBindings) {
      nativeModule.installJsiBindings();
    }
  }

  return globalThis.__StrunaEngine;
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
};
