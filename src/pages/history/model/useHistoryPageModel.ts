import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TuningSessionRecord,
  sessionRepository,
} from '@/entities/tuning-session';
import {
  CLOSE_TUNE_THRESHOLD_CENTS,
  IN_TUNE_THRESHOLD_CENTS,
} from '@/shared/config/constants';
import { THEME_COLORS } from '@/shared/config/theme';

export interface HistoryLogViewItem {
  readonly id: number;
  readonly titleText: string;
  readonly statusLabel: string;
  readonly statusColor: string;
  readonly measuredText: string;
  readonly targetText: string;
  readonly deviationText: string;
  readonly metadataText: string;
}

export interface HistoryPageViewModel {
  readonly items: readonly HistoryLogViewItem[];
  readonly hasRecords: boolean;
  readonly refreshHistory: () => void;
  readonly deleteHistoryRecord: (id: number) => void;
  readonly clearAllHistory: () => void;
}

const formatLogTimestamp = (isoString: string): string => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const resolveDeviationMeta = (
  centsDeviation: number
): { label: string; color: string } => {
  const absCents = Math.abs(centsDeviation);
  if (absCents <= IN_TUNE_THRESHOLD_CENTS) {
    return { label: 'IN TUNE', color: THEME_COLORS.accentInTune };
  }
  const direction = centsDeviation < 0 ? 'FLAT · TUNE UP' : 'SHARP · TUNE DOWN';
  const color =
    absCents <= CLOSE_TUNE_THRESHOLD_CENTS
      ? THEME_COLORS.accentWarning
      : THEME_COLORS.accentDanger;
  return { label: direction, color };
};

const mapRecordToViewItem = (
  record: TuningSessionRecord
): HistoryLogViewItem => {
  const sign = record.centsDeviation > 0 ? '+' : '';
  const statusMeta = resolveDeviationMeta(record.centsDeviation);
  const timeLabel = formatLogTimestamp(record.createdAtIso);
  const titleText =
    record.stringLabel === 'CHM'
      ? `Chromatic · Note ${record.noteName}`
      : `String ${record.stringLabel} · Note ${record.noteName}`;

  return {
    id: record.id,
    titleText,
    statusLabel: statusMeta.label,
    statusColor: statusMeta.color,
    measuredText: `${record.measuredFrequencyHz.toFixed(2)} Hz`,
    targetText: `${record.targetFrequencyHz.toFixed(2)} Hz`,
    deviationText: `${sign}${record.centsDeviation.toFixed(1)} cents`,
    metadataText: `Tuning: ${record.presetName} · Ref A4 = ${record.referenceA4Hz} Hz${timeLabel ? ` · ${timeLabel}` : ''}`,
  };
};

export const useHistoryPageModel = (): HistoryPageViewModel => {
  const [records, setRecords] = useState<readonly TuningSessionRecord[]>([]);

  const refreshHistory = useCallback(() => {
    setRecords(sessionRepository.getRecentSessions(100));
  }, []);

  const deleteHistoryRecord = useCallback((id: number) => {
    sessionRepository.deleteSessionById(id);
  }, []);

  const clearAllHistory = useCallback(() => {
    sessionRepository.clearAllSessions();
  }, []);

  useEffect(() => {
    refreshHistory();
    const unsubscribe = sessionRepository.subscribe(() => {
      refreshHistory();
    });
    return () => {
      unsubscribe();
    };
  }, [refreshHistory]);

  const items = useMemo<readonly HistoryLogViewItem[]>(
    () => records.map(mapRecordToViewItem),
    [records]
  );

  return {
    items,
    hasRecords: items.length > 0,
    refreshHistory,
    deleteHistoryRecord,
    clearAllHistory,
  };
};
