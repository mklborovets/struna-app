import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { THEME_COLORS } from '@/shared/config/theme';
import { VectorIconProps } from './TuningForkIcon';

export const LockIcon: React.FC<VectorIconProps> = ({
  size = 20,
  color = THEME_COLORS.textPrimary,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={11}
        width={14}
        height={10}
        rx={2}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};
