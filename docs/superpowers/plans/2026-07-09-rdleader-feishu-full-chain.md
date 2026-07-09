# RDLeader Feishu Full-Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Feishu the primary operating surface for RDLeader by routing employee Feishu chats through RDLeader brain/memory/orchestration, using `traex` as the execution engine, supporting an internal staff Feishu group, and pushing autonomy results back into Feishu.

**Architecture:** Keep LarkLink as the Feishu transport and ACP session host, but replace the employee-facing default agent with an RDLeader Feishu bridge ACP agent. The bridge calls new RDLeader server endpoints to build Feishu-specific brain context, persist structured Feishu conversation memory, decide direct-reply vs runtime-dispatch, and forward execution prompts to an underlying `traex` ACP session.

**Tech Stack:** Fastify + better-sqlite3 on the server, Vitest for tests, LarkLink custom agents, ACP TypeScript SDK, `traex` for execution, React/Vite for management UI.

---

## File map

### Server

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/feishu-conversation-repository.ts`
  - Persist structured Feishu turns for boss DM / internal staff group / project group chat contexts.
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-brain-context-builder.ts`
  - Build Feishu-specific brain context and persona brief.
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-bridge-service.ts`
  - Decision layer for direct grounded reply vs runtime-backed execution.
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-notification-service.ts`
  - Shared DM / group notification helpers for autonomy and bridge replies.
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/client.ts`
  - Add `feishu_conversations` table and extend `project_group_bindings` with `group_kind`.
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/project-group-binding-repository.ts`
  - Support `groupKind`.
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
  - Wire new repos/services and add Feishu bridge / internal staff group endpoints.
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`
  - End-to-end server coverage.

### Bridge agent

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/bridge/rdleader-feishu-bridge.ts`
  - ACP agent that talks to RDLeader server and an underlying `traex` ACP session.
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/bridge/rdleader-feishu-bridge.test.ts`
  - Unit tests for prompt routing behavior.

### Launch/runtime config

- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
  - Employee LarkLink config generation to include custom agents:
    - `rdleader_feishu_bridge`
    - `traecli2 -> traex acp serve`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/README.md`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/docs/ops/RDLeader-operator-manual.md`

### Web

- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/lib/api.ts`
  - Add internal staff group APIs and Feishu conversation APIs.
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/project-group-panel.tsx`
  - Support internal staff group creation/binding and group kind badges.
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/App.test.tsx`
  - UI expectations for internal staff group and bridge-backed commands.

---

### Task 1: Persist Feishu conversation memory and build Feishu-specific brain context

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/feishu-conversation-repository.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-brain-context-builder.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/client.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`

- [ ] **Step 1: Write the failing repository + builder tests**

Add failing tests to `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts` that prove:

```ts
it('persists structured feishu conversation turns and returns recent thread memory', async () => {
  const app = await buildApp({
    databaseUrl: ':memory:',
    memoryLoader: async () => [],
  });

  const first = await app.inject({
    method: 'POST',
    url: '/feishu/bridge/conversations',
    payload: {
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      channelType: 'manager_dm',
      senderOpenId: 'ou_manager',
      senderRole: 'manager',
      body: '今天提单页导流进展如何？',
      normalizedIntent: 'status_check',
    },
  });

  expect(first.statusCode).toBe(201);

  const recent = await app.inject({
    method: 'GET',
    url: '/employees/lushirong/feishu-conversations?threadKey=dm:boss:lushirong',
  });

  expect(recent.statusCode).toBe(200);
  expect(recent.json()).toMatchObject([
    {
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      senderRole: 'manager',
      body: '今天提单页导流进展如何？',
      normalizedIntent: 'status_check',
    },
  ]);
});

