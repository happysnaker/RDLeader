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
    const payload = response.json() as Array<{ employeeId: string }>;
    expect(payload.map((employee) => employee.employeeId)).toEqual(['lushirong', 'zhouyongkang']);
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

  it('accepts a manager-to-employee message', async () => {
    const app = await buildApp({
      databaseUrl: ':memory:',
      memoryLoader: async () => [],
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
        body: '今天把提单页导流的下一步拆出来给我看',
      },
    });
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

      await first.inject({
        method: 'POST',
        url: '/hr/candidates',
        payload: {
          name: '李四',
          interviewNotes: '负责独立端增长导流方向，老板亲自面试',
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
    expect(directionRecords.json()).toMatchObject([
      {
        directionId: 'independent-growth-diversion',
        title: '导流推进经验沉淀',
      },
    ]);
  });
});
