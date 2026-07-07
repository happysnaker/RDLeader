import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('RDLeader server', () => {
  it('returns seeded employees from the overview route', async () => {
    const app = await buildApp({ databaseUrl: ':memory:' });
    const response = await app.inject({ method: 'GET', url: '/employees' });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as Array<{ employeeId: string }>;
    expect(payload.map((employee) => employee.employeeId)).toEqual(['lushirong', 'zhouyongkang']);
  });

  it('returns employee detail and runtime info', async () => {
    const app = await buildApp({ databaseUrl: ':memory:' });
    const response = await app.inject({ method: 'GET', url: '/employees/lushirong' });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as { employeeId: string; runtime: { runtimeKind: string } };
    expect(payload.employeeId).toBe('lushirong');
    expect(payload.runtime.runtimeKind).toBe('trae_acp');
  });

  it('accepts an internal employee message', async () => {
    const app = await buildApp({ databaseUrl: ':memory:' });
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
    const app = await buildApp({ databaseUrl: ':memory:' });
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
});