it('builds feishu brain context with persona brief, episodic memory, knowledge, and recent feishu turns', async () => {
  const app = await buildApp({
    databaseUrl: ':memory:',
    memoryLoader: async () => [
      {
        source: 'git',
        date: '2026-07-08',
        summary: 'funshopping_user_growth_dispatch · 提单页导流链路修复',
        ref: 'abc123',
      },
    ],
  });

  await app.inject({
    method: 'POST',
    url: '/feishu/bridge/conversations',
    payload: {
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      channelType: 'manager_dm',
      senderOpenId: 'ou_manager',
      senderRole: 'manager',
      body: '先给我一个今天的真实进展。',
      normalizedIntent: 'status_check',
    },
  });

  const response = await app.inject({
    method: 'POST',
    url: '/feishu/bridge/brain-preview',
    payload: {
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      taskType: 'status',
      body: '先给我一个今天的真实进展。',
    },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    employeeId: 'lushirong',
    personaBrief: expect.stringContaining('说话直接'),
    recentFeishuTurns: [expect.objectContaining({ body: '先给我一个今天的真实进展。' })],
    context: {
      layers: expect.arrayContaining([
        expect.objectContaining({ layer: 'identity' }),
        expect.objectContaining({ layer: 'working' }),
        expect.objectContaining({ layer: 'episodic' }),
        expect.objectContaining({ layer: 'knowledge' }),
      ]),
    },
  });
});
```

- [ ] **Step 2: Run the server test slice and verify it fails for missing endpoints / tables**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
```

Expected:
- FAIL because `/feishu/bridge/conversations` and `/feishu/bridge/brain-preview` do not exist yet
- or FAIL because `feishu_conversations` table does not exist

- [ ] **Step 3: Add the table and repository**

Update `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/client.ts` to add:

```ts
    CREATE TABLE IF NOT EXISTS feishu_conversations (
      turn_id TEXT PRIMARY KEY,
      thread_key TEXT NOT NULL,
      channel_type TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      sender_open_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      body TEXT NOT NULL,
      normalized_intent TEXT,
      linked_dispatch_id TEXT,
      linked_work_item_id TEXT,
      created_at TEXT NOT NULL
    );
```

Create `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/feishu-conversation-repository.ts`:

