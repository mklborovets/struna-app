import { useCallback, useEffect, useState } from 'react';
import {
  TuningSessionRecord,
  sessionRepository,
} from '@/entities/tuning-session';

export interface HistoryPageViewModel {
  readonly records: readonly TuningSessionRecord[];
  readonly hasRecords: boolean;
  readonly refreshHistory: () => void;
  readonly clearAllHistory: () => void;
}

export const useHistoryPageModel = (): HistoryPageViewModel => {
  const [records, setRecords] = useState<readonly TuningSessionRecord[]>([]);

  const refreshHistory = useCallback(() => {
    setRecords(sessionRepository.getRecentSessions(100));
  }, []);

  const clearAllHistory = useCallback(() => {
    sessionRepository.clearAllSessions();
    setRecords([]);
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  return {
    records,
    hasRecords: records.length > 0,
    refreshHistory,
    clearAllHistory,
  };
};
