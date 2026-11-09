import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { THEME_COLORS } from '@/shared/config/theme';
import { Surface } from '@/shared/ui/Surface';
import { WaveIcon } from '@/shared/ui/icons/WaveIcon';
import {
  MonitorDisplayMode,
  SpectrumBarPoint,
} from '../model/useWaveformFrame';

export interface SpectrumCanvasProps {
  readonly mode: MonitorDisplayMode;
  readonly svgWaveformPath: string;
  readonly spectrumBars: readonly SpectrumBarPoint[];
  readonly rmsDb: number;
  readonly onToggleMode: () => void;
}

export const SpectrumCanvas: React.FC<SpectrumCanvasProps> = ({
  mode,
  svgWaveformPath,
  spectrumBars,
  rmsDb,
  onToggleMode,
}) => {
  return (
    <Surface style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <WaveIcon size={14} color={THEME_COLORS.accentElectric} />
          <Text style={styles.titleText}>
            {mode === 'waveform' ? 'TIME-DOMAIN WAVEFORM' : 'HARMONIC SPECTRUM'}
          </Text>
        </View>
        <View style={styles.rightControls}>
          <Text style={styles.dbText}>{rmsDb} dB</Text>
          <Pressable style={styles.modeButton} onPress={onToggleMode}>
            <Text style={styles.modeButtonText}>
              {mode === 'waveform' ? 'SPECTRUM' : 'WAVE'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.canvasBox}>
        <Svg width={320} height={84} viewBox="0 0 320 84">
          {mode === 'waveform' ? (
            <Path
              d={svgWaveformPath}
              stroke={THEME_COLORS.accentElectric}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            spectrumBars.map((bar) => (
              <Rect
                key={bar.index}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={2}
                fill={THEME_COLORS.accentInTune}
              />
            ))
          )}
        </Svg>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME_COLORS.textMuted,
    letterSpacing: 0.9,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dbText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME_COLORS.textSecondary,
  },
  modeButton: {
    backgroundColor: THEME_COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderStrong,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME_COLORS.textPrimary,
  },
  canvasBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.backgroundPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME_COLORS.borderSubtle,
    overflow: 'hidden',
  },
});