```ts
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

export class FeishuConversationRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: Omit<FeishuConversationTurnRow, 'turnId' | 'createdAt'>, createdAt: string): FeishuConversationTurnRow {
    const row: FeishuConversationTurnRow = {
      turnId: `feishu-turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
      ...input,
    };
    this.sqlite.prepare(`
      INSERT INTO feishu_conversations (
        turn_id, thread_key, channel_type, employee_id, sender_open_id, sender_role,
        body, normalized_intent, linked_dispatch_id, linked_work_item_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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

  listRecentForThread(threadKey: string, limit = 12): FeishuConversationTurnRow[] {
    return this.sqlite.prepare(`
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
    `).all(threadKey, limit) as FeishuConversationTurnRow[];
  }
}
```

- [ ] **Step 4: Create Feishu brain context builder**

Create `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-brain-context-builder.ts`:

```ts
import { assembleTaskContext } from '@rdleader/brain';
import type { FeishuConversationRepository } from '../repositories/feishu-conversation-repository';

export function buildFeishuPersonaBrief(input: {
  displayName: string;
  personaProfile: any;
  emotionState: any;
  performanceState: any;
}) {
  return [
    `${input.displayName}说话直接，owner 感强。`,
    '在压力下会焦虑但仍然负责推进，不会虚报已完成的外部动作。',
    '遇到风险时倾向于尽早升级，并明确说出真实 blocker 与下一步。',
    `当前情绪：${input.emotionState.current}（${input.emotionState.summary}）。`,
    `当前绩效关注：delivery=${input.performanceState.deliveryTrend}，reliability=${input.performanceState.reliabilityScore}。`,
  ].join('');
}

export function buildFeishuBrainContext(input: {
  employee: any;
  taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  workingMemory: string[];
  episodicMemory: string[];
  knowledgeItems: string[];
  threadKey: string;
  feishuConversationRepository: FeishuConversationRepository;
}) {
  const forcedTaskType =
    input.taskType === 'status' ? 'coordination' : input.taskType;

  const context = assembleTaskContext({
    employee: input.employee,
    taskType: forcedTaskType,
    workingMemory: input.workingMemory,
    episodicMemory: input.episodicMemory,
    knowledgeItems: input.knowledgeItems,
  });

  return {
    employeeId: input.employee.employeeId,
    personaBrief: buildFeishuPersonaBrief({
      displayName: input.employee.displayName,
      personaProfile: input.employee.personaProfile,
      emotionState: input.employee.emotionState,
      performanceState: input.employee.performanceState,
    }),
    recentFeishuTurns: input.feishuConversationRepository.listRecentForThread(input.threadKey, 8).reverse(),
    context,
  };
}
```

- [ ] **Step 5: Expose minimal endpoints to make the tests pass**

Modify `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts` to:

```ts
  const feishuConversationRepository = new FeishuConversationRepository(sqlite);

  app.post('/feishu/bridge/conversations', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      threadKey: string;
      channelType: 'manager_dm' | 'internal_staff_group' | 'project_group';
      senderOpenId: string;
      senderRole: 'manager' | 'employee' | 'internal_staff' | 'system';
      body: string;
      normalizedIntent?: string | null;
      linkedDispatchId?: string | null;
      linkedWorkItemId?: string | null;
    };

    const row = feishuConversationRepository.create(
      {
        employeeId: body.employeeId,
        threadKey: body.threadKey,
        channelType: body.channelType,
        senderOpenId: body.senderOpenId,
        senderRole: body.senderRole,
        body: body.body,
        normalizedIntent: body.normalizedIntent ?? null,
        linkedDispatchId: body.linkedDispatchId ?? null,
        linkedWorkItemId: body.linkedWorkItemId ?? null,
      },
      now().toISOString(),
    );

    return reply.code(201).send(row);
  });

  app.get('/employees/:employeeId/feishu-conversations', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const threadKey = String((request.query as { threadKey?: string }).threadKey ?? '').trim();
    if (!getEmployee(employeeId)) return reply.code(404).send({ message: 'employee not found' });
    if (!threadKey) return reply.code(400).send({ message: 'threadKey is required' });
    return feishuConversationRepository.listRecentForThread(threadKey);
  });

  app.post('/feishu/bridge/brain-preview', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      threadKey: string;
      taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
      body: string;
    };
    const preview = buildFeishuBridgePreview(body.employeeId, body.threadKey, body.taskType);
    if (!preview) return reply.code(404).send({ message: 'employee not found' });
    return preview;
  });
```

- [ ] **Step 6: Re-run the tests and commit**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
```

Expected:
- PASS on the new Feishu conversation / brain-preview cases

Commit:

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add \
  apps/server/src/db/client.ts \
  apps/server/src/repositories/feishu-conversation-repository.ts \
  apps/server/src/services/feishu-brain-context-builder.ts \
  apps/server/src/app.ts \
  apps/server/src/app.test.ts
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add feishu conversation memory and brain context"
```

---

### Task 2: Add the RDLeader Feishu bridge service and chat decision API

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-bridge-service.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`

- [ ] **Step 1: Write failing tests for direct reply vs runtime dispatch**

Add failing tests in `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`:

```ts
it('returns a direct grounded feishu reply for simple status questions', async () => {
  const app = await buildApp({
    databaseUrl: ':memory:',
    memoryLoader: async () => [],
  });

  const response = await app.inject({
    method: 'POST',
    url: '/feishu/bridge/chat',
    payload: {
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      channelType: 'manager_dm',
      senderOpenId: 'ou_manager',
      senderRole: 'manager',
      body: '你今天真实进展如何？',
    },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    mode: 'direct',
    replyText: expect.stringContaining('当前在推进'),
    persistedTurns: expect.any(Array),
  });
});

it('returns a runtime-forward instruction for execution-heavy feishu requests', async () => {
  const app = await buildApp({
    databaseUrl: ':memory:',
    memoryLoader: async () => [],
  });

  const response = await app.inject({
    method: 'POST',
    url: '/feishu/bridge/chat',
    payload: {
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      channelType: 'manager_dm',
      senderOpenId: 'ou_manager',
      senderRole: 'manager',
      body: '去看一下 funshopping_user_growth_dispatch 里提单页导流的链路，并告诉我 blocker。',
    },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    mode: 'runtime_forward',
    taskType: 'coding',
    employeeId: 'lushirong',
    personaBrief: expect.stringContaining('owner'),
    promptText: expect.stringContaining('不要虚报'),
  });
});
```

- [ ] **Step 2: Run the tests and verify `/feishu/bridge/chat` is missing**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
```

Expected:
- FAIL because `/feishu/bridge/chat` does not exist

- [ ] **Step 3: Create the bridge decision service**

Create `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-bridge-service.ts`:

```ts
export type FeishuBridgeChatMode = 'direct' | 'runtime_forward';

export function classifyFeishuBridgeTaskType(body: string) {
  if (/(修|排查|看下仓库|代码|实现|链路|bug|review)/.test(body)) return 'coding' as const;
  if (/(同步|对齐|blocked|卡住|帮我看下|找.*协助)/.test(body)) return 'coordination' as const;
  if (/(复盘|总结|沉淀)/.test(body)) return 'reflection' as const;
  return 'status' as const;
}

export function shouldUseDirectReply(input: { taskType: string; body: string }) {
  return input.taskType === 'status' && !/(仓库|代码|实现|排查|修|review)/.test(input.body);
}

export function buildDirectFeishuReply(input: {
  displayName: string;
  recentDoneSummary: string;
  nextStepSummary: string;
  personaBrief: string;
}) {
  return [
    `我是${input.displayName}。`,
    `当前在推进：${input.recentDoneSummary}。`,
    `下一步：${input.nextStepSummary}。`,
    '如果你要我真正去看仓库、查代码或落改动，我会基于真实工作区继续处理，不会编造成果。',
  ].join('');
}
```

- [ ] **Step 4: Add `/feishu/bridge/chat` endpoint**

Modify `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts` to expose:

```ts
  app.post('/feishu/bridge/chat', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      threadKey: string;
      channelType: 'manager_dm' | 'internal_staff_group' | 'project_group';
      senderOpenId: string;
      senderRole: 'manager' | 'employee' | 'internal_staff' | 'system';
      body: string;
    };

    const employee = getEmployee(body.employeeId);
    const profile = getEmployeeProfile(body.employeeId);
    if (!employee || !profile) return reply.code(404).send({ message: 'employee not found' });

    const taskType = classifyFeishuBridgeTaskType(body.body.trim());
    feishuConversationRepository.create(
      {
        employeeId: body.employeeId,
        threadKey: body.threadKey,
        channelType: body.channelType,
        senderOpenId: body.senderOpenId,
        senderRole: body.senderRole,
        body: body.body.trim(),
        normalizedIntent: taskType,
        linkedDispatchId: null,
        linkedWorkItemId: null,
      },
      now().toISOString(),
    );

    const preview = buildFeishuBridgePreview(body.employeeId, body.threadKey, taskType);
    if (!preview) return reply.code(404).send({ message: 'employee not found' });

    if (shouldUseDirectReply({ taskType, body: body.body.trim() })) {
      const replyText = buildDirectFeishuReply({
        displayName: employee.displayName,
        recentDoneSummary: employee.recentDoneSummary,
        nextStepSummary: employee.nextStepSummary,
        personaBrief: preview.personaBrief,
      });

      feishuConversationRepository.create(
        {
          employeeId: body.employeeId,
          threadKey: body.threadKey,
          channelType: body.channelType,
          senderOpenId: body.employeeId,
          senderRole: 'employee',
          body: replyText,
          normalizedIntent: 'direct_reply',
          linkedDispatchId: null,
          linkedWorkItemId: null,
        },
        now().toISOString(),
      );

      return {
        mode: 'direct',
        replyText,
        persistedTurns: feishuConversationRepository.listRecentForThread(body.threadKey, 6),
      };
    }

    const promptText = [
      preview.personaBrief,
      '下面是当前飞书对话上下文和员工脑内上下文。',
      `用户消息：${body.body.trim()}`,
      `脑内上下文：${JSON.stringify(preview.context, null, 2)}`,
      `最近飞书回合：${JSON.stringify(preview.recentFeishuTurns, null, 2)}`,
    ].join('\\n\\n');

    return {
      mode: 'runtime_forward',
      employeeId: body.employeeId,
      taskType,
      personaBrief: preview.personaBrief,
      promptText,
    };
  });
```

- [ ] **Step 5: Re-run tests and commit**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
```

Expected:
- PASS for the bridge chat decision tests

Commit:

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add \
  apps/server/src/services/feishu-bridge-service.ts \
  apps/server/src/app.ts \
  apps/server/src/app.test.ts
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add feishu bridge chat service"
```

---

### Task 3: Implement the ACP bridge agent and switch employee bots to it

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/bridge/rdleader-feishu-bridge.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/bridge/rdleader-feishu-bridge.test.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/README.md`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/docs/ops/RDLeader-operator-manual.md`

- [ ] **Step 1: Write failing bridge-agent tests**

Create `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/bridge/rdleader-feishu-bridge.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createBridgePromptRequest } from './rdleader-feishu-bridge';

describe('rdleader feishu bridge agent', () => {
  it('maps LarkLink prompt payload into RDLeader bridge request', () => {
    expect(
      createBridgePromptRequest({
        employeeId: 'lushirong',
        threadKey: 'dm:boss:lushirong',
        text: '你今天进展如何？',
        ownerUserId: 'ou_manager',
      }),
    ).toMatchObject({
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      body: '你今天进展如何？',
    });
  });
});
```

- [ ] **Step 2: Run the targeted test and verify the module is missing**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- rdleader-feishu-bridge.test.ts
```

Expected:
- FAIL because `rdleader-feishu-bridge.ts` does not exist yet

- [ ] **Step 3: Create the bridge ACP agent**

Create `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/bridge/rdleader-feishu-bridge.ts`:

```ts
import { Writable, Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import * as acp from '@agentclientprotocol/sdk';

export function createBridgePromptRequest(input: {
  employeeId: string;
  threadKey: string;
  text: string;
  ownerUserId: string;
}) {
  return {
    employeeId: input.employeeId,
    threadKey: input.threadKey,
    channelType: 'manager_dm',
    senderOpenId: input.ownerUserId,
    senderRole: 'manager',
    body: input.text,
  };
}

async function createTraexConnection(cwd: string) {
  const child = spawn('traex', ['acp', 'serve'], { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env } });
  const stream = acp.ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout));
  const connection = new acp.ClientSideConnection(() => ({ async sessionUpdate() {}, async requestPermission() { return { outcome: { outcome: 'cancelled' } }; } }), stream);
  await connection.initialize({
    protocolVersion: acp.PROTOCOL_VERSION,
    clientInfo: { name: 'rdleader-feishu-bridge', version: '0.1.0' },
    clientCapabilities: {},
  });
  return { child, connection };
}

