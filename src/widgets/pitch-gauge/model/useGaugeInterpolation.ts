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

const MAX_NEEDLE_ANGLE_DEGREES = 45;

export interface GaugeTickMark {
  readonly centsValue: number;
  readonly label: string;
  readonly isMajor: boolean;
  readonly isCenter: boolean;
}

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
        damping: 24,
        stiffness: 180,
        mass: 0.6,
      });
    }
    const clampedCents = Math.max(
      -GAUGE_MAX_CENTS_RANGE,
      Math.min(GAUGE_MAX_CENTS_RANGE, centsShared.value)
    );
    const deadzoneCents = Math.abs(clampedCents) < 0.35 ? 0 : clampedCents;
    const targetDegrees =
      (deadzoneCents / GAUGE_MAX_CENTS_RANGE) * MAX_NEEDLE_ANGLE_DEGREES;

    return withSpring(targetDegrees, {
      damping: 22,
      stiffness: 260,
      mass: 0.45,
      overshootClamping: false,
    });
  });

  const needleAnimatedStyle = useAnimatedStyle<ViewStyle>(() => {
    'worklet';
    return {
      transform: [{ rotate: `${smoothedAngleDeg.value}deg` }],
    };
  });

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
