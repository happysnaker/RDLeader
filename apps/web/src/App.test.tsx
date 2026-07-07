import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.stubGlobal('fetch', vi.fn(async (input: string) => {
  if (input.endsWith('/employees')) {
    return {
      ok: true,
      json: async () => [
        {
          employeeId: 'lushirong',
          displayName: '卢世荣',
          level: '2-1',
          recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
          nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
          emotionCurrent: 'focused',
        },
      ],
    } as Response;
  }

  if (input.endsWith('/chat/manager-message')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        message: {
          employeeId: 'lushirong',
          body: '先给我一个今天的推进列表',
        },
      }),
    } as Response;
  }

  return {
    ok: true,
    json: async () => ({
      employeeId: 'lushirong',
      displayName: '卢世荣',
      level: '2-1',
      recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
      nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
      runtime: { runtimeKind: 'trae_acp', status: 'running' },
      emotionState: { current: 'focused', summary: '在压力下保持推进' },
      riskFlags: [],
      conversations: [],
    }),
  } as Response;
}) as unknown as typeof fetch);

describe('App', () => {
  it('renders the seeded employee overview', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'RDLeader' })).toBeTruthy();
    expect((await screen.findAllByText('卢世荣')).length).toBe(2);
    expect(
      await screen.findAllByText((content) => content.includes('继续推进提单页导流与新人券承接相关工作')),
    ).toHaveLength(2);
  });

  it('lets the manager send a message to the selected employee', async () => {
    render(<App />);

    const input = await screen.findByPlaceholderText('给员工发消息');
    fireEvent.change(input, { target: { value: '先给我一个今天的推进列表' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByText('老板：先给我一个今天的推进列表')).toBeTruthy();
  });
});
