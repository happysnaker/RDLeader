import type Database from 'better-sqlite3';

export interface LearningRecordRow {
  recordId: string;
  employeeId: string;
  reflectionId: string;
  title: string;
  summary: string;
  scope: 'personal' | 'direction';
  promotedAt: string;
}

export class LearningRecordRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: {
    employeeId: string;
    reflectionId: string;
    title: string;
    summary: string;
    scope: 'personal' | 'direction';
  }): LearningRecordRow {
    const record: LearningRecordRow = {
      recordId: `learning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      reflectionId: input.reflectionId,
      title: input.title,
      summary: input.summary,
      scope: input.scope,
      promotedAt: new Date().toISOString(),
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO learning_records (
            record_id,
            employee_id,
            reflection_id,
            title,
            summary,
            scope,
            promoted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.recordId,
        record.employeeId,
        record.reflectionId,
        record.title,
        record.summary,
        record.scope,
        record.promotedAt,
      );

    return record;
  }

  listForEmployee(employeeId: string): LearningRecordRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            record_id as recordId,
            employee_id as employeeId,
            reflection_id as reflectionId,
            title,
            summary,
            scope,
            promoted_at as promotedAt
          FROM learning_records
          WHERE employee_id = ?
          ORDER BY promoted_at DESC
        `,
      )
      .all(employeeId) as LearningRecordRow[];
  }
}
