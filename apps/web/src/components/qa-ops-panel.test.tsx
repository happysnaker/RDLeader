import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QaOpsPanel } from './qa-ops-panel';
import * as api from '../lib/api';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    beginGroupSendScopeAuthAction: vi.fn(),
    completeGroupSendScopeAuthAction: vi.fn(),
    getExternalBlockers: vi.fn(),
    getLatestGroupRouteRepairReport: vi.fn(),
    getLatestSmokeReport: vi.fn(),
    getLatestRuntimeEnduranceReport: vi.fn(),
    openGroupSendScopeAuthInChromeAction: vi.fn(),
    resetDemoStateAction: vi.fn(),
  };
});

describe('QaOpsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getLatestSmokeReport).mockResolvedValue({
      baseUrl: 'http://127.0.0.1:3001',
      startedAt: '2026-07-07T15:00:00.000Z',
      finishedAt: '2026-07-07T15:10:00.000Z',
      summary: {
        total: 46,
        passed: 46,
        failed: 0,
      },
    });
    vi.mocked(api.getLatestRuntimeEnduranceReport).mockResolvedValue({
      baseUrl: 'http://127.0.0.1:3001',
      employeeId: 'lushirong',
      startedAt: '2026-07-07T16:00:00.000Z',
      finishedAt: '2026-07-07T16:10:00.000Z',
      summary: {
        cycles: 2,
        passed: 2,
        failed: 0,
      },
    });
    vi.mocked(api.getLatestGroupRouteRepairReport).mockResolvedValue({
      baseUrl: 'http://127.0.0.1:3001',
      employeeId: 'lushirong',
      startedAt: '2026-07-07T16:20:00.000Z',
      finishedAt: '2026-07-07T16:21:00.000Z',
      targetChat: {
        chatId: 'oc_bot_qa',
        chatName: '机器人测试2',
        source: 'search:机器人测试2',
      },
      checks: {
        bindOk: true,
        sendOk: true,
        identityUsed: 'bot',
        autoRepairedBotRoute: true,
        bindingManagerProxyRequired: false,
        botPresenceState: 'in_chat',
      },
    });
    vi.mocked(api.getExternalBlockers).mockResolvedValue({
      items: [
        {
          key: 'group-send-scope',
          title: '群消息真实发送',
          status: 'blocked',
          detail: '缺少 im:message.send_as_user scope',
        },
      ],
    });
    vi.mocked(api.beginGroupSendScopeAuthAction).mockResolvedValue({
      verificationUrl: 'https://accounts.feishu.cn/oauth/mock',
      deviceCode: 'mock-device-code',
      expiresIn: 600,
      qrDataUrl: 'data:image/png;base64,mock',
    });
    vi.mocked(api.completeGroupSendScopeAuthAction).mockResolvedValue({
      ok: false,
      error: {
        message: 'missing required scope(s): im:message.send_as_user',
      },
    });
    vi.mocked(api.openGroupSendScopeAuthInChromeAction).mockResolvedValue({
      ok: true,
      opened: true,
      verificationUrl: 'https://accounts.feishu.cn/oauth/mock',
    });
    vi.mocked(api.resetDemoStateAction).mockResolvedValue({
      ok: true,
      employees: ['lushirong', 'zhouyongkang'],
      clearedTables: ['employees', 'work_items'],
    });
  });

  it('renders latest smoke summary and resets demo state', async () => {
    const onDemoReset = vi.fn();
    render(<QaOpsPanel onDemoReset={onDemoReset} />);

    expect(await screen.findByText('最新验收：46 / 46')).toBeTruthy();
    expect(await screen.findByText('失败数：0')).toBeTruthy();
    expect(await screen.findByText('稳定性回归：2 / 2')).toBeTruthy();
    expect(await screen.findByText('群路由修复：PASS · 机器人测试2')).toBeTruthy();
    expect(await screen.findByText('剩余 blocker（1）')).toBeTruthy();
    expect(await screen.findByRole('button', { name: '申请群消息权限' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '申请群消息权限' }));
    expect(await screen.findByText('已生成群消息权限授权链接')).toBeTruthy();
    expect(await screen.findByText('https://accounts.feishu.cn/oauth/mock')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '在 Chrome 打开授权页' }));
    expect(await screen.findByText('已在 Chrome 打开授权页')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '完成授权轮询' }));
    expect(await screen.findByText('missing required scope(s): im:message.send_as_user')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '重置演示态' }));

    await waitFor(() => {
      expect(api.resetDemoStateAction).toHaveBeenCalled();
    });
    expect(await screen.findByText('演示态已重置：lushirong, zhouyongkang')).toBeTruthy();
    expect(onDemoReset).toHaveBeenCalled();
  });

  it('shows a zero-blocker message when there are no real blockers', async () => {
    vi.mocked(api.getExternalBlockers).mockResolvedValueOnce({
      items: [],
    });

    render(<QaOpsPanel />);

    expect(await screen.findByText('当前无真实 blocker（默认演示占位群不计入）。')).toBeTruthy();
  });
});
