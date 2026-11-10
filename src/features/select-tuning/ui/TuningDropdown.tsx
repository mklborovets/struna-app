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
        <Text style={styles.selectedValue} numberOfLines={1}>
          {activePreset.shortLabel}
        </Text>
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
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '48%',
    position: 'relative',
    zIndex: 50,
  },
  triggerButton: {
    width: '100%',
    height: 46,
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  caption: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME_COLORS.textMuted,
    letterSpacing: 0.8,
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME_COLORS.textPrimary,
    marginTop: 1,
  },
  dropdownPanel: {
    position: 'absolute',
    top: 52,
    left: 0,
    minWidth: 220,
    backgroundColor: THEME_COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 100,
  },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: THEME_COLORS.backgroundInteractive,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME_COLORS.textSecondary,
  },
  optionTextSelected: {
    color: THEME_COLORS.textPrimary,
    fontWeight: '700',
  },
});
