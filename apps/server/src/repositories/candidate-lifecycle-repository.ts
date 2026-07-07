import type Database from 'better-sqlite3';

export type CandidateLifecycleEventType =
  | 'candidate_created'
  | 'interview_recorded'
  | 'decision_updated'
  | 'candidate_hired';

export type CandidateLifecycleStatus = 'interviewing' | 'offered' | 'rejected' | 'hired';

export interface CandidateLifecycleEventRow {
  eventId: string;
  candidateId: string;
  eventType: CandidateLifecycleEventType;
  status: CandidateLifecycleStatus;
  summary: string;
  createdAt: string;
}

export class CandidateLifecycleRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(
    input: {
      candidateId: string;
      eventType: CandidateLifecycleEventType;
      status: CandidateLifecycleStatus;
      summary: string;
    },
    createdAt: string = new Date().toISOString(),
  ): CandidateLifecycleEventRow {
    const event: CandidateLifecycleEventRow = {
      eventId: `candidate-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      candidateId: input.candidateId,
      eventType: input.eventType,
      status: input.status,
      summary: input.summary.trim(),
      createdAt,
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO candidate_lifecycle_events (
            event_id,
            candidate_id,
            event_type,
            status,
            summary,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(event.eventId, event.candidateId, event.eventType, event.status, event.summary, event.createdAt);

    return event;
  }

  listForCandidate(candidateId: string): CandidateLifecycleEventRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            event_id as eventId,
            candidate_id as candidateId,
            event_type as eventType,
            status,
            summary,
            created_at as createdAt
          FROM candidate_lifecycle_events
          WHERE candidate_id = ?
          ORDER BY created_at DESC, rowid DESC
        `,
      )
      .all(candidateId) as CandidateLifecycleEventRow[];
  }
}
