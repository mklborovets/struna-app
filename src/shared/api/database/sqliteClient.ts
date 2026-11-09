import { open, QuickSQLiteConnection } from 'react-native-quick-sqlite';

export interface SqlQueryResultRow {
  readonly [column: string]: string | number | null;
}

export interface SqlExecutionResult {
  readonly rows: readonly SqlQueryResultRow[];
  readonly rowsAffected: number;
}

export interface SqliteDatabaseClient {
  readonly executeSql: (
    sql: string,
    params?: readonly (string | number | null)[]
  ) => SqlExecutionResult;
}

const DATABASE_FILE_NAME = 'struna_tuning_history.db';

class NativeOrFallbackSqliteClient implements SqliteDatabaseClient {
  private connection: QuickSQLiteConnection | null = null;
  private initializedNative = false;
  private readonly fallbackSessions: SqlQueryResultRow[] = [];
  private fallbackPreferences: SqlQueryResultRow = {
    id: 1,
    preset_id: 'standard',
    reference_a4_hz: 440,
  };
  private nextFallbackId = 1;

  private ensureConnection(): QuickSQLiteConnection | null {
    if (this.initializedNative) {
      return this.connection;
    }
    this.initializedNative = true;
    try {
      this.connection = open({
        name: DATABASE_FILE_NAME,
        location: 'default',
      });
    } catch {
      this.connection = null;
    }
    return this.connection;
  }

  executeSql = (
    sql: string,
    params: readonly (string | number | null)[] = []
  ): SqlExecutionResult => {
    const conn = this.ensureConnection();
    if (conn) {
      try {
        const result = conn.execute(sql, [...params]);
        const rawArray = result.rows?._array ?? [];
        return {
          rows: rawArray as SqlQueryResultRow[],
          rowsAffected: result.rowsAffected ?? 0,
        };
      } catch {
        return { rows: [], rowsAffected: 0 };
      }
    }

    return this.executeInMemoryFallback(sql, params);
  };

  private executeInMemoryFallback(
    sql: string,
    params: readonly (string | number | null)[]
  ): SqlExecutionResult {
    const normalized = sql.trim().toUpperCase();

    if (normalized.startsWith('INSERT INTO TUNING_SESSIONS')) {
      const record: SqlQueryResultRow = {
        id: this.nextFallbackId++,
        preset_id: params[0] ?? 'standard',
        preset_name: params[1] ?? 'Standard',
        string_label: params[2] ?? '6E',
        note_name: params[3] ?? 'E2',
        target_frequency_hz: params[4] ?? 82.41,
        measured_frequency_hz: params[5] ?? 82.41,
        cents_deviation: params[6] ?? 0,
        reference_a4_hz: params[7] ?? 440,
        created_at_iso: params[8] ?? new Date().toISOString(),
      };
      this.fallbackSessions.unshift(record);
      return { rows: [], rowsAffected: 1 };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('TUNING_SESSIONS')) {
      const limitParam = typeof params[0] === 'number' ? params[0] : 50;
      return {
        rows: this.fallbackSessions.slice(0, limitParam),
        rowsAffected: 0,
      };
    }

    if (normalized.startsWith('DELETE FROM TUNING_SESSIONS')) {
      const removed = this.fallbackSessions.length;
      this.fallbackSessions.length = 0;
      return { rows: [], rowsAffected: removed };
    }

    if (
      normalized.startsWith('INSERT OR REPLACE INTO USER_PREFERENCES') ||
      normalized.startsWith('REPLACE INTO USER_PREFERENCES')
    ) {
      this.fallbackPreferences = {
        id: 1,
        preset_id: params[0] ?? 'standard',
        reference_a4_hz: params[1] ?? 440,
      };
      return { rows: [], rowsAffected: 1 };
    }

    if (
      normalized.startsWith('SELECT') &&
      normalized.includes('USER_PREFERENCES')
    ) {
      return {
        rows: [this.fallbackPreferences],
        rowsAffected: 0,
      };
    }

    return { rows: [], rowsAffected: 0 };
  }
}

export const sqliteClient: SqliteDatabaseClient =
  new NativeOrFallbackSqliteClient();