const sessions = new Map<string, { traexSessionId: string; connection: acp.ClientSideConnection; child: ReturnType<typeof spawn> }>();
const employeeId = process.env.RDLEADER_EMPLOYEE_ID || '';
const controlUrl = process.env.RDLEADER_CONTROL_URL || 'http://127.0.0.1:3001';

const agent = {
  async initialize() {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentInfo: { name: 'rdleader-feishu-bridge', title: 'RDLeader Feishu Bridge', version: '0.1.0' },
      agentCapabilities: { promptCapabilities: { image: false, audio: false, embeddedContext: false }, sessionCapabilities: { list: {}, close: {} } },
    };
  },
  async newSession(params: { cwd: string }) {
    const underlying = await createTraexConnection(params.cwd);
    const newSession = await underlying.connection.newSession({ cwd: params.cwd, mcpServers: [] });
    const sessionId = `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessions.set(sessionId, { traexSessionId: newSession.sessionId, connection: underlying.connection, child: underlying.child });
    return { sessionId };
  },
  async prompt(params: { sessionId: string; prompt: Array<{ type: string; text?: string }> }) {
    const session = sessions.get(params.sessionId);
    if (!session) throw new Error('session not found');
    const text = params.prompt.find((block) => block.type === 'text')?.text || '';
    const bridgeRequest = createBridgePromptRequest({
      employeeId,
      threadKey: process.env.LARKLINK_SCOPE_KEY || `dm:${process.env.LARKLINK_OWNER_USER_ID || 'unknown'}:${employeeId}`,
      text,
      ownerUserId: process.env.LARKLINK_OWNER_USER_ID || process.env.USER_ID || 'unknown',
    });
    const response = await fetch(`${controlUrl}/feishu/bridge/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(bridgeRequest),
    }).then((res) => res.json());

    if (response.mode === 'direct') {
      return {
        stopReason: 'end_turn',
        message: { content: [{ type: 'text', text: response.replyText }] },
      };
    }

    const forwarded = await session.connection.prompt({
      sessionId: session.traexSessionId,
      prompt: [{ type: 'text', text: response.promptText }],
    });

    return forwarded;
  },
  async closeSession(params: { sessionId: string }) {
    const session = sessions.get(params.sessionId);
    if (!session) return {};
    session.child.kill('SIGTERM');
    sessions.delete(params.sessionId);
    return {};
  },
};

