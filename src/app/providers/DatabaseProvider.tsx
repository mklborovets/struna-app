import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  TUNING_PRESET_IDS,
  TuningPresetId,
  tuningStore,
} from '@/entities/tuning-preset';
import {
  CreateTuningSessionInput,
  TuningSessionRecord,
  sessionRepository,
} from '@/entities/tuning-session';

export interface DatabaseContextValue {
  readonly isReady: boolean;
  readonly sessions: readonly TuningSessionRecord[];
  readonly logTunedString: (input: CreateTuningSessionInput) => void;
  readonly refreshSessions: () => void;
  readonly clearHistory: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

const isValidPresetId = (value: string): value is TuningPresetId => {
  return (TUNING_PRESET_IDS as readonly string[]).includes(value);
};

export interface DatabaseProviderProps {
  readonly children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
}) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [sessions, setSessions] = useState<readonly TuningSessionRecord[]>([]);

  const refreshSessions = useCallback(() => {
    const latest = sessionRepository.getRecentSessions(100);
    setSessions(latest);
  }, []);

  const logTunedString = useCallback(
    (input: CreateTuningSessionInput) => {
      sessionRepository.recordTunedString(input);
      refreshSessions();
    },
    [refreshSessions]
  );

  const clearHistory = useCallback(() => {
    sessionRepository.clearAllSessions();
    setSessions([]);
  }, []);

  useEffect(() => {
    sessionRepository.initializeSchema();
    const savedPrefs = sessionRepository.loadPreferences();
    if (savedPrefs) {
      if (isValidPresetId(savedPrefs.presetId)) {
        tuningStore.setPresetId(savedPrefs.presetId);
      }
      tuningStore.setReferenceA4Hz(savedPrefs.referenceA4Hz);
    }
    refreshSessions();
    setIsReady(true);

    const unsubscribe = tuningStore.subscribe(() => {
      const snapshot = tuningStore.getSnapshot();
      sessionRepository.savePreferences({
        presetId: snapshot.selectedPresetId,
        referenceA4Hz: snapshot.referenceA4Hz,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [refreshSessions]);

  const contextValue = useMemo<DatabaseContextValue>(
    () => ({
      isReady,
      sessions,
      logTunedString,
      refreshSessions,
      clearHistory,
    }),
    [clearHistory, isReady, logTunedString, refreshSessions, sessions]
  );

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useTuningDatabase = (): DatabaseContextValue => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      'useTuningDatabase must be used within a DatabaseProvider'
    );
  }
  return context;
};
