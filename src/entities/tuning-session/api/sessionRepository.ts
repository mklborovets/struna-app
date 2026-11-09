import { DEFAULT_REFERENCE_A4_HZ } from '@/shared/config/constants';
import {
  SqlQueryResultRow,
  sqliteClient,
} from '@/shared/api/database/sqliteClient';
import {
  CreateTuningSessionInput,
  PersistedUserPreferences,
  TuningSessionRecord,
} from '../model/types';

const CREATE_SESSIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS tuning_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_id TEXT NOT NULL,
    preset_name TEXT NOT NULL,
    string_label TEXT NOT NULL,
    note_name TEXT NOT NULL,
    target_frequency_hz REAL NOT NULL,
    measured_frequency_hz REAL NOT NULL,
    cents_deviation REAL NOT NULL,
    reference_a4_hz INTEGER NOT NULL,
    created_at_iso TEXT NOT NULL
  );
`;

const CREATE_PREFERENCES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    preset_id TEXT NOT NULL,
    reference_a4_hz INTEGER NOT NULL
  );
`;

const mapRowToSessionRecord = (row: SqlQueryResultRow): TuningSessionRecord => {
  return {
    id: Number(row.id ?? 0),
    presetId: String(row.preset_id ?? 'standard'),
    presetName: String(row.preset_name ?? 'Standard'),
    stringLabel: String(row.string_label ?? '6E'),
    noteName: String(row.note_name ?? 'E2'),
    targetFrequencyHz: Number(row.target_frequency_hz ?? 82.41),
    measuredFrequencyHz: Number(row.measured_frequency_hz ?? 82.41),
    centsDeviation: Number(row.cents_deviation ?? 0),
    referenceA4Hz: Number(row.reference_a4_hz ?? DEFAULT_REFERENCE_A4_HZ),
    createdAtIso: String(row.created_at_iso ?? ''),
  };
};

export const sessionRepository = {
  initializeSchema(): void {
    sqliteClient.executeSql(CREATE_SESSIONS_TABLE_SQL);
    sqliteClient.executeSql(CREATE_PREFERENCES_TABLE_SQL);
  },

  recordTunedString(input: CreateTuningSessionInput): void {
    const nowIso = new Date().toISOString();
    sqliteClient.executeSql(
      `INSERT INTO tuning_sessions (
        preset_id,
        preset_name,
        string_label,
        note_name,
        target_frequency_hz,
        measured_frequency_hz,
        cents_deviation,
        reference_a4_hz,
        created_at_iso
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        input.presetId,
        input.presetName,
        input.stringLabel,
        input.noteName,
        input.targetFrequencyHz,
        input.measuredFrequencyHz,
        input.centsDeviation,
        input.referenceA4Hz,
        nowIso,
      ]
    );
  },

  getRecentSessions(limit: number = 50): readonly TuningSessionRecord[] {
    const result = sqliteClient.executeSql(
      `SELECT
        id,
        preset_id,
        preset_name,
        string_label,
        note_name,
        target_frequency_hz,
        measured_frequency_hz,
        cents_deviation,
        reference_a4_hz,
        created_at_iso
      FROM tuning_sessions
      ORDER BY id DESC
      LIMIT ?;`,
      [limit]
    );
    return result.rows.map(mapRowToSessionRecord);
  },

  clearAllSessions(): void {
    sqliteClient.executeSql('DELETE FROM tuning_sessions;');
  },

  savePreferences(preferences: PersistedUserPreferences): void {
    sqliteClient.executeSql(
      `INSERT OR REPLACE INTO user_preferences (id, preset_id, reference_a4_hz)
       VALUES (1, ?, ?);`,
      [preferences.presetId, preferences.referenceA4Hz]
    );
  },

  loadPreferences(): PersistedUserPreferences | null {
    const result = sqliteClient.executeSql(
      'SELECT preset_id, reference_a4_hz FROM user_preferences WHERE id = 1 LIMIT 1;'
    );
    const firstRow = result.rows[0];
    if (!firstRow) {
      return null;
    }
    return {
      presetId: String(firstRow.preset_id ?? 'standard'),
      referenceA4Hz: Number(
        firstRow.reference_a4_hz ?? DEFAULT_REFERENCE_A4_HZ
      ),
    };
  },
};
