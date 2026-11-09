import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TuningPreset, TuningPresetId } from '@/entities/tuning-preset';

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
    backgroundColor: '#161B26',
    borderWidth: 1,
    borderColor: '#2A3242',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 132,
  },
  caption: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  selectedValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  dropdownPanel: {
    position: 'absolute',
    top: 56,
    left: 0,
    minWidth: 240,
    backgroundColor: '#12161F',
    borderWidth: 1,
    borderColor: '#2A3242',
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 8,
  },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: '#1E293B',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  optionTextSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
});
