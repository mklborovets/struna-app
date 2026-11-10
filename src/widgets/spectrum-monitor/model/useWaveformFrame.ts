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

  const getPoint = (idx: number): { x: number; y: number } => {
    const sample = samples[idx] ?? 0;
    const x = (idx / Math.max(1, length - 1)) * CANVAS_WIDTH;
    const y =
      HALF_CANVAS_HEIGHT -
      Math.max(-1, Math.min(1, sample)) * (HALF_CANVAS_HEIGHT - 8);
    return { x, y };
  };

  const first = getPoint(0);
  const parts: string[] = [`M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`];

  for (let i = 1; i < length - 1; i += 1) {
    const curr = getPoint(i);
    const next = getPoint(i + 1);
    const midX = (curr.x + next.x) * 0.5;
    const midY = (curr.y + next.y) * 0.5;
    parts.push(
      `Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`
    );
  }

  if (length > 1) {
    const last = getPoint(length - 1);
    parts.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
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
  const smoothedWaveformRef = useRef<Float32Array>(
    new Float32Array(WAVEFORM_SNAPSHOT_SIZE)
  );
  const spectrumBufferRef = useRef<Float32Array>(
    new Float32Array(SPECTRUM_BIN_COUNT)
  );
  const smoothedSpectrumRef = useRef<Float32Array>(
    new Float32Array(SPECTRUM_BIN_COUNT)
  );
  const lastWaveformPathRef = useRef<string>(
    `M 0 ${HALF_CANVAS_HEIGHT} L ${CANVAS_WIDTH} ${HALF_CANVAS_HEIGHT}`
  );
  const lastSpectrumSignatureRef = useRef<string>('');

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
        const smoothedWaveform = smoothedWaveformRef.current;
        nativeStrunaEngine.getWaveformSnapshot(waveformTarget);
        for (let i = 0; i < waveformTarget.length; i += 1) {
          const prev = smoothedWaveform[i] ?? 0;
          const next = waveformTarget[i] ?? 0;
          const blended = prev * 0.38 + next * 0.62;
          smoothedWaveform[i] = Math.abs(blended) < 1.0e-4 ? 0 : blended;
        }
        const nextPath = buildSvgWaveformPath(smoothedWaveform);
        if (lastWaveformPathRef.current !== nextPath) {
          lastWaveformPathRef.current = nextPath;
          setSvgWaveformPath(nextPath);
        }
      } else {
        const spectrumTarget = spectrumBufferRef.current;
        const smoothedSpectrum = smoothedSpectrumRef.current;
        nativeStrunaEngine.getSpectrumSnapshot(spectrumTarget);
        for (let i = 0; i < spectrumTarget.length; i += 1) {
          const prev = smoothedSpectrum[i] ?? 0;
          const next = spectrumTarget[i] ?? 0;
          const alpha = next > prev ? 0.65 : 0.32;
          const blended = prev * (1 - alpha) + next * alpha;
          smoothedSpectrum[i] = blended < 1.0e-4 ? 0 : blended;
        }
        const nextBars = buildSpectrumBarsFromNativeBins(smoothedSpectrum);
        const signature = nextBars.map((b) => b.height).join(',');
        if (lastSpectrumSignatureRef.current !== signature) {
          lastSpectrumSignatureRef.current = signature;
          setSpectrumBars(nextBars);
        }
      }
    }, JSI_POLL_INTERVAL_MS);

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