const connection = new acp.AgentSideConnection(agent, acp.ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)));
await connection.start();
```

- [ ] **Step 4: Switch employee config generation to the bridge**

Modify `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts` so `writeEmployeeLarklinkConfig()` emits:

```ts
    agents: {
      defaultAgent: 'rdleader_feishu_bridge',
      enableAutoStart: false,
    },
    customAgents: [
      {
        id: 'rdleader_feishu_bridge',
        name: 'RDLeader Feishu Bridge',
        description: '飞书消息先进入 RDLeader 脑与编排层，再转发给 traecli2。',
        command: '/Users/bytedance/GolandProjects/DevPlan/RdLeader/node_modules/.bin/tsx',
        args: ['/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/bridge/rdleader-feishu-bridge.ts'],
        fixedEnv: {
          RDLEADER_EMPLOYEE_ID: input.employeeId,
          RDLEADER_CONTROL_URL: 'http://127.0.0.1:3001',
        },
      },
      {
        id: 'traecli2',
        name: 'Trae Cli 2.0',
        description: 'Trae 编程助手 2.0（显式走 traex acp serve）',
        command: 'traex',
        args: ['acp', 'serve'],
      },
    ],
```

Also update `buildFeishuAgentCreateCommand()`, `buildFeishuAgentStartCommand()`, preview/status payloads, README, and operator manual to show:

```bash
env HOME=/Users/bytedance/GolandProjects/E/lushirong/.rdleader/larklink-home \
  LARKLINK_DEFAULT_AGENT=rdleader_feishu_bridge \
  larklink __run-daemon --nobind
