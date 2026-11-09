import { useCallback, useMemo } from 'react';
import {
  GuitarString,
  GuitarStringNumber,
  tuningStore,
  useTuningStore,
} from '@/entities/tuning-preset';

export interface StringLockControl {
  readonly isAutoMode: boolean;
  readonly isChromaticPreset: boolean;
  readonly lockedStringNumber: GuitarStringNumber | null;
  readonly lockedGuitarString: GuitarString | null;
  readonly enableAutoMode: () => void;
  readonly selectManualString: (stringNumber: GuitarStringNumber) => void;
  readonly toggleLockMode: () => void;
}

export const useStringLock = (): StringLockControl => {
  const { activePreset, lockedStringNumber } = useTuningStore();

  const lockedGuitarString = useMemo<GuitarString | null>(() => {
    if (lockedStringNumber === null) {
      return null;
    }
    return (
      activePreset.strings.find(
        (str) => str.stringNumber === lockedStringNumber
      ) ?? null
    );
  }, [activePreset.strings, lockedStringNumber]);

  const enableAutoMode = useCallback(() => {
    tuningStore.setLockedStringNumber(null);
  }, []);

  const selectManualString = useCallback((stringNumber: GuitarStringNumber) => {
    const current = tuningStore.getSnapshot().lockedStringNumber;
    if (current === stringNumber) {
      tuningStore.setLockedStringNumber(null);
    } else {
      tuningStore.setLockedStringNumber(stringNumber);
    }
  }, []);

  const toggleLockMode = useCallback(() => {
    const current = tuningStore.getSnapshot();
    if (current.activePreset.isChromatic) {
      return;
    }
    if (current.lockedStringNumber !== null) {
      tuningStore.setLockedStringNumber(null);
    } else {
      const firstString = current.activePreset.strings[0];
      if (firstString) {
        tuningStore.setLockedStringNumber(firstString.stringNumber);
      }
    }
  }, []);

  return {
    isAutoMode: lockedStringNumber === null,
    isChromaticPreset: activePreset.isChromatic,
    lockedStringNumber,
    lockedGuitarString,
    enableAutoMode,
    selectManualString,
    toggleLockMode,
  };
};
