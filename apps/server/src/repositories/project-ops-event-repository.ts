import type Database from 'better-sqlite3';

export interface ProjectOpsEventRow {
  eventId: string;
  employeeId: string;
  actionKey: string;
  summary: string;
  nextStepSummary: string | null;
  targetRef: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

export class ProjectOpsEventRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(
    input: {
      employeeId: string;
      actionKey: string;
      summary: string;
      nextStepSummary?: string | null;
      targetRef?: string | null;
      detail?: Record<string, unknown>;
    },
    createdAt: string = new Date().toISOString(),
  ): ProjectOpsEventRow {
    const event: ProjectOpsEventRow = {
      eventId: `project-ops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      actionKey: input.actionKey,
      summary: input.summary,
      nextStepSummary: input.nextStepSummary ?? null,
      targetRef: input.targetRef ?? null,
      detail: input.detail ?? {},
      createdAt,
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO project_ops_events (
            event_id,
            employee_id,
            action_key,
            summary,
            next_step_summary,
            target_ref,
            detail,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        event.eventId,
        event.employeeId,
        event.actionKey,
        event.summary,
        event.nextStepSummary,
        event.targetRef,
        JSON.stringify(event.detail),
        event.createdAt,
      );

    return event;
  }

  listForEmployee(employeeId: string): ProjectOpsEventRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            event_id as eventId,
            employee_id as employeeId,
            action_key as actionKey,
            summary,
            next_step_summary as nextStepSummary,
            target_ref as targetRef,
            detail,
            created_at as createdAt
          FROM project_ops_events
          WHERE employee_id = ?
          ORDER BY created_at DESC, rowid DESC
        `,
      )
      .all(employeeId) as Array<{
      eventId: string;
      employeeId: string;
      actionKey: string;
      summary: string;
      nextStepSummary: string | null;
      targetRef: string | null;
      detail: string;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      ...row,
      detail: JSON.parse(row.detail),
    }));
  }
}
