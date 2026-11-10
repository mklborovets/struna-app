import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import {
  GAUGE_CENTER_X,
  GAUGE_CENTER_Y,
  GAUGE_NEEDLE_HEIGHT,
} from '../model/useGaugeInterpolation';

const NEEDLE_WIDTH = 24;
const NEEDLE_PIVOT_X = NEEDLE_WIDTH / 2;
const NEEDLE_PIVOT_Y = GAUGE_NEEDLE_HEIGHT / 2;
const NEEDLE_TIP_Y = NEEDLE_PIVOT_Y - 88;

export interface GaugeNeedleProps {
  readonly animatedStyle: AnimatedStyle<ViewStyle>;
  readonly color: string;
}

export const GaugeNeedle: React.FC<GaugeNeedleProps> = ({
  animatedStyle,
  color,
}) => {
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.needleArm, animatedStyle]}
    >
      <Svg
        width={NEEDLE_WIDTH}
        height={GAUGE_NEEDLE_HEIGHT}
        viewBox={`0 0 ${NEEDLE_WIDTH} ${GAUGE_NEEDLE_HEIGHT}`}
      >
        <Line
          x1={NEEDLE_PIVOT_X}
          y1={NEEDLE_TIP_Y}
          x2={NEEDLE_PIVOT_X}
          y2={NEEDLE_PIVOT_Y}
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <Circle
          cx={NEEDLE_PIVOT_X}
          cy={NEEDLE_PIVOT_Y}
          r={6}
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  needleArm: {
    position: 'absolute',
    left: GAUGE_CENTER_X - NEEDLE_PIVOT_X,
    top: GAUGE_CENTER_Y - NEEDLE_PIVOT_Y,
    width: NEEDLE_WIDTH,
    height: GAUGE_NEEDLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
