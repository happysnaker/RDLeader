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
        {
          employeeId: 'zhouyongkang',
          displayName: '周永康',
          level: '2-1',
          recentDoneSummary: '最近推进购物车双按钮导流与权益替换实验',
          nextStepSummary: '继续推进搜索承接与充值中心导流能力',
          emotionCurrent: 'focused',
        },
      ],
    } as Response;
  }

  if (input.endsWith('/integrations/status')) {
    return {
      ok: true,
      json: async () => ({
        traeAcp: 'ready',
        codex: 'installed',
        bytedcli: 'ready',
        larkCli: 'ready',
      }),
    } as Response;
  }

  if (input.endsWith('/integrations/meego/auth')) {
    return {
      ok: true,
      json: async () => ({
        authenticated: true,
        endpoint: 'https://meego.larkoffice.com/mcp_server/v1',
        toolCount: 34,
      }),
    } as Response;
  }

  if (input.endsWith('/employees/lushirong/feishu-bot-preview')) {
    return {
      ok: true,
      json: async () => ({
        employeeId: 'lushirong',
        botName: '卢世荣',
        dmPolicy: 'manager-only',
        managerOpenId: 'ou_55f68458c1c75e2a257647418efffdc7',
        groupPolicy: 'allowlist',
        requireMention: true,
        runtimeKind: 'trae_acp',
      }),
    } as Response;
  }

  if (input.endsWith('/employees/lushirong/project-ops-preview')) {
    return {
      ok: true,
      json: async () => ({
        employeeId: 'lushirong',
        managerProxyRequired: true,
        bytedcliReady: true,
        meegoAuthenticated: true,
        recommendedCommands: [
          'bytedcli --json meego status',
          'bytedcli meego config --tenant dcar',
        ],
      }),
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
      employmentStatus: 'active',
      workspacePath: '~/GolandProjects/E/lushirong',
      recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
      nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
      runtime: { runtimeKind: 'trae_acp', status: 'running' },
      emotionState: { current: 'focused', summary: '在压力下保持推进' },
      riskFlags: [],
      memory: [
        {
          source: 'git',
          date: '2026-07-06',
          summary: 'funshopping_user_growth_dispatch · Merge feat_opt_v3',
          ref: '9a2a70c1f7e2',
        },
        {
          source: 'lark_doc',
          date: '2026-07-06',
          summary: '【技术方案】新人券真领券改造',
          ref: 'https://bytedance.larkoffice.com/wiki/DWGuwgJSDi3WvIkO3GzcLfMOnFd',
        },
      ],
      conversations: [],
    }),
  } as Response;
}) as unknown as typeof fetch);

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api');

  return {
    ...actual,
    createCandidate: vi.fn(async (input: { name: string; interviewNotes: string }) => ({
      ok: true,
      candidate: {
        candidateId: 'candidate-1',
        name: input.name,
        interviewNotes: input.interviewNotes,
        status: 'interviewing',
      },
    })),
    updateEmployeeLevel: vi.fn(async (_employeeId: string, level: '1-2' | '2-1' | '2-2') => ({
      ok: true,
      level,
    })),
    updateEmploymentStatus: vi.fn(async (_employeeId: string, employmentStatus: string) => ({
      ok: true,
      employmentStatus,
    })),
    getInternalMessages: vi.fn(async () => []),
    sendInternalMessage: vi.fn(async (input: {
      senderEmployeeId: string;
      recipientEmployeeId: string;
      body: string;
    }) => ({
      ok: true,
      message: input,
    })),
  };
});

describe('App', () => {
  it('renders the seeded employee overview', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'RDLeader' })).toBeTruthy();
    expect(await screen.findByText('bytedcli：ready')).toBeTruthy();
    expect(await screen.findByText('meego：authenticated')).toBeTruthy();
    expect((await screen.findAllByText('卢世荣')).length).toBe(2);
    expect(
      await screen.findAllByText((content) => content.includes('继续推进提单页导流与新人券承接相关工作')),
    ).toHaveLength(2);
    expect(await screen.findByText('【技术方案】新人券真领券改造')).toBeTruthy();
    expect(await screen.findByText('经理OpenId：ou_55f68458c1c75e2a257647418efffdc7')).toBeTruthy();
    expect(await screen.findByText('bytedcli --json meego status')).toBeTruthy();
  });

  it('lets the manager send a message to the selected employee', async () => {
    render(<App />);

    const input = await screen.findByPlaceholderText('给员工发消息');
    fireEvent.change(input, { target: { value: '先给我一个今天的推进列表' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByText('老板：先给我一个今天的推进列表')).toBeTruthy();
  });

  it('lets the manager create a hiring candidate', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('候选人姓名'), {
      target: { value: '张三' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试记录'), {
      target: { value: '老板亲自面试，先看导流方向基础能力' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加候选人' }));

    expect(await screen.findByText('候选人：张三')).toBeTruthy();
  });

  it('lets the manager promote and fire the selected employee', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '晋升到 2-2' }));
    expect(await screen.findByText('当前职级：2-2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '解雇员工' }));
    expect(await screen.findByText('在职状态：fired')).toBeTruthy();
  });

  it('lets the manager coordinate employee-to-employee communication', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('给其他员工发协作消息'), {
      target: { value: '请同步购物车导流和提单页导流的素材节奏' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送内部协作消息' }));

    expect(await screen.findByText('lushirong → zhouyongkang：请同步购物车导流和提单页导流的素材节奏')).toBeTruthy();
  });
});
