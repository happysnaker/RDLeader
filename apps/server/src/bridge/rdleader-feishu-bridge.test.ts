import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBridgePromptRequest, createFeishuBridgeAgent, sanitizeBridgeReplyText } from './rdleader-feishu-bridge';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rdleader feishu bridge agent', () => {
  it('maps LarkLink prompt payload into an RDLeader bridge request', () => {
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
      channelType: 'manager_dm',
      senderOpenId: 'ou_manager',
      senderRole: 'manager',
      body: '你今天进展如何？',
    });
  });

  it('infers an internal staff group channel from the thread key', () => {
    expect(
      createBridgePromptRequest({
        employeeId: 'lushirong',
        threadKey: 'oc_internal_staff',
        text: '帮忙同步一下 blocker',
        ownerUserId: 'ou_staff',
      }),
    ).toMatchObject({
      channelType: 'internal_staff_group',
      senderRole: 'internal_staff',
    });
  });

  it('emits a graceful fallback message instead of throwing when bridge chat fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('bridge unavailable');
    }));

    const updates: any[] = [];
    const outerConnection = {
      sessionUpdate: async (params: unknown) => {
        updates.push(params);
        return {};
      },
      requestPermission: async () => ({}),
    };

    const agentFactory = createFeishuBridgeAgent({
      employeeId: 'lushirong',
      controlUrl: 'http://127.0.0.1:3001',
      threadKey: 'dm:boss:lushirong',
      ownerUserId: 'ou_manager',
      cwd: '/tmp/lushirong',
    });
    const agent = agentFactory(outerConnection);
    const session = await agent.newSession({});
    const promptResult = await agent.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: 'text', text: '你好' }],
    });

    expect(promptResult).toMatchObject({ stopReason: 'end_turn' });
    expect(updates).toHaveLength(1);
    expect(JSON.stringify(updates[0])).toContain('消息已经看到了');
  });

  it('sanitizes raw bridge runtime errors before sending text back to Feishu', async () => {
    expect(
      sanitizeBridgeReplyText('处理消息失败: Internal error (code: -32603)。历史实例恢复失败，已重新创建实例，请补充必要背景。'),
    ).toContain('飞书侧刚才连桥抖了一下');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          replyText: '处理消息失败: Internal error (code: -32603)。历史实例恢复失败，已重新创建实例，请补充必要背景。',
        }),
      })),
    );

    const updates: any[] = [];
    const outerConnection = {
      sessionUpdate: async (params: unknown) => {
        updates.push(params);
        return {};
      },
      requestPermission: async () => ({}),
    };

    const agentFactory = createFeishuBridgeAgent({
      employeeId: 'lushirong',
      controlUrl: 'http://127.0.0.1:3001',
      threadKey: 'dm:boss:lushirong',
      ownerUserId: 'ou_manager',
      cwd: '/tmp/lushirong',
    });
    const agent = agentFactory(outerConnection);
    const session = await agent.newSession({});
    await agent.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: 'text', text: '你好' }],
    });

    const payload = JSON.stringify(updates[0]);
    expect(payload).toContain('飞书侧刚才连桥抖了一下');
    expect(payload).toContain('执行实例刚重建过一次');
    expect(payload).not.toContain('Internal error');
    expect(payload).not.toContain('历史实例恢复失败');
  });
});
