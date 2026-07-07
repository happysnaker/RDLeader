import type Database from 'better-sqlite3';

export interface EmotionEventRow {
  eventId: string;
  employeeId: string;
  eventType: string;
  intensityDelta: number;
  nextEmotion: string;
  summary: string;
  createdAt: string;
}

export class EmotionEventRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: {
    employeeId: string;
    eventType: string;
    intensityDelta: number;
    nextEmotion: string;
    summary: string;
  }): EmotionEventRow {
    const event: EmotionEventRow = {
      eventId: `emotion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      eventType: input.eventType,
      intensityDelta: input.intensityDelta,
      nextEmotion: input.nextEmotion,
      summary: input.summary,
      createdAt: new Date().toISOString(),
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO emotion_events (
            event_id,
            employee_id,
            event_type,
            intensity_delta,
            next_emotion,
            summary,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        event.eventId,
        event.employeeId,
        event.eventType,
        event.intensityDelta,
        event.nextEmotion,
        event.summary,
        event.createdAt,
      );

    return event;
  }

  listForEmployee(employeeId: string): EmotionEventRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            event_id as eventId,
            employee_id as employeeId,
            event_type as eventType,
            intensity_delta as intensityDelta,
            next_emotion as nextEmotion,
            summary,
            created_at as createdAt
          FROM emotion_events
          WHERE employee_id = ?
          ORDER BY created_at DESC
        `,
      )
      .all(employeeId) as EmotionEventRow[];
  }
}