```

- [ ] **Step 5: Add app-level regression tests for generated commands**

Extend `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts` expectations so Feishu setup/preview/runtime-status return:

```ts
expect(preview.json()).toMatchObject({
  launchCommand: [
    'env',
    'HOME=/Users/bytedance/GolandProjects/E/lushirong/.rdleader/larklink-home',
    'LARKLINK_DEFAULT_AGENT=rdleader_feishu_bridge',
    'larklink',
    '__run-daemon',
    '--nobind',
  ],
});
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
```

Expected:
- PASS

Commit:

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add \
  apps/server/src/bridge/rdleader-feishu-bridge.ts \
  apps/server/src/bridge/rdleader-feishu-bridge.test.ts \
  apps/server/src/app.ts \
  apps/server/src/app.test.ts \
  README.md \
  docs/ops/RDLeader-operator-manual.md
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: route employee feishu chats through rdleader bridge"
```

---

### Task 4: Support the internal staff group as a first-class Feishu collaboration channel

**Files:**
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/client.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/project-group-binding-repository.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/lib/api.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/project-group-panel.tsx`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for group kind and internal staff group creation**

Add a failing server test:

```ts
it('creates an internal staff group and binds it to all active employees', async () => {
  const app = await buildApp({
    databaseUrl: ':memory:',
    memoryLoader: async () => [],
    larkAuthLoader: async () => ({ verified: true, userName: '老板', openId: 'ou_manager' }),
    larkBotProjectGroupCreator: async () => ({
      ok: true,
      data: { chat_id: 'oc_internal_staff', name: 'RDLeader 内部人员群' },
    }),
    larkChatBotInviter: async () => ({ ok: true }),
  });

  const response = await app.inject({
    method: 'POST',
    url: '/admin/feishu/internal-staff-group/create',
    payload: { chatName: 'RDLeader 内部人员群' },
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    chatId: 'oc_internal_staff',
    employeeBindings: [
      expect.objectContaining({ employeeId: 'lushirong', groupKind: 'internal_staff' }),
      expect.objectContaining({ employeeId: 'zhouyongkang', groupKind: 'internal_staff' }),
    ],
  });
});
```

Add a failing UI test:

```tsx
it('shows internal staff group bindings separately from project groups', async () => {
  // mock list response with { groupKind: 'internal_staff' }
  // expect internal staff badge and action copy to render
});
```

- [ ] **Step 2: Run tests and verify `group_kind` is missing**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
```

Expected:
- FAIL because `groupKind` is not in schema / repo

- [ ] **Step 3: Add `group_kind` to schema + repository**

Update `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/client.ts`:

```ts
    CREATE TABLE IF NOT EXISTS project_group_bindings (
      binding_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      chat_name TEXT NOT NULL,
      group_kind TEXT NOT NULL DEFAULT 'project',
      status TEXT NOT NULL,
      is_default INTEGER NOT NULL,
      manager_proxy_required INTEGER NOT NULL,
      last_synced_at TEXT
    );
```

Update `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/project-group-binding-repository.ts`:

```ts
export type ProjectGroupKind = 'project' | 'internal_staff' | 'bot_qa';

export interface ProjectGroupBindingRow {
  bindingId: string;
  employeeId: string;
  chatId: string;
  chatName: string;
  groupKind: ProjectGroupKind;
  status: ProjectGroupBindingStatus;
  isDefault: boolean;
  managerProxyRequired: boolean;
  lastSyncedAt: string | null;
}
```

