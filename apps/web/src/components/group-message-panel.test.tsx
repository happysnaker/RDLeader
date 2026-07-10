import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupMessagePanel } from './group-message-panel';
import * as api from '../lib/api';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    sendGroupMessageAction: vi.fn(),
    openLarkChatInDesktopAction: vi.fn(),
    copyTextToClipboardAction: vi.fn(),
  };
});

describe('GroupMessagePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows fallback actions when group send is blocked by scope and supports desktop handoff', async () => {
    vi.mocked(api.sendGroupMessageAction).mockRejectedValueOnce(
      new Error('missing required scope(s): im:message.send_as_user'),
    );
    vi.mocked(api.openLarkChatInDesktopAction).mockResolvedValue({
      ok: true,
      opened: true,
      chatId: 'oc_demo_group',
      deepLink: 'lark://applink.feishu.cn/client/chat/open?chatId=oc_demo_group',
    });
    vi.mocked(api.copyTextToClipboardAction).mockResolvedValue({
      ok: true,
      copied: true,
      length: 10,
    });

    render(<GroupMessagePanel employeeId="lushirong" />);

    fireEvent.change(screen.getByPlaceholderText('发送目标群会话 ID'), {
      target: { value: 'oc_demo_group' },
    });
    fireEvent.change(screen.getByPlaceholderText('给项目群发推进消息'), {
      target: { value: '测试消息' },
    });

    fireEvent.click(screen.getByRole('button', { name: '批准后发群消息' }));

    expect((await screen.findByRole('alert')).textContent).toContain('im:message.send_as_user');
    expect(await screen.findByRole('button', { name: '在飞书桌面打开群聊' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: '复制待发送消息' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '在飞书桌面打开群聊' }));
    await waitFor(() => {
      expect(api.openLarkChatInDesktopAction).toHaveBeenCalledWith('oc_demo_group');
    });

    fireEvent.click(screen.getByRole('button', { name: '复制待发送消息' }));
    await waitFor(() => {
      expect(api.copyTextToClipboardAction).toHaveBeenCalledWith('【RDLeader】测试消息');
    });
  });

  it('shows auto-repaired bot-route success copy when the backend repairs the route during send', async () => {
    vi.mocked(api.sendGroupMessageAction).mockResolvedValueOnce({
      result: {
        deliveredBody: '【RDLeader·卢世荣】测试消息',
        autoRepairedBotRoute: true,
      },
    } as any);

    render(<GroupMessagePanel employeeId="lushirong" />);

    fireEvent.change(screen.getByPlaceholderText('发送目标群会话 ID'), {
      target: { value: 'oc_demo_group' },
    });
    fireEvent.change(screen.getByPlaceholderText('给项目群发推进消息'), {
      target: { value: '测试消息' },
    });

    fireEvent.click(screen.getByRole('button', { name: '批准后发群消息' }));

    expect(
      await screen.findByText('群消息已发送：【RDLeader·卢世荣】测试消息（已自动切换为机器人直发）'),
    ).toBeTruthy();
  });

  it('disables preview and send when the selected group is only a demo placeholder', async () => {
    render(
      <GroupMessagePanel
        employeeId="lushirong"
        groups={[
          {
            bindingId: 'group-demo',
            employeeId: 'lushirong',
            chatId: 'oc_demo_group',
            chatName: '独立端导流项目群',
            status: 'active',
            isDefault: true,
            managerProxyRequired: true,
            isDemoPlaceholder: true,
          },
        ] as any}
      />,
    );

    expect(await screen.findByText('当前是演示占位群，无法真实发送。请先绑定真实项目群或创建机器人测试群。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '预览群消息命令' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '批准后发群消息' }).hasAttribute('disabled')).toBe(true);
  });
});
