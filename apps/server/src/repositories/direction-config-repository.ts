import type Database from 'better-sqlite3';

export interface DirectionConfigRow {
  directionId: string;
  displayName: string;
  defaultKnowledgeBaseIds: string[];
  defaultRepoIds: string[];
  commonDocumentRefs: string[];
  routingHints: string[];
}

interface DirectionConfigDbRow {
  directionId: string;
  displayName: string;
  defaultKnowledgeBaseIds: string;
  defaultRepoIds: string;
  commonDocumentRefs: string;
  routingHints: string;
}

function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function toRow(row: DirectionConfigDbRow): DirectionConfigRow {
  return {
    directionId: row.directionId,
    displayName: row.displayName,
    defaultKnowledgeBaseIds: parseJsonStringArray(row.defaultKnowledgeBaseIds),
    defaultRepoIds: parseJsonStringArray(row.defaultRepoIds),
    commonDocumentRefs: parseJsonStringArray(row.commonDocumentRefs),
    routingHints: parseJsonStringArray(row.routingHints),
  };
}

function stringifyStringArray(values: string[] | undefined) {
  return JSON.stringify(values ?? []);
}

export class DirectionConfigRepository {
  constructor(private readonly sqlite: Database.Database) {}

  seed(configs: DirectionConfigRow[]) {
    const statement = this.sqlite.prepare(`
      INSERT OR IGNORE INTO direction_configs (
        direction_id,
        display_name,
        default_knowledge_base_ids,
        default_repo_ids,
        common_document_refs,
        routing_hints
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const config of configs) {
      statement.run(
        config.directionId,
        config.displayName,
        stringifyStringArray(config.defaultKnowledgeBaseIds),
        stringifyStringArray(config.defaultRepoIds),
        stringifyStringArray(config.commonDocumentRefs),
        stringifyStringArray(config.routingHints),
      );
    }
  }

  list(): DirectionConfigRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            direction_id as directionId,
            display_name as displayName,
            default_knowledge_base_ids as defaultKnowledgeBaseIds,
            default_repo_ids as defaultRepoIds,
            common_document_refs as commonDocumentRefs,
            routing_hints as routingHints
          FROM direction_configs
          ORDER BY direction_id ASC
        `,
      )
      .all() as DirectionConfigDbRow[];

    return rows.map(toRow);
  }

  get(directionId: string): DirectionConfigRow | undefined {
    const row = this.sqlite
      .prepare(
        `
          SELECT
            direction_id as directionId,
            display_name as displayName,
            default_knowledge_base_ids as defaultKnowledgeBaseIds,
            default_repo_ids as defaultRepoIds,
            common_document_refs as commonDocumentRefs,
            routing_hints as routingHints
          FROM direction_configs
          WHERE direction_id = ?
        `,
      )
      .get(directionId) as DirectionConfigDbRow | undefined;

    return row ? toRow(row) : undefined;
  }

  upsert(input: DirectionConfigRow): DirectionConfigRow {
    this.sqlite
      .prepare(
        `
          INSERT INTO direction_configs (
            direction_id,
            display_name,
            default_knowledge_base_ids,
            default_repo_ids,
            common_document_refs,
            routing_hints
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(direction_id) DO UPDATE SET
            display_name = excluded.display_name,
            default_knowledge_base_ids = excluded.default_knowledge_base_ids,
            default_repo_ids = excluded.default_repo_ids,
            common_document_refs = excluded.common_document_refs,
            routing_hints = excluded.routing_hints
        `,
      )
      .run(
        input.directionId,
        input.displayName,
        stringifyStringArray(input.defaultKnowledgeBaseIds),
        stringifyStringArray(input.defaultRepoIds),
        stringifyStringArray(input.commonDocumentRefs),
        stringifyStringArray(input.routingHints),
      );

    return this.get(input.directionId)!;
  }
}
