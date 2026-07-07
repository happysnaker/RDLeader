import type Database from 'better-sqlite3';

export interface CandidateRow {
  candidateId: string;
  name: string;
  interviewNotes: string;
  status: 'interviewing' | 'offered' | 'rejected' | 'hired';
}

export class CandidateRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: { name: string; interviewNotes: string }): CandidateRow {
    const candidate: CandidateRow = {
      candidateId: `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      interviewNotes: input.interviewNotes,
      status: 'interviewing',
    };

    this.sqlite
      .prepare(
        `INSERT INTO candidates (candidate_id, name, interview_notes, status) VALUES (?, ?, ?, ?)`,
      )
      .run(candidate.candidateId, candidate.name, candidate.interviewNotes, candidate.status);

    return candidate;
  }

  list(): CandidateRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            candidate_id as candidateId,
            name,
            interview_notes as interviewNotes,
            status
          FROM candidates
          ORDER BY candidate_id ASC
        `,
      )
      .all() as CandidateRow[];
  }

  get(candidateId: string): CandidateRow | undefined {
    return this.sqlite
      .prepare(
        `
          SELECT
            candidate_id as candidateId,
            name,
            interview_notes as interviewNotes,
            status
          FROM candidates
          WHERE candidate_id = ?
        `,
      )
      .get(candidateId) as CandidateRow | undefined;
  }

  updateStatus(candidateId: string, status: CandidateRow['status']) {
    this.sqlite.prepare(`UPDATE candidates SET status = ? WHERE candidate_id = ?`).run(status, candidateId);
  }
}
