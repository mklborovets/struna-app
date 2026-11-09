import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { THEME_COLORS } from '@/shared/config/theme';
import { GAUGE_TICK_MARKS } from '../model/useGaugeInterpolation';

export interface CentScaleProps {
  readonly isInTune: boolean;
}

export const CentScale: React.FC<CentScaleProps> = ({ isInTune }) => {
  return (
    <View style={styles.container}>
      <Svg width={280} height={130} viewBox="0 0 280 130">
        <Path
          d="M 30 115 A 110 110 0 0 1 250 115"
          stroke={THEME_COLORS.borderStrong}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M 132 5 A 110 110 0 0 1 148 5"
          stroke={
            isInTune ? THEME_COLORS.accentInTune : THEME_COLORS.textMuted
          }
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />
        <Line
          x1={140}
          y1={2}
          x2={140}
          y2={18}
          stroke={
            isInTune ? THEME_COLORS.accentInTune : THEME_COLORS.textPrimary
          }
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </Svg>

      <View style={styles.labelsRow}>
        {GAUGE_TICK_MARKS.filter((tick) => tick.isMajor).map((tick) => (
          <Text
            key={tick.centsValue}
            style={[
              styles.tickLabel,
              tick.isCenter ? styles.centerTickLabel : null,
              tick.isCenter && isInTune ? styles.centerTickInTune : null,
            ]}
          >
            {tick.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 150,
  },
  labelsRow: {
    position: 'absolute',
    bottom: 0,
    width: 268,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  tickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME_COLORS.textMuted,
  },
  centerTickLabel: {
    fontWeight: '800',
    color: THEME_COLORS.textPrimary,
  },
  centerTickInTune: {
    color: THEME_COLORS.accentInTune,
  },
});
