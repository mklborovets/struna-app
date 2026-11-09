import { useCallback, useEffect, useRef, useState } from 'react';
import { nativeStrunaEngine } from '@/shared/api/jsi';
import {
  JSI_POLL_INTERVAL_MS,
  SPECTRUM_BIN_COUNT,
  WAVEFORM_SNAPSHOT_SIZE,
} from '@/shared/config/constants';

export type MonitorDisplayMode = 'waveform' | 'spectrum';

export interface SpectrumBarPoint {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WaveformMonitorState {
  readonly mode: MonitorDisplayMode;
  readonly svgWaveformPath: string;
  readonly spectrumBars: readonly SpectrumBarPoint[];
  readonly toggleMode: () => void;
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 84;
const HALF_CANVAS_HEIGHT = CANVAS_HEIGHT / 2;

const buildSvgWaveformPath = (samples: Float32Array): string => {
  const length = samples.length;
  if (length === 0) {
    return `M 0 ${HALF_CANVAS_HEIGHT} L ${CANVAS_WIDTH} ${HALF_CANVAS_HEIGHT}`;
  }

  const parts: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const sample = samples[i] ?? 0;
    const x = ((i / (length - 1)) * CANVAS_WIDTH).toFixed(1);
    const y = (
      HALF_CANVAS_HEIGHT -
      Math.max(-1, Math.min(1, sample)) * (HALF_CANVAS_HEIGHT - 8)
    ).toFixed(1);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return parts.join(' ');
};

const computeSpectrumBars = (
  samples: Float32Array
): readonly SpectrumBarPoint[] => {
  const barCount = 32;
  const barSlotWidth = CANVAS_WIDTH / barCount;
  const barWidth = Math.max(2, barSlotWidth - 3);
  const N = samples.length;
  const bars: SpectrumBarPoint[] = [];

  for (let b = 0; b < barCount; b += 1) {
    const k = b + 1;
    let realSum = 0;
    let imagSum = 0;
    const angularFreq = (2 * Math.PI * k) / N;

    for (let n = 0; n < N; n += 1) {
      const s = samples[n] ?? 0;
      const angle = angularFreq * n;
      realSum += s * Math.cos(angle);
      imagSum -= s * Math.sin(angle);
    }

    const magnitude =
      Math.sqrt(realSum * realSum + imagSum * imagSum) / (N * 0.25);
    const normalized = Math.max(0.04, Math.min(1, magnitude));
    const barHeight = Math.round(normalized * (CANVAS_HEIGHT - 12));

    bars.push({
      index: b,
      x: Math.round(b * barSlotWidth + 1.5),
      y: CANVAS_HEIGHT - barHeight - 4,
      width: Math.round(barWidth),
      height: barHeight,
    });
  }

  return bars;
};

export const useWaveformFrame = (
  enabled: boolean = true
): WaveformMonitorState => {
  const [mode, setMode] = useState<MonitorDisplayMode>('waveform');
  const [svgWaveformPath, setSvgWaveformPath] = useState<string>(
    `M 0 ${HALF_CANVAS_HEIGHT} L ${CANVAS_WIDTH} ${HALF_CANVAS_HEIGHT}`
  );
  const [spectrumBars, setSpectrumBars] = useState<readonly SpectrumBarPoint[]>(
    () => computeSpectrumBars(new Float32Array(SPECTRUM_BIN_COUNT))
  );

  const bufferRef = useRef<Float32Array>(
    new Float32Array(WAVEFORM_SNAPSHOT_SIZE)
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'waveform' ? 'spectrum' : 'waveform'));
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = setInterval(() => {
      const target = bufferRef.current;
      nativeStrunaEngine.getWaveformSnapshot(target);
      if (mode === 'waveform') {
        setSvgWaveformPath(buildSvgWaveformPath(target));
      } else {
        setSpectrumBars(computeSpectrumBars(target));
      }
    }, JSI_POLL_INTERVAL_MS * 2);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, mode]);

  return {
    mode,
    svgWaveformPath,
    spectrumBars,
    toggleMode,
  };
};
