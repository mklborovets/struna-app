import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { THEME_COLORS } from '@/shared/config/theme';
import { VectorIconProps } from './TuningForkIcon';

export const WaveIcon: React.FC<VectorIconProps> = ({
  size = 20,
  color = THEME_COLORS.textPrimary,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12H5L8 4L12 20L16 8L19 12H22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
