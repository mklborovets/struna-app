import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AnimatedStyle } from 'react-native-reanimated';
import { THEME_COLORS } from '@/shared/config/theme';
import { Surface } from '@/shared/ui/Surface';
import {
  GAUGE_HEIGHT,
  GAUGE_WIDTH,
} from '../model/useGaugeInterpolation';
import { CentScale } from './CentScale';
import { GaugeNeedle } from './GaugeNeedle';

export interface PitchGaugeProps {
  readonly needleAnimatedStyle: AnimatedStyle<ViewStyle>;
  readonly needleColor: string;
  readonly statusLabel: string;
  readonly isInTune: boolean;
}

export const PitchGauge: React.FC<PitchGaugeProps> = ({
  needleAnimatedStyle,
  needleColor,
  statusLabel,
  isInTune,
}) => {
  return (
    <Surface style={styles.card}>
      <View style={styles.statusPill}>
        <Text
          style={[
            styles.statusText,
            isInTune ? styles.statusTextInTune : null,
          ]}
        >
          {statusLabel}
        </Text>
      </View>

      <View style={styles.dialStage}>
        <CentScale isInTune={isInTune} />
        <GaugeNeedle
          animatedStyle={needleAnimatedStyle}
          color={needleColor}
        />
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: THEME_COLORS.textSecondary,
  },
  statusTextInTune: {
    color: THEME_COLORS.accentInTune,
  },
  dialStage: {
    position: 'relative',
    width: GAUGE_WIDTH,
    height: GAUGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
