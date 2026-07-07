import type Database from 'better-sqlite3';

export interface WorkEpisodeRow {
  episodeId: string;
  employeeId: string;
  title: string;
  summary: string;
  status: string;
  blocker: string | null;
  reasoningSummary: string | null;
  artifactRefs: string[];
  createdAt: string;
}

export class WorkEpisodeRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(
    input: {
      employeeId: string;
      title: string;
      summary: string;
      status: string;
      blocker?: string | null;
      reasoningSummary?: string | null;
      artifactRefs?: string[];
    },
    createdAt: string = new Date().toISOString(),
  ): WorkEpisodeRow {
    const episode: WorkEpisodeRow = {
      episodeId: `episode-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      title: input.title,
      summary: input.summary,
      status: input.status,
      blocker: input.blocker?.trim() ? input.blocker : null,
      reasoningSummary: input.reasoningSummary?.trim() ? input.reasoningSummary : null,
      artifactRefs: input.artifactRefs ?? [],
      createdAt,
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO work_episodes (
            episode_id,
            employee_id,
            title,
            summary,
            status,
            blocker,
            reasoning_summary,
            artifact_refs,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        episode.episodeId,
        episode.employeeId,
        episode.title,
        episode.summary,
        episode.status,
        episode.blocker,
        episode.reasoningSummary,
        JSON.stringify(episode.artifactRefs),
        episode.createdAt,
      );

    return episode;
  }

  listForEmployee(employeeId: string): WorkEpisodeRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            episode_id as episodeId,
            employee_id as employeeId,
            title,
            summary,
            status,
            blocker,
            reasoning_summary as reasoningSummary,
            artifact_refs as artifactRefs,
            created_at as createdAt
          FROM work_episodes
          WHERE employee_id = ?
          ORDER BY created_at DESC, rowid DESC
        `,
      )
      .all(employeeId) as Array<{
      episodeId: string;
      employeeId: string;
      title: string;
      summary: string;
      status: string;
      blocker: string | null;
      reasoningSummary: string | null;
      artifactRefs: string;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      ...row,
      artifactRefs: JSON.parse(row.artifactRefs),
    }));
  }
}
