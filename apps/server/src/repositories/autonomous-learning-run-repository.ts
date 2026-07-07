import type Database from 'better-sqlite3';
import type { AutonomySettingsRow } from './autonomy-settings-repository';
import type { ReflectionRow } from './reflection-repository';
import type { LearningRecordRow } from './learning-record-repository';
import type { DirectionKnowledgeRecordRow } from './direction-knowledge-repository';

export interface AutonomousLearningRunRow {
  cycleRunId: string;
  employeeId: string;
  trigger: string;
  createdAt: string;
  summary: string;
  reflection: ReflectionRow;
  learningRecord: LearningRecordRow;
  directionKnowledgeRecord: DirectionKnowledgeRecordRow | null;
  autonomySettings: AutonomySettingsRow;
}

export class AutonomousLearningRunRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(run: AutonomousLearningRunRow): AutonomousLearningRunRow {
    this.sqlite
      .prepare(
        `
          INSERT INTO autonomous_learning_runs (
            cycle_run_id,
            employee_id,
            trigger,
            created_at,
            summary,
            reflection,
            learning_record,
            direction_knowledge_record,
            autonomy_settings
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        run.cycleRunId,
        run.employeeId,
        run.trigger,
        run.createdAt,
        run.summary,
        JSON.stringify(run.reflection),
        JSON.stringify(run.learningRecord),
        run.directionKnowledgeRecord ? JSON.stringify(run.directionKnowledgeRecord) : null,
        JSON.stringify(run.autonomySettings),
      );

    return run;
  }

  listForEmployee(employeeId: string): AutonomousLearningRunRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            cycle_run_id as cycleRunId,
            employee_id as employeeId,
            trigger,
            created_at as createdAt,
            summary,
            reflection,
            learning_record as learningRecord,
            direction_knowledge_record as directionKnowledgeRecord,
            autonomy_settings as autonomySettings
          FROM autonomous_learning_runs
          WHERE employee_id = ?
          ORDER BY created_at DESC, cycle_run_id DESC
        `,
      )
      .all(employeeId) as Array<{
      cycleRunId: string;
      employeeId: string;
      trigger: string;
      createdAt: string;
      summary: string;
      reflection: string;
      learningRecord: string;
      directionKnowledgeRecord: string | null;
      autonomySettings: string;
    }>;

    return rows.map((row) => ({
      cycleRunId: row.cycleRunId,
      employeeId: row.employeeId,
      trigger: row.trigger,
      createdAt: row.createdAt,
      summary: row.summary,
      reflection: JSON.parse(row.reflection),
      learningRecord: JSON.parse(row.learningRecord),
      directionKnowledgeRecord: row.directionKnowledgeRecord ? JSON.parse(row.directionKnowledgeRecord) : null,
      autonomySettings: JSON.parse(row.autonomySettings),
    }));
  }
}
