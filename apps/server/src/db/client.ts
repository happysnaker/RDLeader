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

    CREATE TABLE IF NOT EXISTS employee_profiles (
      employee_id TEXT PRIMARY KEY,
      manager_id TEXT NOT NULL,
      risk_flags TEXT NOT NULL,
      persona_profile TEXT NOT NULL,
      emotion_triggers TEXT NOT NULL,
      feishu_profile TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_employee_id TEXT NOT NULL,
      recipient_employee_id TEXT NOT NULL,
      body TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manager_conversation_messages (
      message_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      role TEXT NOT NULL,
      body TEXT NOT NULL,
      task_type TEXT NOT NULL,
      reasoning_summary TEXT,
      artifact_refs TEXT NOT NULL,
      approval_required INTEGER NOT NULL,
      approval_summary TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approval_requests (
      request_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      source_message_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      status TEXT NOT NULL,
      approval_summary TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS work_items (
      work_item_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_dispatches (
      dispatch_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      work_item_id TEXT,
      task_title TEXT NOT NULL,
      task_body TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL,
      workspace_task_ref TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_sessions (
      session_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      runtime_kind TEXT NOT NULL,
      status TEXT NOT NULL,
      pid INTEGER,
      started_at TEXT NOT NULL,
      stopped_at TEXT
    );

    CREATE TABLE IF NOT EXISTS runtime_result_events (
      event_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      dispatch_id TEXT,
      work_item_id TEXT,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      next_step_summary TEXT,
      artifact_refs TEXT NOT NULL,
      source_file_path TEXT NOT NULL,
      processed_file_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidates (
      candidate_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      interview_notes TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interviews (
      interview_id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      summary TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      created_at TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS direction_configs (
      direction_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      default_knowledge_base_ids TEXT NOT NULL,
      default_repo_ids TEXT NOT NULL,
      common_document_refs TEXT NOT NULL,
      routing_hints TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_group_bindings (
      binding_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      chat_name TEXT NOT NULL,
      status TEXT NOT NULL,
      is_default INTEGER NOT NULL,
      manager_proxy_required INTEGER NOT NULL,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS resignation_events (
      event_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      next_intent TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manager_proxy_reviews (
      review_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      review_topic TEXT NOT NULL,
      conclusion TEXT NOT NULL,
      next_steps TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS autonomy_settings (
      employee_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      cadence_hours INTEGER NOT NULL,
      auto_promote_to_direction_knowledge INTEGER NOT NULL,
      last_run_at TEXT,
      next_run_at TEXT,
      run_count INTEGER NOT NULL,
      last_outcome TEXT,
      last_summary TEXT
    );

    CREATE TABLE IF NOT EXISTS autonomous_learning_runs (
      cycle_run_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      created_at TEXT NOT NULL,
      summary TEXT NOT NULL,
      reflection TEXT NOT NULL,
      learning_record TEXT NOT NULL,
      direction_knowledge_record TEXT,
      autonomy_settings TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_episodes (
      episode_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      blocker TEXT,
      reasoning_summary TEXT,
      artifact_refs TEXT NOT NULL,
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
