import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('RDLeader server', () => {
  it('returns seeded employees from the overview route', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });
    const response = await app.inject({ method: 'GET', url: '/employees' });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as Array<{ employeeId: string; activeTaskCount: number }>;
    expect(payload.map((employee) => employee.employeeId)).toEqual(['lushirong', 'zhouyongkang']);
    expect(payload.map((employee) => employee.activeTaskCount)).toEqual([2, 2]);
  });

  it('returns employee detail and runtime info', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [
        {
          source: 'git',
          date: '2026-07-06',
          summary: 'funshopping_user_growth_dispatch · 抖极权益替换',
          ref: '9cd1663c4714',
        },
      ],
    });
    const response = await app.inject({ method: 'GET', url: '/employees/lushirong' });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      employeeId: string;
      runtime: { runtimeKind: string };
      memory: Array<{ source: string; summary: string }>;
      latestLearningRecordId?: string;
    };
    expect(payload.employeeId).toBe('lushirong');
    expect(payload.runtime.runtimeKind).toBe('trae_acp');
    expect(payload.memory[0]?.summary).toContain('抖极权益替换');
    expect(payload.latestLearningRecordId).toBeUndefined();
  });

  it('seeds persisted work items for employees and exposes them through detail', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const workItemsResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/work-items',
    });
    expect(workItemsResponse.statusCode).toBe(200);
    expect(workItemsResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        title: '维护自然渠道承接策略',
        source: 'seed',
        status: 'active',
      },
      {
        employeeId: 'lushirong',
        title: '推进提单页导流',
        source: 'seed',
        status: 'active',
      },
    ]);

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      currentAssignments: ['维护自然渠道承接策略', '推进提单页导流'],
    });
  });

  it('creates and updates work items, and overview activeTaskCount follows persisted status', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/work-items',
      payload: {
        title: '推进充值中心导流方案',
        summary: '新接一个需要拆解的导流任务',
        status: 'active',
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as { workItemId: string };

    const overviewAfterCreate = await app.inject({ method: 'GET', url: '/employees' });
    expect(overviewAfterCreate.statusCode).toBe(200);
    expect(overviewAfterCreate.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        activeTaskCount: 3,
      },
      {
        employeeId: 'zhouyongkang',
        activeTaskCount: 2,
      },
    ]);

    const updateResponse = await app.inject({
      method: 'POST',
      url: `/work-items/${created.workItemId}/status`,
      payload: {
        status: 'completed',
      },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      workItemId: created.workItemId,
      status: 'completed',
    });

    const workItemsAfterUpdate = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/work-items',
    });
    expect(workItemsAfterUpdate.statusCode).toBe(200);
    expect(workItemsAfterUpdate.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workItemId: created.workItemId,
          title: '推进充值中心导流方案',
          status: 'completed',
        }),
      ]),
    );

    const overviewAfterUpdate = await app.inject({ method: 'GET', url: '/employees' });
    expect(overviewAfterUpdate.statusCode).toBe(200);
    expect(overviewAfterUpdate.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        activeTaskCount: 2,
      },
      {
        employeeId: 'zhouyongkang',
        activeTaskCount: 2,
      },
    ]);

    const detailAfterUpdate = await app.inject({
      method: 'GET',
      url: '/employees/lushirong',
    });
    expect(detailAfterUpdate.statusCode).toBe(200);
    expect(detailAfterUpdate.json()).toMatchObject({
      currentAssignments: ['维护自然渠道承接策略', '推进提单页导流'],
    });
  });

  it('dispatches a runtime task into the employee workspace inbox and persists dispatch history', async () => {
    let capturedEnvelope:
      | {
          taskTitle: string;
          taskBody: string;
          taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
          workItemId?: string;
          dispatchedAt?: string;
          brainContext?: unknown;
        }
      | undefined;
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      runtimeAdapter: {
        start: async (employeeId: string) => ({
          employeeId,
          runtimeKind: 'trae_acp',
          status: 'running',
          pid: 123,
        }),
        stop: async () => {},
        heartbeat: async (employeeId: string) => ({
          employeeId,
          runtimeKind: 'trae_acp',
          status: 'running',
          pid: 123,
        }),
        sendTask: async (employeeId, taskEnvelope) => {
          capturedEnvelope = taskEnvelope;
          return {
            employeeId,
            runtimeKind: 'trae_acp',
            workspacePath: `/tmp/${employeeId}`,
            taskFilePath: `/tmp/${employeeId}/.rdleader/tasks/${taskEnvelope.taskTitle}.json`,
            dispatchedAt: taskEnvelope.dispatchedAt ?? '2026-07-07T10:00:00.000Z',
          };
        },
        collectRuntimeEvents: async () => [],
      },
    });

    const workItemResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/work-items',
      payload: {
        title: '推进导流代码改造',
        summary: '给员工一个新的编码任务',
      },
    });
    const workItem = workItemResponse.json() as { workItemId: string };

    const dispatchResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/runtime-dispatches',
      payload: {
        workItemId: workItem.workItemId,
        taskTitle: '推进导流代码改造',
        taskBody: '请在隔离工作区里推进提单页导流代码改造',
        taskType: 'coding',
      },
    });

    expect(dispatchResponse.statusCode).toBe(201);
    expect(dispatchResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      workItemId: workItem.workItemId,
      taskTitle: '推进导流代码改造',
      taskType: 'coding',
      status: 'dispatched',
      runtimeReceipt: {
        workspacePath: '/tmp/lushirong',
      },
      brainPreview: {
        employeeId: 'lushirong',
        taskType: 'coding',
      },
    });
    expect(capturedEnvelope).toMatchObject({
      taskTitle: '推进导流代码改造',
      taskBody: '请在隔离工作区里推进提单页导流代码改造',
      taskType: 'coding',
      workItemId: workItem.workItemId,
      brainContext: {
        employeeId: 'lushirong',
        taskType: 'coding',
      },
    });

    const historyResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/runtime-dispatches',
    });
    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        workItemId: workItem.workItemId,
        taskTitle: '推进导流代码改造',
        taskType: 'coding',
        status: 'dispatched',
      },
    ]);
  });

  it('starts and stops an employee runtime while persisting runtime sessions', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      runtimeAdapter: {
        start: async (employeeId: string) => ({
          employeeId,
          runtimeKind: 'trae_acp',
          status: 'running',
          pid: 456,
        }),
        stop: async () => {},
        heartbeat: async (employeeId: string) => ({
          employeeId,
          runtimeKind: 'trae_acp',
          status: 'stopped',
          pid: null,
        }),
        sendTask: async (employeeId, taskEnvelope) => ({
          employeeId,
          runtimeKind: 'trae_acp',
          workspacePath: `/tmp/${employeeId}`,
          taskFilePath: `/tmp/${employeeId}/.rdleader/tasks/${taskEnvelope.taskTitle}.json`,
          dispatchedAt: taskEnvelope.dispatchedAt ?? '2026-07-07T10:00:00.000Z',
        }),
        collectRuntimeEvents: async () => [],
      },
      now: () => new Date('2026-07-07T10:00:00.000Z'),
    });

    const startResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/runtime/start',
    });
    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json()).toMatchObject({
      ok: true,
      runtime: {
        employeeId: 'lushirong',
        status: 'running',
        pid: 456,
      },
      session: {
        employeeId: 'lushirong',
        status: 'running',
        pid: 456,
      },
    });

    const stopResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/runtime/stop',
    });
    expect(stopResponse.statusCode).toBe(200);
    expect(stopResponse.json()).toMatchObject({
      ok: true,
      runtime: {
        employeeId: 'lushirong',
        status: 'stopped',
        pid: null,
      },
      session: {
        employeeId: 'lushirong',
        status: 'stopped',
        pid: null,
      },
    });

    const sessionsResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/runtime-sessions',
    });
    expect(sessionsResponse.statusCode).toBe(200);
    expect(sessionsResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        status: 'stopped',
        stoppedAt: '2026-07-07T10:00:00.000Z',
      },
    ]);
  });

  it('collects runtime result events, updates work item status, and persists result history', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rdleader-runtime-result-'));

    try {
      let linkedWorkItemId = '';
      const app = await buildApp({
        databaseUrl: ':memory:',
        memoryLoader: async () => [],
        runtimeAdapter: {
          start: async (employeeId: string) => ({
            employeeId,
            runtimeKind: 'trae_acp',
            status: 'running',
            pid: 321,
          }),
          stop: async () => {},
          heartbeat: async (employeeId: string) => ({
            employeeId,
            runtimeKind: 'trae_acp',
            status: 'running',
            pid: 321,
          }),
          sendTask: async (employeeId, taskEnvelope) => ({
            employeeId,
            runtimeKind: 'trae_acp',
            workspacePath: dir,
            taskFilePath: path.join(dir, '.rdleader', 'tasks', `${taskEnvelope.taskTitle}.json`),
            dispatchedAt: taskEnvelope.dispatchedAt ?? '2026-07-07T10:00:00.000Z',
          }),
          collectRuntimeEvents: async (employeeId) => [
            {
              employeeId,
              runtimeKind: 'trae_acp',
              workItemId: linkedWorkItemId,
              status: 'completed',
              summary: 'Runtime 已完成提单页导流代码改造',
              nextStepSummary: '下一步验证实验结果并同步项目群',
              artifactRefs: ['artifact://patch-collect'],
              sourceFilePath: path.join(dir, '.rdleader', 'results', 'result-1.json'),
              processedFilePath: path.join(dir, '.rdleader', 'results-processed', 'result-1.json'),
              createdAt: '2026-07-07T10:30:00.000Z',
            },
          ],
        },
      });

      const workItemResponse = await app.inject({
        method: 'POST',
        url: '/employees/lushirong/work-items',
        payload: {
          title: '提单页导流代码改造',
          summary: '准备将提单页导流代码改造派发给员工执行',
        },
      });
      const workItem = workItemResponse.json() as { workItemId: string };
      linkedWorkItemId = workItem.workItemId;

      const collectResponse = await app.inject({
        method: 'POST',
        url: '/employees/lushirong/actions/collect-runtime-events',
      });
      expect(collectResponse.statusCode).toBe(200);
      expect(collectResponse.json()).toMatchObject({
        ok: true,
        count: 1,
        events: [
          {
            employeeId: 'lushirong',
            status: 'completed',
            summary: 'Runtime 已完成提单页导流代码改造',
          },
        ],
      });

      const runtimeResults = await app.inject({
        method: 'GET',
        url: '/employees/lushirong/runtime-results',
      });
      expect(runtimeResults.statusCode).toBe(200);
      expect(runtimeResults.json()).toMatchObject([
        {
          employeeId: 'lushirong',
          status: 'completed',
          summary: 'Runtime 已完成提单页导流代码改造',
          artifactRefs: ['artifact://patch-collect'],
        },
      ]);

      const updatedWorkItems = await app.inject({
        method: 'GET',
        url: '/employees/lushirong/work-items',
      });
      expect(updatedWorkItems.statusCode).toBe(200);
      expect(updatedWorkItems.json()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            workItemId: workItem.workItemId,
            status: 'completed',
          }),
        ]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates and lists work episodes for an employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/work-episodes',
      payload: {
        title: '推进提单页导流',
        summary: '今天完成提单页导流方案拆解并继续推进联调',
        status: 'blocked',
        blocker: '等待产品确认新人券承接口径',
        reasoningSummary: '优先收敛新人券承接口径再继续联调，避免返工',
        artifactRefs: ['docs://rdleader/episodes/work-episode-1'],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      title: '推进提单页导流',
      status: 'blocked',
      blocker: '等待产品确认新人券承接口径',
      reasoningSummary: '优先收敛新人券承接口径再继续联调，避免返工',
      artifactRefs: ['docs://rdleader/episodes/work-episode-1'],
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/work-episodes',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        title: '推进提单页导流',
        status: 'blocked',
        blocker: '等待产品确认新人券承接口径',
        reasoningSummary: '优先收敛新人券承接口径再继续联调，避免返工',
        artifactRefs: ['docs://rdleader/episodes/work-episode-1'],
      },
    ]);
  });

  it('includes work episode observability fields in employee detail payload', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/work-episodes',
      payload: {
        title: '处理购物车导流联调',
        summary: '联调接口并确认实验参数',
        status: 'active',
        blocker: '等待实验配置生效',
        artifactRefs: ['meego://work-item/DM-1001'],
      },
    });
    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/work-episodes',
      payload: {
        title: '补充技术方案说明',
        summary: '补充导流方案与承接策略说明',
        status: 'blocked',
        blocker: '等待技术评审排期',
        reasoningSummary: '先补齐评审输入材料，再和相关同学对齐排期',
        artifactRefs: ['docs://rdleader/episodes/work-episode-2', 'lark://doc/tech-review'],
      },
    });

    const response = await app.inject({ method: 'GET', url: '/employees/lushirong' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'lushirong',
      recentWorkEpisodes: [
        expect.objectContaining({
          title: '补充技术方案说明',
          status: 'blocked',
        }),
        expect.objectContaining({
          title: '处理购物车导流联调',
          status: 'active',
        }),
      ],
      currentBlockers: expect.arrayContaining(['等待实验配置生效', '等待技术评审排期']),
      latestReasoningSummary: '先补齐评审输入材料，再和相关同学对齐排期',
      latestArtifacts: ['docs://rdleader/episodes/work-episode-2', 'lark://doc/tech-review'],
    });
  });

  it('returns a coding brain preview with layered progressive disclosure inputs', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [
        {
          source: 'git',
          date: '2026-07-06',
          summary: 'funshopping_user_growth_dispatch · 提单页导流链路修复',
          ref: 'commit://brain-preview-1',
        },
      ],
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/work-episodes',
      payload: {
        title: '提单页导流联调',
        summary: '完成主链路联调，等待实验配置生效',
        status: 'blocked',
        blocker: '等待实验配置生效',
        reasoningSummary: '优先确认主链路效果，再决定是否扩展到自然渠道承接',
        artifactRefs: ['meego://work-item/brain-preview-1'],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/reflections/refresh',
    });

    const promoteLearning = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/learning-records/promote-latest-reflection',
      payload: { scope: 'direction' },
    });
    const learningRecord = promoteLearning.json() as { recordId: string };
    await app.inject({
      method: 'POST',
      url: `/employees/lushirong/learning-records/${learningRecord.recordId}/promote-to-direction-knowledge`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/brain-preview?taskType=coding',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'lushirong',
      taskType: 'coding',
      layers: [
        { layer: 'identity' },
        { layer: 'seed' },
        { layer: 'working' },
        { layer: 'knowledge' },
      ],
      inputsPreview: {
        workingMemory: expect.arrayContaining([
          '当前任务：推进提单页导流',
          '最近完成：最近处理导流贯穿实验与自然渠道承接问题',
          '下一步：继续推进提单页导流与新人券承接相关工作',
          '阻塞：等待实验配置生效',
        ]),
        episodicMemory: expect.arrayContaining([
          '工作片段：blocked · 提单页导流联调 · 完成主链路联调，等待实验配置生效 · 阻塞：等待实验配置生效',
          '反思：围绕导流推进形成了一次新的反思',
        ]),
        knowledgeItems: expect.arrayContaining([
          'dir-independent-growth-diversion',
          'repo-funshopping-core',
          '方向知识：导流推进经验沉淀',
        ]),
      },
    });
  });

  it('returns a reflection brain preview using episodic and reflection layers', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/work-episodes',
      payload: {
        title: '购物车导流复盘',
        summary: '评审要求先补齐购物车与提单页优先级说明',
        status: 'active',
        blocker: '等待业务侧确认资源',
      },
    });

    await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/manager-proxy-reviews',
      payload: {
        reviewTopic: '购物车导流复盘会',
        conclusion: '需要先补齐优先级说明再继续推进',
        nextSteps: ['补齐优先级说明'],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/reflections/refresh',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/employees/zhouyongkang/brain-preview?taskType=reflection',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'zhouyongkang',
      taskType: 'reflection',
      layers: [
        { layer: 'identity' },
        { layer: 'episodic' },
        { layer: 'reflection' },
      ],
      inputsPreview: {
        episodicMemory: expect.arrayContaining([
          '工作片段：active · 购物车导流复盘 · 评审要求先补齐购物车与提单页优先级说明 · 阻塞：等待业务侧确认资源',
          '经理代理评审：购物车导流复盘会 · 需要先补齐优先级说明再继续推进',
          '反思：围绕当前工作形成了一次新的反思',
        ]),
      },
    });
  });

  it('accepts an internal employee message', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });
    const response = await app.inject({
      method: 'POST',
      url: '/chat/internal-message',
      payload: {
        senderEmployeeId: 'lushirong',
        recipientEmployeeId: 'zhouyongkang',
        body: '购物车导流和提单页导流的素材节奏需要同步',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });

    const feed = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/internal-messages',
    });
    expect(feed.statusCode).toBe(200);
    expect(feed.json()).toMatchObject([
      {
        senderEmployeeId: 'lushirong',
        recipientEmployeeId: 'zhouyongkang',
      },
    ]);
  });

  it('persists a manager-to-employee message and returns an employee reply', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/work-episodes',
      payload: {
        title: '提单页导流联调',
        summary: '今天已经把主链路联调到可验证状态',
        status: 'blocked',
        blocker: '等待实验配置生效',
        reasoningSummary: '先确认实验配置，再决定是否扩到自然渠道承接',
        artifactRefs: ['meego://work-item/manager-chat-1'],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'lushirong',
        body: '今天把提单页导流的下一步拆出来给我看',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      message: {
        employeeId: 'lushirong',
        role: 'manager',
        body: '今天把提单页导流的下一步拆出来给我看',
      },
      reply: {
        employeeId: 'lushirong',
        role: 'employee',
        taskType: 'status',
        approvalRequired: false,
        artifactRefs: ['meego://work-item/manager-chat-1'],
      },
    });

    const payload = response.json() as {
      reply: { body: string; reasoningSummary: string | null };
    };
    expect(payload.reply.body).toContain('卢世荣');
    expect(payload.reply.body).toContain('下一步');
    expect(payload.reply.body).toContain('等待实验配置生效');
    expect(payload.reply.reasoningSummary).toContain('先确认实验配置');
  });

  it('returns persisted manager conversation history for an employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'zhouyongkang',
        body: '同步一下购物车导流这周的推进情况',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/employees/zhouyongkang/manager-conversation',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([
      {
        employeeId: 'zhouyongkang',
        role: 'manager',
        body: '同步一下购物车导流这周的推进情况',
      },
      {
        employeeId: 'zhouyongkang',
        role: 'employee',
        taskType: 'status',
      },
    ]);
  });

  it('marks risky manager chat requests with an approval hint', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'lushirong',
        body: '直接去 meego update 状态并发群同步结果',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      reply: {
        employeeId: 'lushirong',
        approvalRequired: true,
      },
    });

    const payload = response.json() as {
      reply: { approvalSummary: string | null; body: string };
    };
    expect(payload.reply.approvalSummary).toContain('审批');
    expect(payload.reply.body).toContain('先等你明确批准');
  });

  it('creates a pending approval request for risky manager chat', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const managerMessageResponse = await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'lushirong',
        body: '直接去 meego update 状态并发群同步结果',
      },
    });

    expect(managerMessageResponse.statusCode).toBe(200);
    const managerPayload = managerMessageResponse.json() as {
      message: { messageId: string };
      reply: { approvalSummary: string | null };
    };

    const listResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/approval-requests',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        sourceMessageId: managerPayload.message.messageId,
        summary: '直接去 meego update 状态并发群同步结果',
        riskLevel: 'high',
        status: 'pending',
        approvalSummary: managerPayload.reply.approvalSummary,
        resolvedAt: null,
      },
    ]);

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong',
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      recentApprovalRequests: [
        expect.objectContaining({
          sourceMessageId: managerPayload.message.messageId,
          status: 'pending',
        }),
      ],
    });
  });

  it('lists approval requests for a single employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'lushirong',
        body: '直接去 meego update 状态',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'lushirong',
        body: '发群同步购物车导流状态',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'zhouyongkang',
        body: 'schedule 一个技术评审会议',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/approval-requests',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([
      expect.objectContaining({
        employeeId: 'lushirong',
        summary: '发群同步购物车导流状态',
        status: 'pending',
      }),
      expect.objectContaining({
        employeeId: 'lushirong',
        summary: '直接去 meego update 状态',
        status: 'pending',
      }),
    ]);
  });

  it('approves and rejects approval requests with resolved timestamps', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'lushirong',
        body: '直接去 meego update 状态',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/chat/manager-message',
      payload: {
        employeeId: 'lushirong',
        body: '发群同步购物车导流状态',
      },
    });

    const initialListResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/approval-requests',
    });
    const initialRequests = initialListResponse.json() as Array<{ requestId: string; summary: string }>;
    const approveRequest = initialRequests.find((request) => request.summary === '发群同步购物车导流状态');
    const rejectRequest = initialRequests.find((request) => request.summary === '直接去 meego update 状态');

    expect(approveRequest).toBeDefined();
    expect(rejectRequest).toBeDefined();

    const approveResponse = await app.inject({
      method: 'POST',
      url: `/approval-requests/${approveRequest!.requestId}/decision`,
      payload: {
        decision: 'approved',
        approvalSummary: '同意先发群同步，但不要改动其他外部状态。',
      },
    });

    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json()).toMatchObject({
      requestId: approveRequest!.requestId,
      status: 'approved',
      approvalSummary: '同意先发群同步，但不要改动其他外部状态。',
    });
    expect((approveResponse.json() as { resolvedAt: string | null }).resolvedAt).toEqual(expect.any(String));

    const rejectResponse = await app.inject({
      method: 'POST',
      url: `/approval-requests/${rejectRequest!.requestId}/decision`,
      payload: {
        decision: 'rejected',
        approvalSummary: '先不要直接修改状态，等我确认后再说。',
      },
    });

    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.json()).toMatchObject({
      requestId: rejectRequest!.requestId,
      status: 'rejected',
      approvalSummary: '先不要直接修改状态，等我确认后再说。',
    });
    expect((rejectResponse.json() as { resolvedAt: string | null }).resolvedAt).toEqual(expect.any(String));

    const finalListResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/approval-requests',
    });

    expect(finalListResponse.statusCode).toBe(200);
    expect(finalListResponse.json()).toMatchObject([
      expect.objectContaining({
        requestId: approveRequest!.requestId,
        status: 'approved',
      }),
      expect.objectContaining({
        requestId: rejectRequest!.requestId,
        status: 'rejected',
      }),
    ]);
  });

  it('returns employee memory as a dedicated route', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [
        {
          source: 'git',
          date: '2026-07-06',
          summary: 'funshopping_user_growth_dispatch · 抖极权益替换',
          ref: '9cd1663c4714',
        },
        {
          source: 'lark_doc',
          date: '2026-06-25',
          summary: '【投放&导流】购物车底部双button导流 - 技术方案',
          ref: 'https://bytedance.larkoffice.com/wiki/ObcDwSB2qid5LxkHGsVc3Oc8nGh',
        },
      ],
    });

    const response = await app.inject({ method: 'GET', url: '/employees/zhouyongkang/memory' });
    expect(response.statusCode).toBe(200);
    const payload = response.json() as Array<{ source: string; summary: string }>;
    expect(payload.map((item) => item.source)).toEqual(['git', 'lark_doc']);
  });

  it('creates a hiring candidate record', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/hr/candidates',
      payload: {
        name: '张三',
        interviewNotes: '由老板亲自面试，先看导流方向基础能力',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      candidate: {
        name: '张三',
        status: 'interviewing',
      },
    });
  });

  it('records and lists structured interview records for a candidate', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const candidateResponse = await app.inject({
      method: 'POST',
      url: '/hr/candidates',
      payload: {
        name: '张三',
        interviewNotes: '老板亲自面试，先看导流方向基础能力',
      },
    });
    const candidate = candidateResponse.json() as { candidate: { candidateId: string } };

    const createInterviewResponse = await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/interviews`,
      payload: {
        stage: 'manager-round',
        scheduledAt: '2026-07-08T14:00:00+08:00',
        summary: '候选人对导流链路拆解比较清晰，但还要补更多跨团队推进案例。',
        recommendation: 'hold',
      },
    });
    expect(createInterviewResponse.statusCode).toBe(201);
    expect(createInterviewResponse.json()).toMatchObject({
      candidateId: candidate.candidate.candidateId,
      stage: 'manager-round',
      recommendation: 'hold',
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: `/hr/candidates/${candidate.candidate.candidateId}/interviews`,
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        candidateId: candidate.candidate.candidateId,
        stage: 'manager-round',
        scheduledAt: '2026-07-08T14:00:00+08:00',
        recommendation: 'hold',
      },
    ]);
  });

  it('records candidate lifecycle events across the hiring workflow', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      now: () => new Date('2026-07-07T10:00:00.000Z'),
    });

    const candidateResponse = await app.inject({
      method: 'POST',
      url: '/hr/candidates',
      payload: {
        name: '张三',
        interviewNotes: '老板亲自面试，先看导流方向基础能力',
      },
    });
    const candidate = candidateResponse.json() as { candidate: { candidateId: string } };

    const createLifecycleResponse = await app.inject({
      method: 'GET',
      url: `/hr/candidates/${candidate.candidate.candidateId}/lifecycle`,
    });
    expect(createLifecycleResponse.statusCode).toBe(200);
    expect(createLifecycleResponse.json()).toMatchObject([
      {
        candidateId: candidate.candidate.candidateId,
        eventType: 'candidate_created',
        status: 'interviewing',
        summary: '创建候选人档案：张三。初始面试备注：老板亲自面试，先看导流方向基础能力',
      },
    ]);

    await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/interviews`,
      payload: {
        stage: 'manager-round',
        scheduledAt: '2026-07-08T14:00:00+08:00',
        summary: '候选人对导流链路拆解比较清晰，但还要补更多跨团队推进案例。',
        recommendation: 'hire',
      },
    });
    await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/decision`,
      payload: {
        status: 'offered',
      },
    });
    await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/convert-to-employee`,
      payload: {
        employeeId: 'zhangsan',
        directionId: 'independent-growth-diversion',
        level: '1-2',
      },
    });

    const lifecycleResponse = await app.inject({
      method: 'GET',
      url: `/hr/candidates/${candidate.candidate.candidateId}/lifecycle`,
    });
    expect(lifecycleResponse.statusCode).toBe(200);
    expect(lifecycleResponse.json()).toMatchObject([
      {
        candidateId: candidate.candidate.candidateId,
        eventType: 'candidate_hired',
        status: 'hired',
        summary: '录用为员工 zhangsan，方向 independent-growth-diversion，职级 1-2',
      },
      {
        candidateId: candidate.candidate.candidateId,
        eventType: 'decision_updated',
        status: 'offered',
        summary: '更新招聘决策为 offered',
      },
      {
        candidateId: candidate.candidate.candidateId,
        eventType: 'interview_recorded',
        status: 'interviewing',
        summary: '记录 manager-round 面试，建议 hire：候选人对导流链路拆解比较清晰，但还要补更多跨团队推进案例。',
      },
      {
        candidateId: candidate.candidate.candidateId,
        eventType: 'candidate_created',
        status: 'interviewing',
        summary: '创建候选人档案：张三。初始面试备注：老板亲自面试，先看导流方向基础能力',
      },
    ]);
  });

  it('requires at least one structured interview before converting a candidate into an employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/hr/candidates',
      payload: {
        name: '张三',
        interviewNotes: '老板亲自面试，评估导流方向基础能力',
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const candidate = createResponse.json() as { candidate: { candidateId: string } };

    const hireResponse = await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/convert-to-employee`,
      payload: {
        employeeId: 'zhangsan',
        directionId: 'independent-growth-diversion',
        level: '1-2',
      },
    });

    expect(hireResponse.statusCode).toBe(400);
    expect(hireResponse.json()).toMatchObject({
      message: 'candidate must have at least one interview before hiring',
    });
  });

  it('requires a candidate to be offered before converting into an employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/hr/candidates',
      payload: {
        name: '张三',
        interviewNotes: '老板亲自面试，评估导流方向基础能力',
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const candidate = createResponse.json() as { candidate: { candidateId: string } };

    const interviewResponse = await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/interviews`,
      payload: {
        stage: 'manager-round',
        scheduledAt: '2026-07-08T14:00:00+08:00',
        summary: '候选人具备基础能力，但还没走到 offer 环节。',
        recommendation: 'hire',
      },
    });
    expect(interviewResponse.statusCode).toBe(201);

    const hireResponse = await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/convert-to-employee`,
      payload: {
        employeeId: 'zhangsan',
        directionId: 'independent-growth-diversion',
        level: '1-2',
      },
    });

    expect(hireResponse.statusCode).toBe(400);
    expect(hireResponse.json()).toMatchObject({
      message: 'candidate must be offered before hiring',
    });
  });

  it('updates candidate decision and converts candidate into a real employee record', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/hr/candidates',
      payload: {
        name: '张三',
        interviewNotes: '老板亲自面试，评估导流方向基础能力',
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const candidate = createResponse.json() as { candidate: { candidateId: string } };

    const interviewResponse = await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/interviews`,
      payload: {
        stage: 'manager-round',
        scheduledAt: '2026-07-08T14:00:00+08:00',
        summary: '候选人可以独立拆解导流链路，也能承接跨团队推进。',
        recommendation: 'hire',
      },
    });
    expect(interviewResponse.statusCode).toBe(201);

    const offerResponse = await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/decision`,
      payload: {
        status: 'offered',
      },
    });
    expect(offerResponse.statusCode).toBe(200);
    expect(offerResponse.json()).toMatchObject({
      candidateId: candidate.candidate.candidateId,
      status: 'offered',
    });

    const hireResponse = await app.inject({
      method: 'POST',
      url: `/hr/candidates/${candidate.candidate.candidateId}/convert-to-employee`,
      payload: {
        employeeId: 'zhangsan',
        directionId: 'independent-growth-diversion',
        level: '1-2',
      },
    });
    expect(hireResponse.statusCode).toBe(201);
    expect(hireResponse.json()).toMatchObject({
      candidateId: candidate.candidate.candidateId,
      employee: {
        employeeId: 'zhangsan',
        displayName: '张三',
        level: '1-2',
        directionId: 'independent-growth-diversion',
      },
    });

    const candidatesResponse = await app.inject({
      method: 'GET',
      url: '/hr/candidates',
    });
    expect(candidatesResponse.statusCode).toBe(200);
    expect(candidatesResponse.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateId: candidate.candidate.candidateId,
          status: 'hired',
        }),
      ]),
    );

    const employeesResponse = await app.inject({
      method: 'GET',
      url: '/employees',
    });
    expect(employeesResponse.statusCode).toBe(200);
    expect(employeesResponse.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'zhangsan',
          displayName: '张三',
          directionId: 'independent-growth-diversion',
          activeTaskCount: 1,
        }),
      ]),
    );

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/zhangsan',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      employeeId: 'zhangsan',
      displayName: '张三',
      directionId: 'independent-growth-diversion',
      currentAssignments: ['完成入职熟悉'],
      defaultKnowledgeBaseIds: [
        'dir-independent-growth-diversion',
        'repo-funshopping-core',
        'repo-funshopping-user-growth-dispatch',
      ],
      riskFlags: [],
      memory: [],
    });
  });

  it('updates employee level and employment status', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const levelResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/level',
      payload: { level: '2-2' },
    });
    expect(levelResponse.statusCode).toBe(200);

    const firedResponse = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/employment-status',
      payload: { employmentStatus: 'fired' },
    });
    expect(firedResponse.statusCode).toBe(200);

    const lushirong = await app.inject({ method: 'GET', url: '/employees/lushirong' });
    const zhouyongkang = await app.inject({ method: 'GET', url: '/employees/zhouyongkang' });

    expect(lushirong.json()).toMatchObject({ level: '2-2' });
    expect(zhouyongkang.json()).toMatchObject({ employmentStatus: 'fired' });
  });

  it('lists, gets, and updates persisted direction configs', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const listResponse = await app.inject({ method: 'GET', url: '/directions' });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        directionId: 'independent-growth-diversion',
        displayName: '独立端增长导流',
        defaultKnowledgeBaseIds: [
          'dir-independent-growth-diversion',
          'repo-funshopping-core',
          'repo-funshopping-user-growth-dispatch',
        ],
      },
    ]);

    const getResponse = await app.inject({
      method: 'GET',
      url: '/directions/independent-growth-diversion/config',
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      directionId: 'independent-growth-diversion',
      displayName: '独立端增长导流',
      defaultKnowledgeBaseIds: [
        'dir-independent-growth-diversion',
        'repo-funshopping-core',
        'repo-funshopping-user-growth-dispatch',
      ],
    });

    const updateResponse = await app.inject({
      method: 'POST',
      url: '/directions/independent-growth-diversion/config',
      payload: {
        displayName: '独立端增长导流-新配置',
        defaultKnowledgeBaseIds: ['dir-growth-v2', 'repo-growth-playbook'],
        defaultRepoIds: ['funshopping-core'],
        commonDocumentRefs: ['lark://wiki/growth-direction'],
        routingHints: ['提单页导流', '购物车导流'],
      },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      directionId: 'independent-growth-diversion',
      displayName: '独立端增长导流-新配置',
      defaultKnowledgeBaseIds: ['dir-growth-v2', 'repo-growth-playbook'],
      defaultRepoIds: ['funshopping-core'],
      commonDocumentRefs: ['lark://wiki/growth-direction'],
      routingHints: ['提单页导流', '购物车导流'],
    });

    const updatedGetResponse = await app.inject({
      method: 'GET',
      url: '/directions/independent-growth-diversion/config',
    });
    expect(updatedGetResponse.statusCode).toBe(200);
    expect(updatedGetResponse.json()).toMatchObject({
      directionId: 'independent-growth-diversion',
      displayName: '独立端增长导流-新配置',
      defaultKnowledgeBaseIds: ['dir-growth-v2', 'repo-growth-playbook'],
      defaultRepoIds: ['funshopping-core'],
      commonDocumentRefs: ['lark://wiki/growth-direction'],
      routingHints: ['提单页导流', '购物车导流'],
    });

    const partialUpdateResponse = await app.inject({
      method: 'POST',
      url: '/directions/independent-growth-diversion/config',
      payload: {
        defaultKnowledgeBaseIds: ['dir-growth-v3'],
      },
    });
    expect(partialUpdateResponse.statusCode).toBe(200);
    expect(partialUpdateResponse.json()).toMatchObject({
      directionId: 'independent-growth-diversion',
      displayName: '独立端增长导流-新配置',
      defaultKnowledgeBaseIds: ['dir-growth-v3'],
      defaultRepoIds: ['funshopping-core'],
      commonDocumentRefs: ['lark://wiki/growth-direction'],
      routingHints: ['提单页导流', '购物车导流'],
    });
  });

  it('updates employee direction and returns authoritative direction config in detail payload', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const saveConfigResponse = await app.inject({
      method: 'POST',
      url: '/directions/search-growth/config',
      payload: {
        displayName: '搜索增长',
        defaultKnowledgeBaseIds: ['kb-search-growth', 'kb-search-playbook'],
        defaultRepoIds: ['search-growth-repo'],
        commonDocumentRefs: ['lark://wiki/search-growth'],
        routingHints: ['搜索承接', '结果页导流'],
      },
    });
    expect(saveConfigResponse.statusCode).toBe(200);

    const updateDirectionResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/direction',
      payload: {
        directionId: 'search-growth',
      },
    });
    expect(updateDirectionResponse.statusCode).toBe(200);
    expect(updateDirectionResponse.json()).toMatchObject({
      ok: true,
      employeeId: 'lushirong',
      directionId: 'search-growth',
    });

    const detailResponse = await app.inject({ method: 'GET', url: '/employees/lushirong' });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      directionId: 'search-growth',
      defaultKnowledgeBaseIds: ['kb-search-growth', 'kb-search-playbook'],
      directionConfig: {
        directionId: 'search-growth',
        displayName: '搜索增长',
        defaultKnowledgeBaseIds: ['kb-search-growth', 'kb-search-playbook'],
        defaultRepoIds: ['search-growth-repo'],
        commonDocumentRefs: ['lark://wiki/search-growth'],
        routingHints: ['搜索承接', '结果页导流'],
      },
    });
  });

  it('lists, creates, updates, and defaults project group bindings for an employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/project-groups',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        chatId: 'oc_demo_group',
        chatName: '独立端导流项目群',
        status: 'active',
        isDefault: true,
      },
    ]);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/project-groups',
      payload: {
        chatId: 'oc_growth_sync',
        chatName: '独立端导流同步群',
        status: 'watching',
        isDefault: false,
        managerProxyRequired: true,
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as { bindingId: string };

    const statusResponse = await app.inject({
      method: 'POST',
      url: `/employees/lushirong/project-groups/${created.bindingId}/status`,
      payload: {
        status: 'active',
      },
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      bindingId: created.bindingId,
      status: 'active',
    });

    const defaultResponse = await app.inject({
      method: 'POST',
      url: `/employees/lushirong/project-groups/${created.bindingId}/default`,
    });
    expect(defaultResponse.statusCode).toBe(200);
    expect(defaultResponse.json()).toMatchObject({
      bindingId: created.bindingId,
      isDefault: true,
    });

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      projectGroups: expect.arrayContaining([
        expect.objectContaining({
          chatId: 'oc_growth_sync',
          chatName: '独立端导流同步群',
          isDefault: true,
          status: 'active',
        }),
      ]),
    });
  });

  it('returns local integration status for trae, codex, bytedcli, and lark', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      integrationStatusLoader: async () => ({
        traeAcp: 'ready',
        codex: 'installed',
        bytedcli: 'ready',
        larkCli: 'ready',
      }),
    });

    const response = await app.inject({ method: 'GET', url: '/integrations/status' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      traeAcp: 'ready',
      codex: 'installed',
      bytedcli: 'ready',
      larkCli: 'ready',
    });
  });

  it('returns detailed auth snapshots for bytedcli and lark-cli', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      bytedcliAuthLoader: async () => ({
        authenticated: true,
        identity: 'lushirong.77@bytedance.com',
      }),
      larkAuthLoader: async () => ({
        verified: true,
        userName: '卢世荣',
      }),
    });

    const bytedcli = await app.inject({ method: 'GET', url: '/integrations/bytedcli/auth' });
    const lark = await app.inject({ method: 'GET', url: '/integrations/lark/auth' });

    expect(bytedcli.statusCode).toBe(200);
    expect(lark.statusCode).toBe(200);
    expect(bytedcli.json()).toMatchObject({
      authenticated: true,
      identity: 'lushirong.77@bytedance.com',
    });
    expect(lark.json()).toMatchObject({
      verified: true,
      userName: '卢世荣',
    });
  });

  it('returns meego auth status and feishu bot preview for an employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      meegoAuthLoader: async () => ({
        authenticated: true,
        endpoint: 'https://meego.larkoffice.com/mcp_server/v1',
        toolCount: 34,
      }),
      larkAuthLoader: async () => ({
        verified: true,
        userName: '卢世荣',
        openId: 'ou_55f68458c1c75e2a257647418efffdc7',
      }),
    });

    const meego = await app.inject({ method: 'GET', url: '/integrations/meego/auth' });
    const preview = await app.inject({ method: 'GET', url: '/employees/lushirong/feishu-bot-preview' });

    expect(meego.statusCode).toBe(200);
    expect(preview.statusCode).toBe(200);
    expect(meego.json()).toMatchObject({
      authenticated: true,
      toolCount: 34,
    });
    expect(preview.json()).toMatchObject({
      employeeId: 'lushirong',
      botName: '卢世荣',
      dmPolicy: 'manager-only',
      managerOpenId: 'ou_55f68458c1c75e2a257647418efffdc7',
      runtimeKind: 'trae_acp',
    });
  });

  it('returns project ops preview for manager-proxy Meego/Lark workflow', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      integrationStatusLoader: async () => ({
        traeAcp: 'ready',
        codex: 'installed',
        bytedcli: 'ready',
        larkCli: 'ready',
      }),
      meegoAuthLoader: async () => ({
        authenticated: true,
        endpoint: 'https://meego.larkoffice.com/mcp_server/v1',
        toolCount: 34,
      }),
    });

    const response = await app.inject({ method: 'GET', url: '/employees/zhouyongkang/project-ops-preview' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'zhouyongkang',
      managerProxyRequired: true,
      bytedcliReady: true,
      meegoAuthenticated: true,
    });
  });

  it('returns a dry-run command for manager dm bridge action', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      larkAuthLoader: async () => ({
        verified: true,
        userName: '卢世荣',
        openId: 'ou_55f68458c1c75e2a257647418efffdc7',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/send-manager-dm',
      payload: {
        body: '今天的推进情况我已经整理好了',
        dryRun: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'dry-run',
      employeeId: 'lushirong',
      managerOpenId: 'ou_55f68458c1c75e2a257647418efffdc7',
    });
  });

  it('blocks manager dm execution without explicit approval', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      larkAuthLoader: async () => ({
        verified: true,
        userName: '卢世荣',
        openId: 'ou_55f68458c1c75e2a257647418efffdc7',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/send-manager-dm',
      payload: {
        body: '我要直接给老板发一条消息',
        dryRun: false,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: 'approval_required',
    });
  });

  it('executes manager dm action after approval through the injected sender', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      larkAuthLoader: async () => ({
        verified: true,
        userName: '卢世荣',
        openId: 'ou_55f68458c1c75e2a257647418efffdc7',
      }),
      larkManagerDmSender: async (input) => ({
        ok: true,
        deliveredBody: input.body,
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/send-manager-dm',
      payload: {
        body: '老板，这是批准后执行的消息',
        dryRun: false,
        approved: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'executed',
      result: {
        ok: true,
        deliveredBody: '老板，这是批准后执行的消息',
      },
    });
  });

  it('returns a dry-run command for group coordination bridge action', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/send-group-message',
      payload: {
        chatId: 'oc_demo_group',
        body: '请大家确认本周技术评审的可参加时间',
        dryRun: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'dry-run',
      employeeId: 'zhouyongkang',
      chatId: 'oc_demo_group',
    });
  });

  it('blocks group coordination execution without explicit approval', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/send-group-message',
      payload: {
        chatId: 'oc_demo_group',
        body: '我现在直接在群里推进项目',
        dryRun: false,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: 'approval_required',
    });
  });

  it('executes group coordination action after approval through the injected sender', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      larkGroupMessageSender: async (input) => ({
        ok: true,
        chatId: input.chatId,
        deliveredBody: input.body,
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/send-group-message',
      payload: {
        chatId: 'oc_demo_group',
        body: '请大家确认本周技术评审的可参加时间',
        dryRun: false,
        approved: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'executed',
      result: {
        ok: true,
        chatId: 'oc_demo_group',
        deliveredBody: '请大家确认本周技术评审的可参加时间',
      },
    });
  });

  it('executes meego status refresh action', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      meegoAuthLoader: async () => ({
        authenticated: true,
        endpoint: 'https://meego.larkoffice.com/mcp_server/v1',
        toolCount: 34,
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/refresh-meego-status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'zhouyongkang',
      meego: {
        authenticated: true,
        toolCount: 34,
      },
    });
  });

  it('executes a meego workitem lookup action', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      meegoWorkitemLookup: async (input) => ({
        ok: true,
        lookupType: input.lookupType,
        query: input.query,
        items: [
          {
            id: '123456',
            title: '独立端导流实验推进',
          },
        ],
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/meego-workitem-lookup',
      payload: {
        lookupType: 'title',
        query: '独立端导流实验推进',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'lushirong',
      result: {
        ok: true,
        items: [
          {
            id: '123456',
            title: '独立端导流实验推进',
          },
        ],
      },
    });
  });

  it('returns a dry-run payload for meego workitem update', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/meego-workitem-update',
      payload: {
        workItemId: '123456',
        projectKey: 'demo-project',
        fields: '[{\"field_key\":\"priority\",\"field_value\":\"P1\"}]',
        dryRun: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'dry-run',
      employeeId: 'lushirong',
    });
  });

  it('blocks meego write actions without approval', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/meego-workitem-update',
      payload: {
        workItemId: '123456',
        projectKey: 'demo-project',
        fields: '[{\"field_key\":\"priority\",\"field_value\":\"P1\"}]',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: 'approval_required',
    });
  });

  it('executes a meego comment action after approval', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      meegoCommentCreate: async (input) => ({
        ok: true,
        workItemId: input.workItemId,
        content: input.commentContent,
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/meego-comment-create',
      payload: {
        workItemId: '123456',
        projectKey: 'demo-project',
        commentContent: '请相关同学补充本周排期确认',
        approved: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'executed',
      result: {
        ok: true,
        workItemId: '123456',
        content: '请相关同学补充本周排期确认',
      },
    });
  });

  it('returns a dry-run payload for tech review doc creation', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/create-tech-review-doc',
      payload: {
        title: '独立端导流技术评审',
        problem: '需要统一提单页与购物车导流策略',
        nextSteps: ['确认方案范围', '约评审时间'],
        dryRun: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'dry-run',
      employeeId: 'lushirong',
      title: '独立端导流技术评审',
    });
  });

  it('executes tech review doc creation after approval', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      larkDocCreator: async (input) => ({
        ok: true,
        title: input.title,
        url: 'https://bytedance.larkoffice.com/docx/mock-tech-review-doc',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/create-tech-review-doc',
      payload: {
        title: '独立端导流技术评审',
        problem: '需要统一提单页与购物车导流策略',
        nextSteps: ['确认方案范围', '约评审时间'],
        approved: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'executed',
      result: {
        ok: true,
        title: '独立端导流技术评审',
      },
    });
  });

  it('returns a dry-run payload for tech review meeting scheduling', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/schedule-tech-review',
      payload: {
        summary: '独立端导流技术评审',
        description: '讨论导流方案和排期',
        start: '2026-07-08T10:00:00+08:00',
        end: '2026-07-08T10:30:00+08:00',
        attendeeIds: ['ou_55f68458c1c75e2a257647418efffdc7'],
        dryRun: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'dry-run',
      employeeId: 'zhouyongkang',
      summary: '独立端导流技术评审',
    });
  });

  it('executes tech review meeting scheduling after approval', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      larkCalendarEventCreator: async (input) => ({
        ok: true,
        summary: input.summary,
        eventId: 'mock-event-id',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/schedule-tech-review',
      payload: {
        summary: '独立端导流技术评审',
        description: '讨论导流方案和排期',
        start: '2026-07-08T10:00:00+08:00',
        end: '2026-07-08T10:30:00+08:00',
        attendeeIds: ['ou_55f68458c1c75e2a257647418efffdc7'],
        approved: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'executed',
      result: {
        ok: true,
        summary: '独立端导流技术评审',
        eventId: 'mock-event-id',
      },
    });
  });

  it('returns a dry-run command for meego workitem lookup', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/meego-workitem-lookup',
      payload: {
        lookupType: 'title',
        query: '独立端导流实验推进',
        dryRun: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'dry-run',
      employeeId: 'lushirong',
    });
  });

  it('executes a feishu project chat lookup action', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      feishuChatSearch: async (input) => ({
        ok: true,
        query: input.query,
        chats: [
          {
            chatId: 'oc_demo_group',
            name: '独立端导流项目群',
          },
        ],
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/actions/find-project-chat',
      payload: {
        query: '独立端导流项目群',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'zhouyongkang',
      result: {
        ok: true,
        chats: [
          {
            chatId: 'oc_demo_group',
            name: '独立端导流项目群',
          },
        ],
      },
    });
  });

  it('records executed project operations so the manager can review what an employee did next', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
      larkGroupMessageSender: async (input) => ({
        ok: true,
        chatId: input.chatId,
        deliveredBody: input.body,
      }),
      meegoWorkitemLookup: async (input) => ({
        ok: true,
        lookupType: input.lookupType,
        query: input.query,
        items: [
          {
            id: '123456',
            title: '独立端导流实验推进',
          },
        ],
      }),
      larkDocCreator: async (input) => ({
        ok: true,
        title: input.title,
        url: 'https://bytedance.larkoffice.com/docx/mock-tech-review-doc',
      }),
      larkCalendarEventCreator: async (input) => ({
        ok: true,
        summary: input.summary,
        eventId: 'mock-event-id',
      }),
      feishuChatSearch: async (input) => ({
        ok: true,
        query: input.query,
        chats: [
          {
            chatId: 'oc_demo_group',
            name: '独立端导流项目群',
          },
        ],
      }),
      now: () => new Date('2026-07-07T12:00:00.000Z'),
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/meego-workitem-lookup',
      payload: {
        lookupType: 'title',
        query: '独立端导流实验推进',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/find-project-chat',
      payload: {
        query: '独立端导流项目群',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/create-tech-review-doc',
      payload: {
        title: '独立端导流技术评审',
        problem: '需要统一提单页与购物车导流策略',
        nextSteps: ['确认方案范围', '约评审时间'],
        approved: true,
      },
    });
    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/schedule-tech-review',
      payload: {
        summary: '独立端导流技术评审',
        description: '讨论导流方案和排期',
        start: '2026-07-08T10:00:00+08:00',
        end: '2026-07-08T10:30:00+08:00',
        attendeeIds: ['ou_55f68458c1c75e2a257647418efffdc7'],
        approved: true,
      },
    });
    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/send-group-message',
      payload: {
        chatId: 'oc_demo_group',
        body: '请大家确认本周技术评审的可参加时间',
        approved: true,
      },
    });

    const historyResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/project-ops-events',
    });

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'lushirong',
          actionKey: 'meego_workitem_lookup',
          summary: '查询 Meego 工作项：独立端导流实验推进 -> 123456 独立端导流实验推进',
          nextStepSummary: '确认是否需要补充评论、更新字段或同步到项目群',
          targetRef: '123456',
        }),
        expect.objectContaining({
          employeeId: 'lushirong',
          actionKey: 'find_project_chat',
          summary: '查找项目群：独立端导流项目群 -> 独立端导流项目群（oc_demo_group）',
          nextStepSummary: '确认目标项目群后绑定为默认群或继续发送推进消息',
          targetRef: 'oc_demo_group',
        }),
        expect.objectContaining({
          employeeId: 'lushirong',
          actionKey: 'create_tech_review_doc',
          summary: '创建技术评审文档：独立端导流技术评审',
          nextStepSummary: '将文档同步到项目群并推动相关方确认评审范围',
        }),
        expect.objectContaining({
          employeeId: 'lushirong',
          actionKey: 'schedule_tech_review',
          summary: '发起技术评审会议：独立端导流技术评审',
          nextStepSummary: '推动参会人确认时间并准备会前材料',
        }),
        expect.objectContaining({
          employeeId: 'lushirong',
          actionKey: 'send_group_message',
          summary: '向项目群 oc_demo_group 发送推进消息：请大家确认本周技术评审的可参加时间',
          nextStepSummary: '等待群内反馈并继续推进排期或评审安排',
          targetRef: 'oc_demo_group',
        }),
      ]),
    );
  });

  it('persists project operations history across app rebuilds', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rdleader-project-ops-'));
    const databaseUrl = path.join(dir, 'rdleader.db');

    try {
      const first = await buildApp({
        databaseUrl,
        memoryLoader: async () => [],
        larkGroupMessageSender: async (input) => ({
          ok: true,
          chatId: input.chatId,
          deliveredBody: input.body,
        }),
      });

      await first.inject({
        method: 'POST',
        url: '/employees/zhouyongkang/actions/send-group-message',
        payload: {
          chatId: 'oc_demo_group',
          body: '我已经在群里同步本周技术评审安排',
          approved: true,
        },
      });

      await first.close();

      const second = await buildApp({
        databaseUrl,
        memoryLoader: async () => [],
      });

      const historyResponse = await second.inject({
        method: 'GET',
        url: '/employees/zhouyongkang/project-ops-events',
      });

      expect(historyResponse.statusCode).toBe(200);
      expect(historyResponse.json()).toMatchObject([
        {
          employeeId: 'zhouyongkang',
          actionKey: 'send_group_message',
          summary: '向项目群 oc_demo_group 发送推进消息：我已经在群里同步本周技术评审安排',
        },
      ]);

      await second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('generates and returns employee reflections', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async (employeeId) => {
        if (employeeId === 'lushirong') {
          return [
            {
              source: 'git',
              date: '2026-07-03',
              summary: 'funshopping_user_growth_dispatch · 贯穿实验',
              ref: '28f6caf46a03',
            },
            {
              source: 'lark_doc',
              date: '2026-07-06',
              summary: '【技术方案】新人券真领券改造',
              ref: 'https://bytedance.larkoffice.com/wiki/DWGuwgJSDi3WvIkO3GzcLfMOnFd',
            },
          ];
        }

        return [];
      },
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/reflections/refresh',
    });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      summary: '围绕导流推进形成了一次新的反思',
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/reflections',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        summary: '围绕导流推进形成了一次新的反思',
      },
    ]);
  });

  it('promotes the latest reflection into a learning record', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async (employeeId) => {
        if (employeeId === 'lushirong') {
          return [
            {
              source: 'git',
              date: '2026-07-03',
              summary: 'funshopping_user_growth_dispatch · 贯穿实验',
              ref: '28f6caf46a03',
            },
          ];
        }
        return [];
      },
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/reflections/refresh',
    });

    const promoteResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/learning-records/promote-latest-reflection',
      payload: {
        scope: 'direction',
      },
    });
    expect(promoteResponse.statusCode).toBe(201);
    expect(promoteResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      scope: 'direction',
      title: '导流推进经验沉淀',
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/learning-records',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        scope: 'direction',
        title: '导流推进经验沉淀',
      },
    ]);

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong',
    });
    expect(detailResponse.json()).toMatchObject({
      latestLearningRecordId: expect.any(String),
    });
  });

  it('persists hr and internal message state across app rebuilds', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rdleader-server-'));
    const databaseUrl = path.join(dir, 'rdleader.db');

    try {
      const first = await buildApp({
        databaseUrl,
        memoryLoader: async () => [],
      });

      const candidateResponse = await first.inject({
        method: 'POST',
        url: '/hr/candidates',
        payload: {
          name: '李四',
          interviewNotes: '负责独立端增长导流方向，老板亲自面试',
        },
      });
      const candidate = candidateResponse.json() as { candidate: { candidateId: string } };
      await first.inject({
        method: 'POST',
        url: `/hr/candidates/${candidate.candidate.candidateId}/interviews`,
        payload: {
          stage: 'manager-round',
          scheduledAt: '2026-07-08T16:00:00+08:00',
          summary: '具备导流方向基础能力，后续等 offer 结论。',
          recommendation: 'hold',
        },
      });
      await first.inject({
        method: 'POST',
        url: '/chat/internal-message',
        payload: {
          senderEmployeeId: 'lushirong',
          recipientEmployeeId: 'zhouyongkang',
          body: '请同步最新的素材节奏',
        },
      });
      await first.inject({
        method: 'POST',
        url: '/employees/lushirong/level',
        payload: { level: '2-2' },
      });

      await first.close();

      const second = await buildApp({
        databaseUrl,
        memoryLoader: async () => [],
      });

      const candidateList = await second.inject({ method: 'GET', url: '/hr/candidates' });
      const candidateLifecycle = await second.inject({
        method: 'GET',
        url: `/hr/candidates/${candidate.candidate.candidateId}/lifecycle`,
      });
      const internalMessages = await second.inject({
        method: 'GET',
        url: '/employees/lushirong/internal-messages',
      });
      const employeeDetail = await second.inject({ method: 'GET', url: '/employees/lushirong' });

      expect(candidateList.statusCode).toBe(200);
      expect(candidateList.json()).toMatchObject([
        {
          name: '李四',
          status: 'interviewing',
        },
      ]);
      expect(candidateLifecycle.statusCode).toBe(200);
      expect(candidateLifecycle.json()).toMatchObject([
        {
          candidateId: candidate.candidate.candidateId,
          eventType: 'interview_recorded',
          summary: '记录 manager-round 面试，建议 hold：具备导流方向基础能力，后续等 offer 结论。',
        },
        {
          candidateId: candidate.candidate.candidateId,
          eventType: 'candidate_created',
          summary: '创建候选人档案：李四。初始面试备注：负责独立端增长导流方向，老板亲自面试',
        },
      ]);
      expect(internalMessages.statusCode).toBe(200);
      expect(internalMessages.json()).toMatchObject([
        {
          senderEmployeeId: 'lushirong',
          recipientEmployeeId: 'zhouyongkang',
          body: '请同步最新的素材节奏',
        },
      ]);
      expect(employeeDetail.json()).toMatchObject({
        employeeId: 'lushirong',
        level: '2-2',
      });

      await second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('records emotion events and updates the employee emotion snapshot', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/emotion-events',
      payload: {
        eventType: 'blocked_in_review',
        intensityDelta: 0.25,
        nextEmotion: 'anxious',
        summary: '需求评审被 challenge，员工开始担心交付风险',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      nextEmotion: 'anxious',
    });

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      emotionState: {
        current: 'anxious',
        summary: '需求评审被 challenge，员工开始担心交付风险',
      },
    });

    const timelineResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/emotion-events',
    });
    expect(timelineResponse.statusCode).toBe(200);
    expect(timelineResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        eventType: 'blocked_in_review',
        nextEmotion: 'anxious',
      },
    ]);
  });

  it('records performance events and updates retention risk plus resignation intent', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/performance-events',
      payload: {
        eventType: 'negative_review',
        reliabilityDelta: -0.18,
        nextDeliveryTrend: 'down',
        nextPromotionReadiness: 'hold',
        nextRetentionRisk: 'high',
        summary: '评审质量不达预期，员工担心自己表现不佳',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      employeeId: 'zhouyongkang',
      eventType: 'negative_review',
      nextRetentionRisk: 'high',
    });

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/zhouyongkang',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      performanceState: {
        deliveryTrend: 'down',
        promotionReadiness: 'hold',
        retentionRisk: 'high',
      },
      resignationIntent: 'watch',
    });

    const timelineResponse = await app.inject({
      method: 'GET',
      url: '/employees/zhouyongkang/performance-events',
    });
    expect(timelineResponse.statusCode).toBe(200);
    expect(timelineResponse.json()).toMatchObject([
      {
        employeeId: 'zhouyongkang',
        eventType: 'negative_review',
      },
    ]);
  });

  it('promotes a learning record into direction knowledge', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async (employeeId) => {
        if (employeeId === 'lushirong') {
          return [
            {
              source: 'git',
              date: '2026-07-03',
              summary: 'funshopping_user_growth_dispatch · 贯穿实验',
              ref: '28f6caf46a03',
            },
          ];
        }
        return [];
      },
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/reflections/refresh',
    });

    const learning = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/learning-records/promote-latest-reflection',
      payload: { scope: 'direction' },
    });
    const learningRecord = learning.json() as { recordId: string };

    const promote = await app.inject({
      method: 'POST',
      url: `/employees/lushirong/learning-records/${learningRecord.recordId}/promote-to-direction-knowledge`,
    });
    expect(promote.statusCode).toBe(201);
    expect(promote.json()).toMatchObject({
      employeeId: 'lushirong',
      directionId: 'independent-growth-diversion',
      title: '导流推进经验沉淀',
    });

    const directionRecords = await app.inject({
      method: 'GET',
      url: '/directions/independent-growth-diversion/knowledge-records',
    });
    expect(directionRecords.statusCode).toBe(200);
    expect(directionRecords.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          directionId: 'independent-growth-diversion',
          title: '导流推进经验沉淀',
        }),
      ]),
    );
  });

  it('exposes seeded direction knowledge records from initial technical documents', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const directionRecords = await app.inject({
      method: 'GET',
      url: '/directions/independent-growth-diversion/knowledge-records',
    });

    expect(directionRecords.statusCode).toBe(200);
    expect(directionRecords.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'lushirong',
          directionId: 'independent-growth-diversion',
          title: '【技术方案】新人券真领券改造',
          learningRecordId: 'seed-doc-lushirong-1',
        }),
        expect.objectContaining({
          employeeId: 'zhouyongkang',
          directionId: 'independent-growth-diversion',
          title: '【投放&导流】抖极老商城入口导流权益替换',
          learningRecordId: 'seed-doc-zhouyongkang-1',
        }),
      ]),
    );
  });

  it('records resignation events and lets the manager accept resignation', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/resignation-events',
      payload: {
        nextIntent: 'submitted',
        summary: '员工在高压下明确表达离职意愿',
      },
    });

    expect(submitResponse.statusCode).toBe(201);
    expect(submitResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      nextIntent: 'submitted',
    });

    const acceptResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/accept-resignation',
    });
    expect(acceptResponse.statusCode).toBe(200);

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      employmentStatus: 'resigned',
      resignationIntent: 'submitted',
    });

    const timelineResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/resignation-events',
    });
    expect(timelineResponse.statusCode).toBe(200);
    expect(timelineResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        nextIntent: 'submitted',
      },
    ]);
  });

  it('records manager-proxy review conclusions and feeds them back into next steps', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/manager-proxy-reviews',
      payload: {
        reviewTopic: '独立端导流需求评审',
        conclusion: '评审确认按购物车和提单页两条线推进',
        nextSteps: ['整理技术方案细节', '催相关方确认排期'],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      employeeId: 'zhouyongkang',
      reviewTopic: '独立端导流需求评审',
    });

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/employees/zhouyongkang',
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      nextStepSummary: '整理技术方案细节',
      recentDoneSummary: '评审确认按购物车和提单页两条线推进',
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/employees/zhouyongkang/manager-proxy-reviews',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject([
      {
        employeeId: 'zhouyongkang',
        reviewTopic: '独立端导流需求评审',
      },
    ]);
  });

  it('returns default autonomy settings for an employee', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/autonomy-settings',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      employeeId: 'lushirong',
      enabled: true,
      cadenceHours: 24,
      autoPromoteToDirectionKnowledge: false,
      lastRunAt: null,
      nextRunAt: expect.any(String),
      runCount: 0,
      lastOutcome: null,
      lastSummary: null,
    });
  });

  it('runs an employee autonomous learning cycle and stores history', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async (employeeId) => {
        if (employeeId === 'lushirong') {
          return [
            {
              source: 'git',
              date: '2026-07-06',
              summary: '导流实验推进时补齐了评审结论与交付节奏',
              ref: '9cd1663c4714',
            },
          ];
        }

        return [];
      },
    });

    const settingsResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/autonomy-settings',
      payload: {
        enabled: true,
        cadenceHours: 6,
        autoPromoteToDirectionKnowledge: true,
      },
    });

    expect(settingsResponse.statusCode).toBe(200);
    expect(settingsResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      cadenceHours: 6,
      autoPromoteToDirectionKnowledge: true,
    });

    const runResponse = await app.inject({
      method: 'POST',
      url: '/employees/lushirong/actions/run-autonomous-learning',
    });

    expect(runResponse.statusCode).toBe(201);
    expect(runResponse.json()).toMatchObject({
      employeeId: 'lushirong',
      trigger: 'manual',
      summary: expect.stringContaining('导流'),
      reflection: {
        employeeId: 'lushirong',
      },
      learningRecord: {
        employeeId: 'lushirong',
      },
      directionKnowledgeRecord: {
        employeeId: 'lushirong',
      },
      autonomySettings: {
        employeeId: 'lushirong',
        runCount: 1,
        lastOutcome: 'success',
        lastSummary: expect.any(String),
      },
    });

    const runsResponse = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/autonomous-learning-runs',
    });

    expect(runsResponse.statusCode).toBe(200);
    expect(runsResponse.json()).toMatchObject([
      {
        employeeId: 'lushirong',
        trigger: 'manual',
        summary: expect.any(String),
        reflection: {
          employeeId: 'lushirong',
        },
        learningRecord: {
          employeeId: 'lushirong',
        },
        directionKnowledgeRecord: {
          employeeId: 'lushirong',
        },
      },
    ]);
  });

  it('runs only due autonomous learning cycles', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async (employeeId) => {
        if (employeeId === 'lushirong') {
          return [
            {
              source: 'lark_doc',
              date: '2026-07-05',
              summary: '完成独立端导流方案复盘',
              ref: 'wiki://doc-1',
            },
          ];
        }

        return [
          {
            source: 'git',
            date: '2026-07-05',
            summary: '推进提单页优化',
            ref: 'commit://abc',
          },
        ];
      },
    });

    await app.inject({
      method: 'POST',
      url: '/employees/lushirong/autonomy-settings',
      payload: {
        enabled: true,
        cadenceHours: 12,
        autoPromoteToDirectionKnowledge: true,
        nextRunAt: '2026-07-01T00:00:00.000Z',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/employees/zhouyongkang/autonomy-settings',
      payload: {
        enabled: true,
        cadenceHours: 12,
        autoPromoteToDirectionKnowledge: false,
        nextRunAt: '2099-07-01T00:00:00.000Z',
      },
    });

    const dueResponse = await app.inject({
      method: 'POST',
      url: '/autonomy/run-due-cycles',
    });

    expect(dueResponse.statusCode).toBe(200);
    expect(dueResponse.json()).toMatchObject({
      ok: true,
      runCount: 1,
      runs: [
        {
          employeeId: 'lushirong',
          trigger: 'due_cycle',
          directionKnowledgeRecord: {
            employeeId: 'lushirong',
          },
        },
      ],
    });

    const lushirongSettings = await app.inject({
      method: 'GET',
      url: '/employees/lushirong/autonomy-settings',
    });
    const zhouyongkangRuns = await app.inject({
      method: 'GET',
      url: '/employees/zhouyongkang/autonomous-learning-runs',
    });

    expect(lushirongSettings.json()).toMatchObject({
      employeeId: 'lushirong',
      runCount: 1,
      lastOutcome: 'success',
    });
    expect(zhouyongkangRuns.json()).toEqual([]);
  });
});