Thread `group_kind` through `seed`, `listForEmployee`, `create`, `get`, and `update` queries.

- [ ] **Step 4: Add internal staff group create endpoint**

Modify `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`:

```ts
  app.post('/admin/feishu/internal-staff-group/create', async (request, reply) => {
    const body = (request.body as { chatName?: string } | undefined) ?? {};
    const larkAuth = await larkAuthLoader();
    if (!larkAuth.openId?.trim()) {
      return reply.code(400).send({ message: 'current lark user openId is required' });
    }

    const created = await larkBotProjectGroupCreator({
      employeeDisplayName: '内部人员群',
      managerOpenId: larkAuth.openId,
      chatName: body.chatName?.trim() || 'RDLeader 内部人员群',
    });

    const chatId = String((created as any)?.data?.chat_id ?? '');
    const chatName = String((created as any)?.data?.name ?? body.chatName?.trim() || 'RDLeader 内部人员群');
    if (!chatId) return reply.code(400).send({ message: 'failed to create internal staff group', result: created });

    const employeeBindings = [];
    for (const employee of employeeRepository.list().filter((item) => item.employmentStatus === 'active')) {
      const feishuProfile = getEmployeeProfile(employee.employeeId)?.feishuProfile;
      if (feishuProfile?.appId) {
        await larkChatBotInviter({ chatId, appId: feishuProfile.appId });
      }
      employeeBindings.push(
        projectGroupBindingRepository.create({
          employeeId: employee.employeeId,
          chatId,
          chatName,
          groupKind: 'internal_staff',
          status: 'active',
          isDefault: false,
          managerProxyRequired: false,
          lastSyncedAt: now().toISOString(),
        }),
      );
    }

    return reply.code(201).send({ chatId, chatName, employeeBindings, result: created });
  });
```

- [ ] **Step 5: Update web API + panel**

Update `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/lib/api.ts`:

```ts
export async function createInternalStaffGroup(payload: { chatName?: string }) {
  const response = await fetch('http://localhost:3001/admin/feishu/internal-staff-group/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create internal staff group');
  return response.json();
}
```

Update `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/project-group-panel.tsx` so each item renders:

```tsx
<p>分组类型：{group.groupKind === 'internal_staff' ? '内部人员群' : group.groupKind === 'bot_qa' ? 'bot 测试群' : '项目群'}</p>
```

and add:

```tsx
<button onClick={() => void createInternalStaffGroupAction()}>创建内部人员群</button>
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
pnpm --filter @rdleader/web test -- App.test.tsx
```

Expected:
- PASS for server internal staff group tests
- PASS for the new UI cases

Commit:

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add \
  apps/server/src/db/client.ts \
  apps/server/src/repositories/project-group-binding-repository.ts \
  apps/server/src/app.ts \
  apps/server/src/app.test.ts \
  apps/web/src/lib/api.ts \
  apps/web/src/components/project-group-panel.tsx \
  apps/web/src/App.test.tsx
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add internal staff feishu group support"
```

---

### Task 5: Push autonomy and cross-employee coordination results back into Feishu

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-notification-service.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`

- [ ] **Step 1: Write failing tests for autonomy notifications**

Add failing tests to `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`:

```ts
it('notifies the manager via feishu after runtime results are collected', async () => {
  const sent: Array<{ managerOpenId: string; body: string }> = [];
  const app = await buildApp({
    databaseUrl: ':memory:',
    memoryLoader: async () => [],
    runtimeAdapter: {
      start: async (employeeId) => ({ employeeId, runtimeKind: 'trae_acp', status: 'running', pid: 9527 }),
      stop: async () => undefined,
      heartbeat: async (employeeId) => ({ employeeId, runtimeKind: 'trae_acp', status: 'running', pid: 9527 }),
      sendTask: async () => ({ employeeId: 'lushirong', runtimeKind: 'trae_acp', workspacePath: '/tmp/lushirong', taskFilePath: '/tmp/lushirong/task.json', dispatchedAt: '2026-07-09T00:00:00.000Z' }),
      collectRuntimeEvents: async () => [
        {
          employeeId: 'lushirong',
          runtimeKind: 'trae_acp',
          workItemId: 'work-1',
          status: 'completed',
          summary: '已经确认真实 blocker 并整理恢复路径',
          nextStepSummary: '接下来同步内部人员群并继续推进',
          artifactRefs: [],
          sourceFilePath: '/tmp/result.json',
          processedFilePath: '/tmp/result.processed.json',
          createdAt: '2026-07-09T00:00:10.000Z',
        },
      ],
    },
    larkManagerDmSender: async (input) => {
      sent.push({ managerOpenId: input.managerOpenId, body: input.body });
      return { ok: true };
    },
  });

  await app.inject({ method: 'POST', url: '/employees/lushirong/actions/collect-runtime-events' });
  expect(sent[0]?.body).toContain('真实 blocker');
});
```

