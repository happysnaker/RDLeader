import type Database from 'better-sqlite3';

export interface RuntimeResultEventRow {
  eventId: string;
  employeeId: string;
  dispatchId: string | null;
  workItemId: string | null;
  status: 'completed' | 'blocked' | 'failed';
  summary: string;
  nextStepSummary: string | null;
  artifactRefs: string[];
  sourceFilePath: string;
  processedFilePath: string;
  createdAt: string;
}

export class RuntimeResultEventRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: Omit<RuntimeResultEventRow, 'eventId'>): RuntimeResultEventRow {
    const event: RuntimeResultEventRow = {
      eventId: `runtime-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...input,
    };

    this.sqlite.prepare(`
      INSERT INTO runtime_result_events (
        event_id,
        employee_id,
        dispatch_id,
        work_item_id,
        status,
        summary,
        next_step_summary,
        artifact_refs,
        source_file_path,
        processed_file_path,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.eventId,
      event.employeeId,
      event.dispatchId,
      event.workItemId,
      event.status,
      event.summary,
      event.nextStepSummary,
      JSON.stringify(event.artifactRefs),
      event.sourceFilePath,
      event.processedFilePath,
      event.createdAt,
    );

    return event;
  }

  listForEmployee(employeeId: string): RuntimeResultEventRow[] {
    const rows = this.sqlite.prepare(`
      SELECT
        event_id as eventId,
        employee_id as employeeId,
        dispatch_id as dispatchId,
        work_item_id as workItemId,
        status,
        summary,
        next_step_summary as nextStepSummary,
        artifact_refs as artifactRefs,
        source_file_path as sourceFilePath,
        processed_file_path as processedFilePath,
        created_at as createdAt
      FROM runtime_result_events
      WHERE employee_id = ?
      ORDER BY created_at DESC, rowid DESC
    `).all(employeeId) as Array<{
      eventId: string;
      employeeId: string;
      dispatchId: string | null;
      workItemId: string | null;
      status: 'completed' | 'blocked' | 'failed';
      summary: string;
      nextStepSummary: string | null;
      artifactRefs: string;
      sourceFilePath: string;
      processedFilePath: string;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      ...row,
      artifactRefs: JSON.parse(row.artifactRefs),
    }));
  }
}
