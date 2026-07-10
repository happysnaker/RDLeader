import type Database from 'better-sqlite3';

export type CandidateInterviewMessageRole = 'system' | 'interviewer' | 'candidate';

export interface CandidateInterviewMessageRow {
  messageId: string;
  candidateId: string;
  role: CandidateInterviewMessageRole;
  body: string;
  createdAt: string;
}

export class CandidateInterviewMessageRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(
    input: {
      candidateId: string;
      role: CandidateInterviewMessageRole;
      body: string;
    },
    createdAt: string = new Date().toISOString(),
  ): CandidateInterviewMessageRow {
    const message: CandidateInterviewMessageRow = {
      messageId: `candidate-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      candidateId: input.candidateId,
      role: input.role,
      body: input.body.trim(),
      createdAt,
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO candidate_interview_messages (
            message_id,
            candidate_id,
            role,
            body,
            created_at
          ) VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(message.messageId, message.candidateId, message.role, message.body, message.createdAt);

    return message;
  }

  listForCandidate(candidateId: string): CandidateInterviewMessageRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            message_id as messageId,
            candidate_id as candidateId,
            role,
            body,
            created_at as createdAt
          FROM candidate_interview_messages
          WHERE candidate_id = ?
          ORDER BY created_at ASC, rowid ASC
        `,
      )
      .all(candidateId) as CandidateInterviewMessageRow[];
  }
}
