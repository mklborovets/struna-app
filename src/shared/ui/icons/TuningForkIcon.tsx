import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { THEME_COLORS } from '@/shared/config/theme';

export interface VectorIconProps {
  readonly size?: number;
  readonly color?: string;
}

export const TuningForkIcon: React.FC<VectorIconProps> = ({
  size = 20,
  color = THEME_COLORS.textPrimary,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3V10C8 12.2091 9.79086 14 12 14C14.2091 14 16 12.2091 16 10V3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 14V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={21} r={1.5} fill={color} />
    </Svg>
  );
};
