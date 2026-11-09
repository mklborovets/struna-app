import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GuitarString,
  GuitarStringNumber,
} from '@/entities/tuning-preset';
import { THEME_COLORS } from '@/shared/config/theme';
import { Surface } from '@/shared/ui/Surface';

export interface FretboardSelectorProps {
  readonly strings: readonly GuitarString[];
  readonly isChromatic: boolean;
  readonly activeStringNumber: GuitarStringNumber | null;
  readonly lockedStringNumber: GuitarStringNumber | null;
  readonly isMatchedStringInTune: boolean;
  readonly onSelectString: (stringNumber: GuitarStringNumber) => void;
}

export const FretboardSelector: React.FC<FretboardSelectorProps> = ({
  strings,
  isChromatic,
  activeStringNumber,
  lockedStringNumber,
  isMatchedStringInTune,
  onSelectString,
}) => {
  if (isChromatic) {
    return (
      <Surface style={styles.chromaticBanner}>
        <Text style={styles.chromaticTitle}>CHROMATIC 12-TONE MODE</Text>
        <Text style={styles.chromaticSubtitle}>
          Automatic detection across all semitones (60 Hz - 1200 Hz)
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <View style={styles.row}>
        {strings.map((guitarString) => {
          const isActive =
            activeStringNumber === guitarString.stringNumber;
          const isLocked =
            lockedStringNumber === guitarString.stringNumber;
          const isTuned = isActive && isMatchedStringInTune;

          return (
            <Pressable
              key={guitarString.stringNumber}
              style={[
                styles.stringButton,
                isActive ? styles.stringButtonActive : null,
                isLocked ? styles.stringButtonLocked : null,
                isTuned ? styles.stringButtonInTune : null,
              ]}
              onPress={() => onSelectString(guitarString.stringNumber)}
            >
              <Text style={styles.stringNumberText}>
                S{guitarString.stringNumber}
              </Text>
              <Text
                style={[
                  styles.noteLabel,
                  isActive ? styles.noteLabelActive : null,
                  isTuned ? styles.noteLabelInTune : null,
                ]}
              >
                {guitarString.noteName}
                {guitarString.octave}
              </Text>
              <Text style={styles.freqLabel}>
                {guitarString.frequencyHz.toFixed(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  stringButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.backgroundElevated,
  },
  stringButtonActive: {
    borderColor: THEME_COLORS.accentElectric,
    backgroundColor: THEME_COLORS.backgroundInteractive,
  },
  stringButtonLocked: {
    borderColor: THEME_COLORS.accentWarning,
  },
  stringButtonInTune: {
    borderColor: THEME_COLORS.accentInTune,
  },
  stringNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME_COLORS.textMuted,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME_COLORS.textPrimary,
    marginVertical: 2,
  },
  noteLabelActive: {
    color: THEME_COLORS.accentElectric,
  },
  noteLabelInTune: {
    color: THEME_COLORS.accentInTune,
  },
  freqLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: THEME_COLORS.textSecondary,
  },
  chromaticBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  chromaticTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME_COLORS.accentElectric,
    letterSpacing: 1,
  },
  chromaticSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.textSecondary,
    marginTop: 4,
  },
});
