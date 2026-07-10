import type Database from 'better-sqlite3';

export type FeishuConversationChannelType = 'manager_dm' | 'internal_staff_group' | 'project_group';
export type FeishuConversationSenderRole = 'manager' | 'employee' | 'internal_staff' | 'system';

export interface FeishuConversationTurnRow {
  turnId: string;
  threadKey: string;
  channelType: FeishuConversationChannelType;
  employeeId: string;
  senderOpenId: string;
  senderRole: FeishuConversationSenderRole;
  body: string;
  normalizedIntent: string | null;
  linkedDispatchId: string | null;
  linkedWorkItemId: string | null;
  createdAt: string;
}

type FeishuConversationRow = {
  turnId: string;
  threadKey: string;
  channelType: FeishuConversationChannelType;
  employeeId: string;
  senderOpenId: string;
  senderRole: FeishuConversationSenderRole;
  body: string;
  normalizedIntent: string | null;
  linkedDispatchId: string | null;
  linkedWorkItemId: string | null;
  createdAt: string;
};

export class FeishuConversationRepository {
  constructor(private readonly sqlite: Database.Database) {}

  private mapRow(row: FeishuConversationRow | undefined): FeishuConversationTurnRow | undefined {
    if (!row) return undefined;
    return row;
  }

  create(
    input: Omit<FeishuConversationTurnRow, 'turnId' | 'createdAt'>,
    createdAt: string,
  ): FeishuConversationTurnRow {
    const row: FeishuConversationTurnRow = {
      turnId: `feishu-turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
      ...input,
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO feishu_conversations (
            turn_id,
            thread_key,
            channel_type,
            employee_id,
            sender_open_id,
            sender_role,
            body,
            normalized_intent,
            linked_dispatch_id,
            linked_work_item_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        row.turnId,
        row.threadKey,
        row.channelType,
        row.employeeId,
        row.senderOpenId,
        row.senderRole,
        row.body,
        row.normalizedIntent,
        row.linkedDispatchId,
        row.linkedWorkItemId,
        row.createdAt,
      );

    return row;
  }

  listRecentForThread(threadKey: string, limit: number = 12): FeishuConversationTurnRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            turn_id as turnId,
            thread_key as threadKey,
            channel_type as channelType,
            employee_id as employeeId,
            sender_open_id as senderOpenId,
            sender_role as senderRole,
            body,
            normalized_intent as normalizedIntent,
            linked_dispatch_id as linkedDispatchId,
            linked_work_item_id as linkedWorkItemId,
            created_at as createdAt
          FROM feishu_conversations
          WHERE thread_key = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .all(threadKey, limit) as FeishuConversationRow[];

    return rows
      .map((row) => this.mapRow(row))
      .filter((row): row is FeishuConversationTurnRow => Boolean(row));
  }

  listRecentForEmployee(employeeId: string, limit: number = 20): FeishuConversationTurnRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            turn_id as turnId,
            thread_key as threadKey,
            channel_type as channelType,
            employee_id as employeeId,
            sender_open_id as senderOpenId,
            sender_role as senderRole,
            body,
            normalized_intent as normalizedIntent,
            linked_dispatch_id as linkedDispatchId,
            linked_work_item_id as linkedWorkItemId,
            created_at as createdAt
          FROM feishu_conversations
          WHERE employee_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .all(employeeId, limit) as FeishuConversationRow[];

    return rows
      .map((row) => this.mapRow(row))
      .filter((row): row is FeishuConversationTurnRow => Boolean(row));
  }

  latestForDispatch(dispatchId: string): FeishuConversationTurnRow | undefined {
    const row = this.sqlite
      .prepare(
        `
          SELECT
            turn_id as turnId,
            thread_key as threadKey,
            channel_type as channelType,
            employee_id as employeeId,
            sender_open_id as senderOpenId,
            sender_role as senderRole,
            body,
            normalized_intent as normalizedIntent,
            linked_dispatch_id as linkedDispatchId,
            linked_work_item_id as linkedWorkItemId,
            created_at as createdAt
          FROM feishu_conversations
          WHERE linked_dispatch_id = ?
          ORDER BY created_at DESC, rowid DESC
          LIMIT 1
        `,
      )
      .get(dispatchId) as FeishuConversationRow | undefined;

    return this.mapRow(row);
  }
}
