import { useSyncExternalStore } from 'react';
import {
  DEFAULT_REFERENCE_A4_HZ,
  MAX_REFERENCE_A4_HZ,
  MIN_REFERENCE_A4_HZ,
} from '@/shared/config/constants';
import { buildCalibratedPreset, getAllCalibratedPresets } from './presets';
import {
  GuitarString,
  GuitarStringNumber,
  TuningPreset,
  TuningPresetId,
} from './types';

export interface TuningStoreState {
  readonly selectedPresetId: TuningPresetId;
  readonly referenceA4Hz: number;
  readonly lockedStringNumber: GuitarStringNumber | null;
  readonly activePreset: TuningPreset;
  readonly availablePresets: readonly TuningPreset[];
}

type StoreListener = () => void;

const clampReferenceA4 = (hz: number): number => {
  const rounded = Math.round(hz);
  return Math.max(
    MIN_REFERENCE_A4_HZ,
    Math.min(MAX_REFERENCE_A4_HZ, rounded)
  );
};

class TuningStoreManager {
  private state: TuningStoreState;
  private readonly listeners = new Set<StoreListener>();

  constructor() {
    const initialA4 = DEFAULT_REFERENCE_A4_HZ;
    const initialPresetId: TuningPresetId = 'standard';
    this.state = {
      selectedPresetId: initialPresetId,
      referenceA4Hz: initialA4,
      lockedStringNumber: null,
      activePreset: buildCalibratedPreset(initialPresetId, initialA4),
      availablePresets: getAllCalibratedPresets(initialA4),
    };
  }

  getSnapshot = (): TuningStoreState => {
    return this.state;
  };

  subscribe = (listener: StoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setPresetId = (presetId: TuningPresetId): void => {
    if (this.state.selectedPresetId === presetId) {
      return;
    }
    const nextPreset = buildCalibratedPreset(
      presetId,
      this.state.referenceA4Hz
    );
    this.state = {
      ...this.state,
      selectedPresetId: presetId,
      lockedStringNumber: nextPreset.isChromatic
        ? null
        : this.state.lockedStringNumber,
      activePreset: nextPreset,
    };
    this.emitChange();
  };

  setReferenceA4Hz = (nextA4Hz: number): void => {
    const clampedA4 = clampReferenceA4(nextA4Hz);
    if (this.state.referenceA4Hz === clampedA4) {
      return;
    }
    this.state = {
      ...this.state,
      referenceA4Hz: clampedA4,
      activePreset: buildCalibratedPreset(
        this.state.selectedPresetId,
        clampedA4
      ),
      availablePresets: getAllCalibratedPresets(clampedA4),
    };
    this.emitChange();
  };

  setLockedStringNumber = (
    stringNumber: GuitarStringNumber | null
  ): void => {
    if (this.state.activePreset.isChromatic && stringNumber !== null) {
      return;
    }
    if (this.state.lockedStringNumber === stringNumber) {
      return;
    }
    this.state = {
      ...this.state,
      lockedStringNumber: stringNumber,
    };
    this.emitChange();
  };

  getLockedGuitarString = (): GuitarString | null => {
    if (this.state.lockedStringNumber === null) {
      return null;
    }
    return (
      this.state.activePreset.strings.find(
        (str) => str.stringNumber === this.state.lockedStringNumber
      ) ?? null
    );
  };

  private emitChange(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const tuningStore = new TuningStoreManager();

export const useTuningStore = (): TuningStoreState => {
  return useSyncExternalStore(
    tuningStore.subscribe,
    tuningStore.getSnapshot,
    tuningStore.getSnapshot
  );
};