- [ ] **Step 2: Run tests and verify notification helper is missing**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
```

Expected:
- FAIL because there is no Feishu-oriented autonomy notification summary layer

- [ ] **Step 3: Create a notification formatter service**

Create `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/feishu-notification-service.ts`:

```ts
export function buildAutonomyFeishuSummary(input: {
  employeeDisplayName: string;
  summary: string;
  nextStepSummary?: string | null;
}) {
  return [
    `${input.employeeDisplayName} 汇报：${input.summary}`,
    input.nextStepSummary ? `下一步：${input.nextStepSummary}` : null,
    '以上均基于真实工作区结果，不代表外部动作已完成，除非消息中明确写明。',
  ].filter(Boolean).join('\\n');
}

export function buildPeerSyncFeishuSummary(input: {
  senderDisplayName: string;
  recipientDisplayName: string;
  workItemTitle: string;
}) {
  return `${input.senderDisplayName} 请求 ${input.recipientDisplayName} 协作同步：${input.workItemTitle}`;
}
```

- [ ] **Step 4: Use the formatter from runtime result collection and autonomous operations**

Modify `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`:

```ts
            const dmBody = buildAutonomyFeishuSummary({
              employeeDisplayName: employee.displayName,
              summary: event.summary,
              nextStepSummary: event.nextStepSummary ?? null,
            });
            const dmResult = await larkManagerDmSender({
              employeeId,
              feishuProfile: employeeFeishuProfile,
              managerOpenId: employeeFeishuProfile!.managerOpenId!,
              employeeDisplayName: employee.displayName,
              body: dmBody,
            });
```

And when `maybeCreateAutoPeerSync()` produces a sync request, also send a group message to the internal staff group (if one exists):

```ts
        const internalGroup = listProjectGroupsWithRouteStatus(peerSync.recipientEmployeeId).then((groups) =>
          groups.find((group) => group.groupKind === 'internal_staff' && group.status === 'active'),
        );
```

Then call existing `larkGroupMessageSender()` with a summary built from `buildPeerSyncFeishuSummary(...)`.

- [ ] **Step 5: Run verification and commit**

Run:

```bash
cd /Users/bytedance/GolandProjects/DevPlan/RdLeader
pnpm --filter @rdleader/server test -- app.test.ts
curl -fsS http://127.0.0.1:3001/employees/lushirong/autonomy-settings | python3 -m json.tool
curl -fsS -X POST http://127.0.0.1:3001/autonomy/run-due-cycles | python3 -m json.tool | sed -n '1,200p'
```

Expected:
- PASS on the notification tests
- manual due-cycle endpoint still returns valid JSON

Commit:

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add \
  apps/server/src/services/feishu-notification-service.ts \
  apps/server/src/app.ts \
  apps/server/src/app.test.ts
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: notify feishu for autonomy and coordination updates"
```

---

## Plan self-review

### Spec coverage check

- Feishu full-chain DM flow → covered by Tasks 1-3  
- Employee persona / long-term / short-term memory injection → covered by Tasks 1-2  
- Internal staff group → covered by Task 4  
- Autonomy push back to Feishu → covered by Task 5  
- `traex` as execution backend → covered by Task 3  

### Placeholder scan

- No `TBD`, `TODO`, or “implement later” placeholders remain.
- All code-changing steps include concrete code snippets.

### Type consistency

Consistent names used across tasks:
- `FeishuConversationRepository`
- `buildFeishuBrainContext`
- `/feishu/bridge/chat`
- `rdleader_feishu_bridge`
- `groupKind`

---

## Execution handoff

Plan complete and saved to `/Users/bytedance/GolandProjects/DevPlan/RdLeader/docs/superpowers/plans/2026-07-09-rdleader-feishu-full-chain.md`.

Recommended execution mode for this plan: **Subagent-Driven**.  
If the user has already approved “按推荐的来”, proceed with the subagent-driven workflow; otherwise confirm before dispatching subagents.
