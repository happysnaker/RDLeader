import Database from 'better-sqlite3';

export function createDb(databaseUrl: string) {
  const sqlite = new Database(databaseUrl);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      employee_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      level TEXT NOT NULL,
      employment_status TEXT NOT NULL,
      direction_id TEXT NOT NULL,
      recent_done_summary TEXT NOT NULL,
      next_step_summary TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      runtime_kind TEXT NOT NULL,
      emotion_current TEXT NOT NULL,
      emotion_intensity REAL NOT NULL,
      emotion_summary TEXT NOT NULL,
      reliability_score REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_employee_id TEXT NOT NULL,
      recipient_employee_id TEXT NOT NULL,
      body TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidates (
      candidate_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      interview_notes TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reflections (
      reflection_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      summary TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_records (
      record_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      reflection_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      scope TEXT NOT NULL,
      promoted_at TEXT NOT NULL
    );
  `);
  return sqlite;
}
