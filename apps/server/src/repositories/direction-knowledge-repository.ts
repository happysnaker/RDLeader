import type Database from 'better-sqlite3';

export interface DirectionKnowledgeRecordRow {
  recordId: string;
  employeeId: string;
  directionId: string;
  learningRecordId: string;
  title: string;
  summary: string;
  promotedAt: string;
}

export class DirectionKnowledgeRepository {
  constructor(private readonly sqlite: Database.Database) {}

  seed(records: DirectionKnowledgeRecordRow[]) {
    const statement = this.sqlite.prepare(`
      INSERT OR IGNORE INTO direction_knowledge_records (
        record_id,
        employee_id,
        direction_id,
        learning_record_id,
        title,
        summary,
        promoted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const record of records) {
      statement.run(
        record.recordId,
        record.employeeId,
        record.directionId,
        record.learningRecordId,
        record.title,
        record.summary,
        record.promotedAt,
      );
    }
  }

  create(input: {
    employeeId: string;
    directionId: string;
    learningRecordId: string;
    title: string;
    summary: string;
  }): DirectionKnowledgeRecordRow {
    const record: DirectionKnowledgeRecordRow = {
      recordId: `direction-kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      directionId: input.directionId,
      learningRecordId: input.learningRecordId,
      title: input.title,
      summary: input.summary,
      promotedAt: new Date().toISOString(),
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO direction_knowledge_records (
            record_id,
            employee_id,
            direction_id,
            learning_record_id,
            title,
            summary,
            promoted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.recordId,
        record.employeeId,
        record.directionId,
        record.learningRecordId,
        record.title,
        record.summary,
        record.promotedAt,
      );

    return record;
  }

  listForDirection(directionId: string): DirectionKnowledgeRecordRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            record_id as recordId,
            employee_id as employeeId,
            direction_id as directionId,
            learning_record_id as learningRecordId,
            title,
            summary,
            promoted_at as promotedAt
          FROM direction_knowledge_records
          WHERE direction_id = ?
          ORDER BY promoted_at DESC
        `,
      )
      .all(directionId) as DirectionKnowledgeRecordRow[];
  }
}
