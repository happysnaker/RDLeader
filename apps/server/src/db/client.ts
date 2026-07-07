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
      resignation_intent TEXT NOT NULL,
      emotion_current TEXT NOT NULL,
      emotion_intensity REAL NOT NULL,
      emotion_summary TEXT NOT NULL,
      delivery_trend TEXT NOT NULL,
      communication_quality TEXT NOT NULL,
      blocker_handling TEXT NOT NULL,
      review_quality TEXT NOT NULL,
      promotion_readiness TEXT NOT NULL,
      retention_risk TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS emotion_events (
      event_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      intensity_delta REAL NOT NULL,
      next_emotion TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS performance_events (
      event_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      reliability_delta REAL NOT NULL,
      next_delivery_trend TEXT NOT NULL,
      next_promotion_readiness TEXT NOT NULL,
      next_retention_risk TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS direction_knowledge_records (
      record_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      direction_id TEXT NOT NULL,
      learning_record_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      promoted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resignation_events (
      event_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      next_intent TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const employeeColumns = sqlite.prepare(`PRAGMA table_info(employees)`).all() as Array<{ name: string }>;
  const existingEmployeeColumns = new Set(employeeColumns.map((column) => column.name));
  const employeeColumnMigrations: Array<{ name: string; sql: string }> = [
    {
      name: 'resignation_intent',
      sql: `ALTER TABLE employees ADD COLUMN resignation_intent TEXT NOT NULL DEFAULT 'low'`,
    },
    { name: 'delivery_trend', sql: `ALTER TABLE employees ADD COLUMN delivery_trend TEXT NOT NULL DEFAULT 'up'` },
    {
      name: 'communication_quality',
      sql: `ALTER TABLE employees ADD COLUMN communication_quality TEXT NOT NULL DEFAULT 'good'`,
    },
    {
      name: 'blocker_handling',
      sql: `ALTER TABLE employees ADD COLUMN blocker_handling TEXT NOT NULL DEFAULT 'good'`,
    },
    { name: 'review_quality', sql: `ALTER TABLE employees ADD COLUMN review_quality TEXT NOT NULL DEFAULT 'good'` },
    {
      name: 'promotion_readiness',
      sql: `ALTER TABLE employees ADD COLUMN promotion_readiness TEXT NOT NULL DEFAULT 'watch'`,
    },
    { name: 'retention_risk', sql: `ALTER TABLE employees ADD COLUMN retention_risk TEXT NOT NULL DEFAULT 'low'` },
  ];

  for (const migration of employeeColumnMigrations) {
    if (!existingEmployeeColumns.has(migration.name)) {
      sqlite.exec(migration.sql);
    }
  }

  return sqlite;
}
