import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface CalibrationStepperProps {
  readonly referenceA4Hz: number;
  readonly canDecrement: boolean;
  readonly canIncrement: boolean;
  readonly onDecrement: () => void;
  readonly onIncrement: () => void;
  readonly onReset: () => void;
}

export const CalibrationStepper: React.FC<CalibrationStepperProps> = ({
  referenceA4Hz,
  canDecrement,
  canIncrement,
  onDecrement,
  onIncrement,
  onReset,
}) => {
  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.stepButton,
          !canDecrement ? styles.stepButtonDisabled : null,
        ]}
        disabled={!canDecrement}
        onPress={onDecrement}
      >
        <View style={styles.minusBar} />
      </Pressable>

      <Pressable style={styles.centerBadge} onPress={onReset}>
        <Text style={styles.label}>A4 REF</Text>
        <Text style={styles.valueText}>{referenceA4Hz} Hz</Text>
      </Pressable>

      <Pressable
        style={[
          styles.stepButton,
          !canIncrement ? styles.stepButtonDisabled : null,
        ]}
        disabled={!canIncrement}
        onPress={onIncrement}
      >
        <View style={styles.plusContainer}>
          <View style={styles.minusBar} />
          <View style={styles.plusVerticalBar} />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B26',
    borderWidth: 1,
    borderColor: '#2A3242',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.35,
  },
  minusBar: {
    width: 12,
    height: 2,
    backgroundColor: '#F8FAFC',
    borderRadius: 1,
  },
  plusContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusVerticalBar: {
    position: 'absolute',
    width: 2,
    height: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 1,
  },
  centerBadge: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
});
