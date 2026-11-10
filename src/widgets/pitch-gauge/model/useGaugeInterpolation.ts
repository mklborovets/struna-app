import { ViewStyle } from 'react-native';
import {
  AnimatedStyle,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { TuningStatus } from '@/entities/pitch';
import {
  CLOSE_TUNE_THRESHOLD_CENTS,
  GAUGE_MAX_CENTS_RANGE,
  IN_TUNE_THRESHOLD_CENTS,
} from '@/shared/config/constants';
import { THEME_COLORS } from '@/shared/config/theme';

export const GAUGE_WIDTH = 300;
export const GAUGE_HEIGHT = 152;
export const GAUGE_CENTER_X = 150;
export const GAUGE_CENTER_Y = 124;
export const GAUGE_RADIUS = 92;
export const GAUGE_MAX_ANGLE_DEGREES = 75;
export const GAUGE_NEEDLE_HEIGHT = 200;

export interface GaugeTickMark {
  readonly centsValue: number;
  readonly label: string;
  readonly isMajor: boolean;
  readonly isCenter: boolean;
}

export interface GaugeTickGeometry extends GaugeTickMark {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly labelX: number;
  readonly labelY: number;
}

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angleDegrees: number
): { x: number; y: number } => {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(radians),
    y: cy - radius * Math.cos(radians),
  };
};

const buildSvgArcPath = (
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string => {
  const start = polarToCartesian(cx, cy, radius, startAngleDeg);
  const end = polarToCartesian(cx, cy, radius, endAngleDeg);
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
};

export const GAUGE_FULL_ARC_PATH = buildSvgArcPath(
  GAUGE_CENTER_X,
  GAUGE_CENTER_Y,
  GAUGE_RADIUS,
  -GAUGE_MAX_ANGLE_DEGREES,
  GAUGE_MAX_ANGLE_DEGREES
);

const IN_TUNE_ARC_HALF_ANGLE =
  (IN_TUNE_THRESHOLD_CENTS / GAUGE_MAX_CENTS_RANGE) * GAUGE_MAX_ANGLE_DEGREES;

export const GAUGE_IN_TUNE_ARC_PATH = buildSvgArcPath(
  GAUGE_CENTER_X,
  GAUGE_CENTER_Y,
  GAUGE_RADIUS,
  -IN_TUNE_ARC_HALF_ANGLE,
  IN_TUNE_ARC_HALF_ANGLE
);

export const GAUGE_TICK_MARKS: readonly GaugeTickMark[] = [
  { centsValue: -50, label: '-50', isMajor: true, isCenter: false },
  { centsValue: -40, label: '', isMajor: false, isCenter: false },
  { centsValue: -30, label: '-30', isMajor: true, isCenter: false },
  { centsValue: -20, label: '', isMajor: false, isCenter: false },
  { centsValue: -10, label: '-10', isMajor: true, isCenter: false },
  { centsValue: 0, label: '0', isMajor: true, isCenter: true },
  { centsValue: 10, label: '+10', isMajor: true, isCenter: false },
  { centsValue: 20, label: '', isMajor: false, isCenter: false },
  { centsValue: 30, label: '+30', isMajor: true, isCenter: false },
  { centsValue: 40, label: '', isMajor: false, isCenter: false },
  { centsValue: 50, label: '+50', isMajor: true, isCenter: false },
];

export const GAUGE_TICK_GEOMETRIES: readonly GaugeTickGeometry[] =
  GAUGE_TICK_MARKS.map((tick) => {
    const angleDeg =
      (tick.centsValue / GAUGE_MAX_CENTS_RANGE) * GAUGE_MAX_ANGLE_DEGREES;
    const innerRadius = tick.isMajor ? GAUGE_RADIUS - 7 : GAUGE_RADIUS - 4;
    const outerRadius = tick.isMajor ? GAUGE_RADIUS + 5 : GAUGE_RADIUS + 2;
    const labelRadius = GAUGE_RADIUS + 18;

    const p1 = polarToCartesian(
      GAUGE_CENTER_X,
      GAUGE_CENTER_Y,
      innerRadius,
      angleDeg
    );
    const p2 = polarToCartesian(
      GAUGE_CENTER_X,
      GAUGE_CENTER_Y,
      outerRadius,
      angleDeg
    );
    const labelPos = polarToCartesian(
      GAUGE_CENTER_X,
      GAUGE_CENTER_Y,
      labelRadius,
      angleDeg
    );

    return {
      ...tick,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      labelX: labelPos.x,
      labelY: labelPos.y,
    };
  });

export interface UseGaugeInterpolationParams {
  readonly centsShared: SharedValue<number>;
  readonly isLockedShared: SharedValue<boolean>;
  readonly status: TuningStatus;
  readonly cents: number;
}

export interface GaugeInterpolationResult {
  readonly needleAnimatedStyle: AnimatedStyle<ViewStyle>;
  readonly needleColor: string;
  readonly statusLabel: string;
  readonly isInTune: boolean;
}

export const useGaugeInterpolation = ({
  centsShared,
  isLockedShared,
  status,
  cents,
}: UseGaugeInterpolationParams): GaugeInterpolationResult => {
  const smoothedAngleDeg = useDerivedValue<number>(() => {
    'worklet';
    if (!isLockedShared.value) {
      return withSpring(0, {
        damping: 26,
        stiffness: 220,
        mass: 0.5,
        overshootClamping: true,
      });
    }
    const clampedCents = Math.max(
      -GAUGE_MAX_CENTS_RANGE,
      Math.min(GAUGE_MAX_CENTS_RANGE, centsShared.value)
    );
    const deadzoneCents = Math.abs(clampedCents) < 0.35 ? 0 : clampedCents;
    const targetDegrees =
      (deadzoneCents / GAUGE_MAX_CENTS_RANGE) * GAUGE_MAX_ANGLE_DEGREES;

    return withSpring(targetDegrees, {
      damping: 26,
      stiffness: 280,
      mass: 0.4,
      overshootClamping: true,
    });
  }, [centsShared, isLockedShared]);

  const needleAnimatedStyle = useAnimatedStyle<ViewStyle>(() => {
    'worklet';
    return {
      transform: [{ rotate: `${smoothedAngleDeg.value}deg` }],
    };
  }, [smoothedAngleDeg]);

  const absCents = Math.abs(cents);
  const isInTune = status === 'in-tune' && absCents <= IN_TUNE_THRESHOLD_CENTS;

  const needleColor =
    status === 'idle'
      ? THEME_COLORS.textMuted
      : isInTune
        ? THEME_COLORS.accentInTune
        : absCents <= CLOSE_TUNE_THRESHOLD_CENTS
          ? THEME_COLORS.accentWarning
          : THEME_COLORS.accentDanger;

  const statusLabel =
    status === 'idle'
      ? 'LISTENING'
      : isInTune
        ? 'IN TUNE'
        : status === 'flat'
          ? 'TUNE UP'
          : 'TUNE DOWN';

  return {
    needleAnimatedStyle,
    needleColor,
    statusLabel,
    isInTune,
  };
};
