import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { THEME_COLORS } from '@/shared/config/theme';
import {
  GAUGE_FULL_ARC_PATH,
  GAUGE_HEIGHT,
  GAUGE_IN_TUNE_ARC_PATH,
  GAUGE_TICK_GEOMETRIES,
  GAUGE_WIDTH,
} from '../model/useGaugeInterpolation';

export interface CentScaleProps {
  readonly isInTune: boolean;
}

export const CentScale: React.FC<CentScaleProps> = ({ isInTune }) => {
  return (
    <View style={styles.container}>
      <Svg
        width={GAUGE_WIDTH}
        height={GAUGE_HEIGHT}
        viewBox={`0 0 ${GAUGE_WIDTH} ${GAUGE_HEIGHT}`}
      >
        <Path
          d={GAUGE_FULL_ARC_PATH}
          stroke={THEME_COLORS.borderStrong}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={GAUGE_IN_TUNE_ARC_PATH}
          stroke={
            isInTune ? THEME_COLORS.accentInTune : THEME_COLORS.textMuted
          }
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />

        {GAUGE_TICK_GEOMETRIES.map((tick) => (
          <React.Fragment key={tick.centsValue}>
            <Line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={
                tick.isCenter
                  ? isInTune
                    ? THEME_COLORS.accentInTune
                    : THEME_COLORS.textPrimary
                  : tick.isMajor
                    ? THEME_COLORS.textSecondary
                    : THEME_COLORS.borderStrong
              }
              strokeWidth={tick.isCenter ? 2.5 : tick.isMajor ? 1.8 : 1.2}
              strokeLinecap="round"
            />
            {tick.label ? (
              <SvgText
                x={tick.labelX}
                y={tick.labelY}
                fill={
                  tick.isCenter
                    ? isInTune
                      ? THEME_COLORS.accentInTune
                      : THEME_COLORS.textPrimary
                    : THEME_COLORS.textMuted
                }
                fontSize={11}
                fontWeight={tick.isCenter ? '800' : '600'}
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {tick.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: GAUGE_WIDTH,
    height: GAUGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
