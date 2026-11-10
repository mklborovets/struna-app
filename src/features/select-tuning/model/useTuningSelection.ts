import { RefObject, useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  TuningPreset,
  TuningPresetId,
  tuningStore,
  useTuningStore,
} from '@/entities/tuning-preset';

export interface TuningMenuAnchor {
  readonly top: number;
  readonly left: number;
  readonly width: number;
}

export interface TuningSelectionControl {
  readonly activePreset: TuningPreset;
  readonly availablePresets: readonly TuningPreset[];
  readonly isMenuOpen: boolean;
  readonly triggerRef: RefObject<View>;
  readonly menuAnchor: TuningMenuAnchor;
  readonly toggleMenu: () => void;
  readonly closeMenu: () => void;
  readonly selectPreset: (presetId: TuningPresetId) => void;
}

const DEFAULT_MENU_ANCHOR: TuningMenuAnchor = {
  top: 150,
  left: 16,
  width: 220,
};

export const useTuningSelection = (): TuningSelectionControl => {
  const { activePreset, availablePresets } = useTuningStore();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [menuAnchor, setMenuAnchor] =
    useState<TuningMenuAnchor>(DEFAULT_MENU_ANCHOR);
  const triggerRef = useRef<View>(null);

  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }
    const node = triggerRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        setMenuAnchor({
          top: y + height + 6,
          left: x,
          width: Math.max(220, width),
        });
        setIsMenuOpen(true);
      });
      return;
    }
    setIsMenuOpen(true);
  }, [isMenuOpen]);

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
    triggerRef,
    menuAnchor,
    toggleMenu,
    closeMenu,
    selectPreset,
  };
};
