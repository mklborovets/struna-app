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
const DISPLAY_BAR_COUNT = 32;

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

const buildSpectrumBarsFromNativeBins = (
  magnitudes: Float32Array
): readonly SpectrumBarPoint[] => {
  const barSlotWidth = CANVAS_WIDTH / DISPLAY_BAR_COUNT;
  const barWidth = Math.max(2, barSlotWidth - 3);
  const binsPerBar = Math.max(
    1,
    Math.floor(magnitudes.length / DISPLAY_BAR_COUNT)
  );
  const bars: SpectrumBarPoint[] = [];

  for (let b = 0; b < DISPLAY_BAR_COUNT; b += 1) {
    let peakMagnitude = 0;
    const startBin = b * binsPerBar;
    const endBin = Math.min(magnitudes.length, startBin + binsPerBar);
    for (let k = startBin; k < endBin; k += 1) {
      const val = magnitudes[k] ?? 0;
      if (val > peakMagnitude) {
        peakMagnitude = val;
      }
    }

    const normalized = Math.max(0.04, Math.min(1, peakMagnitude));
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
    () => buildSpectrumBarsFromNativeBins(new Float32Array(SPECTRUM_BIN_COUNT))
  );

  const waveformBufferRef = useRef<Float32Array>(
    new Float32Array(WAVEFORM_SNAPSHOT_SIZE)
  );
  const spectrumBufferRef = useRef<Float32Array>(
    new Float32Array(SPECTRUM_BIN_COUNT)
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'waveform' ? 'spectrum' : 'waveform'));
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = setInterval(() => {
      if (mode === 'waveform') {
        const waveformTarget = waveformBufferRef.current;
        nativeStrunaEngine.getWaveformSnapshot(waveformTarget);
        setSvgWaveformPath(buildSvgWaveformPath(waveformTarget));
      } else {
        const spectrumTarget = spectrumBufferRef.current;
        nativeStrunaEngine.getSpectrumSnapshot(spectrumTarget);
        setSpectrumBars(buildSpectrumBarsFromNativeBins(spectrumTarget));
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
