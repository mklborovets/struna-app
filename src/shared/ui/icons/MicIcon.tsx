import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export interface MicIconProps {
  readonly size?: number;
  readonly color?: string;
  readonly muted?: boolean;
}

export const MicIcon: React.FC<MicIconProps> = ({
  size = 18,
  color = '#E6EDF3',
  muted = false,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="9"
        y="2"
        width="6"
        height="12"
        rx="3"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {muted ? (
        <Path
          d="M3 3l18 18"
          stroke="#F85149"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
};

