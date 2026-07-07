import type Database from 'better-sqlite3';

export interface InterviewRow {
  interviewId: string;
  candidateId: string;
  stage: string;
  scheduledAt: string;
  summary: string;
  recommendation: 'hire' | 'hold' | 'reject';
  createdAt: string;
}

export class InterviewRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: {
    candidateId: string;
    stage: string;
    scheduledAt: string;
    summary: string;
    recommendation: 'hire' | 'hold' | 'reject';
  }): InterviewRow {
    const interview: InterviewRow = {
      interviewId: `interview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      candidateId: input.candidateId,
      stage: input.stage,
      scheduledAt: input.scheduledAt,
      summary: input.summary,
      recommendation: input.recommendation,
      createdAt: new Date().toISOString(),
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO interviews (
            interview_id,
            candidate_id,
            stage,
            scheduled_at,
            summary,
            recommendation,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        interview.interviewId,
        interview.candidateId,
        interview.stage,
        interview.scheduledAt,
        interview.summary,
        interview.recommendation,
        interview.createdAt,
      );

    return interview;
  }

  listForCandidate(candidateId: string): InterviewRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            interview_id as interviewId,
            candidate_id as candidateId,
            stage,
            scheduled_at as scheduledAt,
            summary,
            recommendation,
            created_at as createdAt
          FROM interviews
          WHERE candidate_id = ?
          ORDER BY scheduled_at DESC, created_at DESC
        `,
      )
      .all(candidateId) as InterviewRow[];
  }
}
