import { useCallback, useState } from 'react';
import {
  TuningPreset,
  TuningPresetId,
  tuningStore,
  useTuningStore,
} from '@/entities/tuning-preset';

export interface TuningSelectionControl {
  readonly activePreset: TuningPreset;
  readonly availablePresets: readonly TuningPreset[];
  readonly isMenuOpen: boolean;
  readonly toggleMenu: () => void;
  readonly closeMenu: () => void;
  readonly selectPreset: (presetId: TuningPresetId) => void;
}

export const useTuningSelection = (): TuningSelectionControl => {
  const { activePreset, availablePresets } = useTuningStore();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const selectPreset = useCallback((presetId: TuningPresetId) => {
    tuningStore.setPresetId(presetId);
    setIsMenuOpen(false);
  }, []);

  return {
    activePreset,
    availablePresets,
    isMenuOpen,
    toggleMenu,
    closeMenu,
    selectPreset,
  };
};
