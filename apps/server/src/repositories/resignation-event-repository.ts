import type Database from 'better-sqlite3';

export interface ResignationEventRow {
  eventId: string;
  employeeId: string;
  nextIntent: string;
  summary: string;
  createdAt: string;
}

export class ResignationEventRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: {
    employeeId: string;
    nextIntent: string;
    summary: string;
  }): ResignationEventRow {
    const event: ResignationEventRow = {
      eventId: `resignation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      nextIntent: input.nextIntent,
      summary: input.summary,
      createdAt: new Date().toISOString(),
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO resignation_events (
            event_id,
            employee_id,
            next_intent,
            summary,
            created_at
          ) VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(event.eventId, event.employeeId, event.nextIntent, event.summary, event.createdAt);

    return event;
  }

  listForEmployee(employeeId: string): ResignationEventRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            event_id as eventId,
            employee_id as employeeId,
            next_intent as nextIntent,
            summary,
            created_at as createdAt
          FROM resignation_events
          WHERE employee_id = ?
          ORDER BY created_at DESC
        `,
      )
      .all(employeeId) as ResignationEventRow[];
  }
}
