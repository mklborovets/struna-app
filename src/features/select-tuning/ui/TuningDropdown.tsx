import React, { RefObject } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { TuningPreset, TuningPresetId } from '@/entities/tuning-preset';
import { THEME_COLORS } from '@/shared/config/theme';
import { TuningMenuAnchor } from '../model/useTuningSelection';

export interface TuningDropdownProps {
  readonly activePreset: TuningPreset;
  readonly availablePresets: readonly TuningPreset[];
  readonly isMenuOpen: boolean;
  readonly triggerRef: RefObject<View>;
  readonly menuAnchor: TuningMenuAnchor;
  readonly onToggleMenu: () => void;
  readonly onCloseMenu: () => void;
  readonly onSelectPreset: (presetId: TuningPresetId) => void;
}

export const TuningDropdown: React.FC<TuningDropdownProps> = ({
  activePreset,
  availablePresets,
  isMenuOpen,
  triggerRef,
  menuAnchor,
  onToggleMenu,
  onCloseMenu,
  onSelectPreset,
}) => {
  return (
    <View ref={triggerRef} collapsable={false} style={styles.wrapper}>
      <Pressable style={styles.triggerButton} onPress={onToggleMenu}>
        <Text style={styles.caption}>TUNING</Text>
        <Text style={styles.selectedValue} numberOfLines={1}>
          {activePreset.shortLabel}
        </Text>
      </Pressable>

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={onCloseMenu}>
          <Pressable
            style={[
              styles.dropdownPanel,
              {
                top: menuAnchor.top,
                left: menuAnchor.left,
                minWidth: menuAnchor.width,
              },
            ]}
          >
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
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '48%',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  dropdownPanel: {
    position: 'absolute',
    backgroundColor: THEME_COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
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
