import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

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
    };
    expect(payload.employeeId).toBe('lushirong');
    expect(payload.runtime.runtimeKind).toBe('trae_acp');
    expect(payload.memory[0]?.summary).toContain('抖极权益替换');
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
});
