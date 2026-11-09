import { useCallback } from 'react';
import { tuningStore, useTuningStore } from '@/entities/tuning-preset';
import {
  CALIBRATION_STEP_HZ,
  DEFAULT_REFERENCE_A4_HZ,
  MAX_REFERENCE_A4_HZ,
  MIN_REFERENCE_A4_HZ,
} from '@/shared/config/constants';

export interface CalibrationControlState {
  readonly referenceA4Hz: number;
  readonly canDecrement: boolean;
  readonly canIncrement: boolean;
  readonly isDefaultCalibration: boolean;
  readonly incrementA4: () => void;
  readonly decrementA4: () => void;
  readonly resetA4ToStandard: () => void;
}

export const useCalibrationControl = (): CalibrationControlState => {
  const { referenceA4Hz } = useTuningStore();

  const incrementA4 = useCallback(() => {
    tuningStore.setReferenceA4Hz(referenceA4Hz + CALIBRATION_STEP_HZ);
  }, [referenceA4Hz]);

  const decrementA4 = useCallback(() => {
    tuningStore.setReferenceA4Hz(referenceA4Hz - CALIBRATION_STEP_HZ);
  }, [referenceA4Hz]);

  const resetA4ToStandard = useCallback(() => {
    tuningStore.setReferenceA4Hz(DEFAULT_REFERENCE_A4_HZ);
  }, []);

  return {
    referenceA4Hz,
    canDecrement: referenceA4Hz > MIN_REFERENCE_A4_HZ,
    canIncrement: referenceA4Hz < MAX_REFERENCE_A4_HZ,
    isDefaultCalibration: referenceA4Hz === DEFAULT_REFERENCE_A4_HZ,
    incrementA4,
    decrementA4,
    resetA4ToStandard,
  };
};
