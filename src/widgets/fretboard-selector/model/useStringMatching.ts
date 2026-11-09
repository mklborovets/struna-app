import { useMemo } from 'react';
import { calculateCentsDeviation } from '@/entities/pitch';
import {
  GuitarString,
  GuitarStringNumber,
  TuningPreset,
} from '@/entities/tuning-preset';
import { IN_TUNE_THRESHOLD_CENTS } from '@/shared/config/constants';

export interface MatchedGuitarStringState {
  readonly matchedString: GuitarString | null;
  readonly centsFromMatchedString: number;
  readonly isMatchedStringInTune: boolean;
}

export interface UseStringMatchingParams {
  readonly activePreset: TuningPreset;
  readonly currentFrequencyHz: number;
  readonly isSignalLocked: boolean;
  readonly lockedStringNumber: GuitarStringNumber | null;
}

export const useStringMatching = ({
  activePreset,
  currentFrequencyHz,
  isSignalLocked,
  lockedStringNumber,
}: UseStringMatchingParams): MatchedGuitarStringState => {
  return useMemo<MatchedGuitarStringState>(() => {
    if (activePreset.isChromatic || activePreset.strings.length === 0) {
      return {
        matchedString: null,
        centsFromMatchedString: 0,
        isMatchedStringInTune: false,
      };
    }

    if (lockedStringNumber !== null) {
      const lockedTarget =
        activePreset.strings.find(
          (item) => item.stringNumber === lockedStringNumber
        ) ?? null;

      if (!lockedTarget || !isSignalLocked || currentFrequencyHz <= 0) {
        return {
          matchedString: lockedTarget,
          centsFromMatchedString: 0,
          isMatchedStringInTune: false,
        };
      }

      const cents = calculateCentsDeviation(
        currentFrequencyHz,
        lockedTarget.frequencyHz
      );
      return {
        matchedString: lockedTarget,
        centsFromMatchedString: cents,
        isMatchedStringInTune: Math.abs(cents) <= IN_TUNE_THRESHOLD_CENTS,
      };
    }

    if (!isSignalLocked || currentFrequencyHz <= 0) {
      return {
        matchedString: null,
        centsFromMatchedString: 0,
        isMatchedStringInTune: false,
      };
    }

    let closestString: GuitarString | null = null;
    let smallestAbsCents = Number.POSITIVE_INFINITY;
    let signedCents = 0;

    for (const candidate of activePreset.strings) {
      const cents = calculateCentsDeviation(
        currentFrequencyHz,
        candidate.frequencyHz
      );
      const absCents = Math.abs(cents);
      if (absCents < smallestAbsCents) {
        smallestAbsCents = absCents;
        signedCents = cents;
        closestString = candidate;
      }
    }

    if (smallestAbsCents > 150) {
      return {
        matchedString: null,
        centsFromMatchedString: 0,
        isMatchedStringInTune: false,
      };
    }

    return {
      matchedString: closestString,
      centsFromMatchedString: signedCents,
      isMatchedStringInTune: smallestAbsCents <= IN_TUNE_THRESHOLD_CENTS,
    };
  }, [
    activePreset.isChromatic,
    activePreset.strings,
    currentFrequencyHz,
    isSignalLocked,
    lockedStringNumber,
  ]);
};
