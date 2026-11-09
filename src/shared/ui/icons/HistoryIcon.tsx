import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { THEME_COLORS } from '@/shared/config/theme';
import { VectorIconProps } from './TuningForkIcon';

export const HistoryIcon: React.FC<VectorIconProps> = ({
  size = 20,
  color = THEME_COLORS.textPrimary,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M12 7V12L15.5 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
