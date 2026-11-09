import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

export interface GaugeNeedleProps {
  readonly animatedStyle: AnimatedStyle<ViewStyle>;
  readonly color: string;
}

export const GaugeNeedle: React.FC<GaugeNeedleProps> = ({
  animatedStyle,
  color,
}) => {
  return (
    <View style={styles.pivotWrapper} pointerEvents="none">
      <Animated.View style={[styles.needleArm, animatedStyle]}>
        <Svg width={24} height={116} viewBox="0 0 24 116">
          <Line
            x1={12}
            y1={8}
            x2={12}
            y2={104}
            stroke={color}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <Circle cx={12} cy={104} r={6} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  pivotWrapper: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleArm: {
    width: 24,
    height: 116,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
