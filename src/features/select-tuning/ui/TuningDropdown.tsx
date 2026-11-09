import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TuningPreset, TuningPresetId } from '@/entities/tuning-preset';
import { THEME_COLORS } from '@/shared/config/theme';

export interface TuningDropdownProps {
  readonly activePreset: TuningPreset;
  readonly availablePresets: readonly TuningPreset[];
  readonly isMenuOpen: boolean;
  readonly onToggleMenu: () => void;
  readonly onSelectPreset: (presetId: TuningPresetId) => void;
}

export const TuningDropdown: React.FC<TuningDropdownProps> = ({
  activePreset,
  availablePresets,
  isMenuOpen,
  onToggleMenu,
  onSelectPreset,
}) => {
  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.triggerButton} onPress={onToggleMenu}>
        <Text style={styles.caption}>TUNING</Text>
        <Text style={styles.selectedValue}>{activePreset.shortLabel}</Text>
      </Pressable>

      {isMenuOpen ? (
        <View style={styles.dropdownPanel}>
          {availablePresets.map((preset) => {
            const isSelected = preset.id === activePreset.id;
            return (
              <Pressable
                key={preset.id}
                style={[
                  styles.optionRow,
                  isSelected ? styles.optionRowSelected : null,
                ]}
                onPress={() => onSelectPreset(preset.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected ? styles.optionTextSelected : null,
                  ]}
                >
                  {preset.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 20,
  },
  triggerButton: {
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 132,
  },
  caption: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME_COLORS.textMuted,
    letterSpacing: 1,
  },
  selectedValue: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME_COLORS.textPrimary,
    marginTop: 2,
  },
  dropdownPanel: {
    position: 'absolute',
    top: 56,
    left: 0,
    minWidth: 240,
    backgroundColor: THEME_COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 8,
  },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: THEME_COLORS.backgroundInteractive,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME_COLORS.textSecondary,
  },
  optionTextSelected: {
    color: THEME_COLORS.accentInTune,
    fontWeight: '700',
  },
});
