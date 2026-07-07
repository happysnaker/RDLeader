import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import * as api from './lib/api';

vi.stubGlobal('fetch', vi.fn(async (input: string) => {
  if (input.endsWith('/employees')) {
    return {
      ok: true,
      json: async () => [
        {
          employeeId: 'lushirong',
          displayName: '卢世荣',
          level: '2-1',
          directionId: 'independent-growth-diversion',
          recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
          nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
          emotionCurrent: 'focused',
          retentionRisk: 'low',
          runtimeKind: 'trae_acp',
        },
        {
          employeeId: 'zhouyongkang',
          displayName: '周永康',
          level: '2-1',
          directionId: 'independent-growth-diversion',
          recentDoneSummary: '最近推进购物车双按钮导流与权益替换实验',
          nextStepSummary: '继续推进搜索承接与充值中心导流能力',
          emotionCurrent: 'focused',
          retentionRisk: 'low',
          runtimeKind: 'trae_acp',
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

  if (input.endsWith('/employees/lushirong/reflections')) {
    return {
      ok: true,
      json: async () => [
        {
          reflectionId: 'reflection-1',
          employeeId: 'lushirong',
          createdAt: '2026-07-07T12:00:00.000Z',
          summary: '围绕导流推进形成了一次新的反思',
        },
      ],
    } as Response;
  }

  if (input.endsWith('/employees/lushirong/learning-records')) {
    return {
      ok: true,
      json: async () => [
        {
          recordId: 'learning-1',
          employeeId: 'lushirong',
          reflectionId: 'reflection-1',
          title: '导流推进经验沉淀',
          summary: '围绕导流推进形成了一次新的反思',
          scope: 'direction',
          promotedAt: '2026-07-07T12:05:00.000Z',
        },
      ],
    } as Response;
  }

  if (input.endsWith('/directions/independent-growth-diversion/knowledge-records')) {
    return {
      ok: true,
      json: async () => [
        {
          recordId: 'direction-kb-1',
          employeeId: 'lushirong',
          directionId: 'independent-growth-diversion',
          learningRecordId: 'learning-1',
          title: '导流推进经验沉淀',
          summary: '围绕导流推进形成了一次新的反思',
          promotedAt: '2026-07-07T12:06:30.000Z',
        },
      ],
    } as Response;
  }

  if (input.endsWith('/employees/lushirong/emotion-events')) {
    return {
      ok: true,
      json: async () => [
        {
          eventId: 'emotion-1',
          employeeId: 'lushirong',
          eventType: 'blocked_in_review',
          intensityDelta: 0.25,
          nextEmotion: 'anxious',
          summary: '需求评审被 challenge，员工开始担心交付风险',
          createdAt: '2026-07-07T12:10:00.000Z',
        },
      ],
    } as Response;
  }

  if (input.endsWith('/employees/lushirong/performance-events')) {
    return {
      ok: true,
      json: async () => [
        {
          eventId: 'performance-1',
          employeeId: 'lushirong',
          eventType: 'negative_review',
          reliabilityDelta: -0.18,
          nextDeliveryTrend: 'down',
          nextPromotionReadiness: 'hold',
          nextRetentionRisk: 'high',
          summary: '评审质量不达预期，员工担心自己表现不佳',
          createdAt: '2026-07-07T12:20:00.000Z',
        },
      ],
    } as Response;
  }

  if (input.endsWith('/employees/lushirong/resignation-events')) {
    return {
      ok: true,
      json: async () => [
        {
          eventId: 'resignation-1',
          employeeId: 'lushirong',
          nextIntent: 'submitted',
          summary: '员工在高压下明确表达离职意愿',
          createdAt: '2026-07-07T12:30:00.000Z',
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
      employmentStatus: 'active',
      directionId: 'independent-growth-diversion',
      workspacePath: '~/GolandProjects/E/lushirong',
      recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
      nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
      currentAssignments: ['推进提单页导流', '维护自然渠道承接策略'],
      defaultKnowledgeBaseIds: [
        'dir-independent-growth-diversion',
        'repo-funshopping-core',
        'repo-funshopping-user-growth-dispatch',
      ],
      runtime: { runtimeKind: 'trae_acp', status: 'running' },
      emotionState: { current: 'focused', summary: '在压力下保持推进' },
      performanceState: {
        deliveryTrend: 'up',
        communicationQuality: 'good',
        blockerHandling: 'good',
        reviewQuality: 'good',
        reliabilityScore: 0.83,
        promotionReadiness: 'watch',
        retentionRisk: 'low',
      },
      resignationIntent: 'low',
      riskFlags: [],
      personaProfile: {
        communicationTone: 'direct',
        ownershipBias: 'high',
        conflictTolerance: 'medium',
        pressureResponse: 'anxious-but-responsible',
        confidenceBaseline: 'self-critical',
        collaborationStyle: 'proactive',
        escalationPreference: 'early',
      },
      latestLearningRecordId: 'learning-1',
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
    getCandidates: vi.fn(async () => []),
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
    sendGroupMessageAction: vi.fn(async (employeeId: string, payload: {
      chatId: string;
      body: string;
      dryRun?: boolean;
      approved?: boolean;
    }) => {
      if (payload.dryRun) {
        return {
          mode: 'dry-run',
          employeeId,
          chatId: payload.chatId,
          command: ['lark-cli', 'im', '+messages-send', '--chat-id', payload.chatId],
        };
      }

      return {
        mode: 'executed',
        employeeId,
        chatId: payload.chatId,
        result: {
          ok: true,
          deliveredBody: payload.body,
        },
      };
    }),
    createTechReviewDocAction: vi.fn(async (_employeeId: string, payload: {
      title: string;
      problem: string;
      nextSteps: string[];
      dryRun?: boolean;
      approved?: boolean;
    }) => {
      if (payload.dryRun) {
        return {
          mode: 'dry-run',
          title: payload.title,
          command: ['lark-cli', 'docs', '+create', '--title', payload.title],
        };
      }

      return {
        mode: 'executed',
        result: {
          ok: true,
          title: payload.title,
          url: 'https://bytedance.larkoffice.com/docx/mock-tech-review-doc',
        },
      };
    }),
    scheduleTechReviewAction: vi.fn(async (_employeeId: string, payload: {
      summary: string;
      description: string;
      start: string;
      end: string;
      attendeeIds: string[];
      dryRun?: boolean;
      approved?: boolean;
    }) => {
      if (payload.dryRun) {
        return {
          mode: 'dry-run',
          summary: payload.summary,
          command: ['lark-cli', 'calendar', '+create', '--summary', payload.summary],
        };
      }

      return {
        mode: 'executed',
        result: {
          ok: true,
          summary: payload.summary,
          eventId: 'mock-event-id',
        },
      };
    }),
    lookupMeegoWorkitemAction: vi.fn(async (_employeeId: string, payload: {
      lookupType: 'id' | 'title';
      query: string;
      dryRun?: boolean;
    }) => {
      if (payload.dryRun) {
        return {
          mode: 'dry-run',
          command: ['bytedcli', '--json', 'meego', 'workitem', 'get', '--work-item-id', payload.query],
        };
      }

      return {
        employeeId: 'lushirong',
        result: {
          ok: true,
          items: [{ id: '123456', title: '独立端导流实验推进' }],
        },
      };
    }),
    findProjectChatAction: vi.fn(async (_employeeId: string, payload: {
      query: string;
      dryRun?: boolean;
    }) => {
      if (payload.dryRun) {
        return {
          mode: 'dry-run',
          command: ['lark-cli', 'im', '+chat-search', '--query', payload.query],
        };
      }

      return {
        employeeId: 'lushirong',
        result: {
          ok: true,
          chats: [{ chatId: 'oc_demo_group', name: '独立端导流项目群' }],
        },
      };
    }),
    refreshReflection: vi.fn(async () => ({
      reflectionId: 'reflection-2',
      employeeId: 'lushirong',
      createdAt: '2026-07-07T12:01:00.000Z',
      summary: '围绕导流推进形成了一次新的反思',
    })),
    getReflections: vi.fn(async () => [
      {
        reflectionId: 'reflection-1',
        employeeId: 'lushirong',
        createdAt: '2026-07-07T12:00:00.000Z',
        summary: '围绕导流推进形成了一次新的反思',
      },
    ]),
    getLearningRecords: vi.fn(async () => [
      {
        recordId: 'learning-1',
        employeeId: 'lushirong',
        reflectionId: 'reflection-1',
        title: '导流推进经验沉淀',
        summary: '围绕导流推进形成了一次新的反思',
        scope: 'direction',
        promotedAt: '2026-07-07T12:05:00.000Z',
      },
    ]),
    promoteLatestReflection: vi.fn(async () => ({
      recordId: 'learning-2',
      employeeId: 'lushirong',
      reflectionId: 'reflection-2',
      title: '导流推进经验沉淀',
      summary: '围绕导流推进形成了一次新的反思',
      scope: 'direction',
      promotedAt: '2026-07-07T12:06:00.000Z',
    })),
    getDirectionKnowledgeRecords: vi.fn(async () => [
      {
        recordId: 'direction-kb-1',
        employeeId: 'lushirong',
        directionId: 'independent-growth-diversion',
        learningRecordId: 'learning-1',
        title: '导流推进经验沉淀',
        summary: '围绕导流推进形成了一次新的反思',
        promotedAt: '2026-07-07T12:06:30.000Z',
      },
    ]),
    promoteLearningRecordToDirectionKnowledge: vi.fn(async () => ({
      recordId: 'direction-kb-2',
      employeeId: 'lushirong',
      directionId: 'independent-growth-diversion',
      learningRecordId: 'learning-2',
      title: '导流推进经验沉淀',
      summary: '围绕导流推进形成了一次新的反思',
      promotedAt: '2026-07-07T12:07:00.000Z',
    })),
    getEmotionEvents: vi.fn(async () => [
      {
        eventId: 'emotion-1',
        employeeId: 'lushirong',
        eventType: 'blocked_in_review',
        intensityDelta: 0.25,
        nextEmotion: 'anxious',
        summary: '需求评审被 challenge，员工开始担心交付风险',
        createdAt: '2026-07-07T12:10:00.000Z',
      },
    ]),
    createEmotionEvent: vi.fn(async () => ({
      eventId: 'emotion-2',
      employeeId: 'lushirong',
      eventType: 'positive_feedback',
      intensityDelta: -0.15,
      nextEmotion: 'proud',
      summary: '老板认可推进质量，员工情绪转为自豪',
      createdAt: '2026-07-07T12:11:00.000Z',
    })),
    getPerformanceEvents: vi.fn(async () => [
      {
        eventId: 'performance-1',
        employeeId: 'lushirong',
        eventType: 'negative_review',
        reliabilityDelta: -0.18,
        nextDeliveryTrend: 'down',
        nextPromotionReadiness: 'hold',
        nextRetentionRisk: 'high',
        summary: '评审质量不达预期，员工担心自己表现不佳',
        createdAt: '2026-07-07T12:20:00.000Z',
      },
    ]),
    createPerformanceEvent: vi.fn(async () => ({
      eventId: 'performance-2',
      employeeId: 'lushirong',
      eventType: 'negative_review',
      reliabilityDelta: -0.18,
      nextDeliveryTrend: 'down',
      nextPromotionReadiness: 'hold',
      nextRetentionRisk: 'high',
      summary: '评审质量不达预期，员工担心自己表现不佳',
      createdAt: '2026-07-07T12:21:00.000Z',
    })),
    getResignationEvents: vi.fn(async () => [
      {
        eventId: 'resignation-1',
        employeeId: 'lushirong',
        nextIntent: 'submitted',
        summary: '员工在高压下明确表达离职意愿',
        createdAt: '2026-07-07T12:30:00.000Z',
      },
    ]),
    createResignationEvent: vi.fn(async () => ({
      eventId: 'resignation-2',
      employeeId: 'lushirong',
      nextIntent: 'submitted',
      summary: '员工在高压下明确表达离职意愿',
      createdAt: '2026-07-07T12:31:00.000Z',
    })),
    acceptResignationAction: vi.fn(async () => ({
      ok: true,
      employeeId: 'lushirong',
      employmentStatus: 'resigned',
    })),
    getManagerProxyReviews: vi.fn(async () => [
      {
        reviewId: 'review-1',
        employeeId: 'lushirong',
        reviewTopic: '购物车导流技术评审',
        conclusion: '已确认按提单页和购物车双线推进',
        nextSteps: ['整理技术方案细节'],
        createdAt: '2026-07-07T12:40:00.000Z',
      },
    ]),
    createManagerProxyReview: vi.fn(async (_employeeId: string, payload: {
      reviewTopic: string;
      conclusion: string;
      nextSteps: string[];
    }) => ({
      reviewId: 'review-2',
      employeeId: 'lushirong',
      reviewTopic: payload.reviewTopic,
      conclusion: payload.conclusion,
      nextSteps: payload.nextSteps,
      createdAt: '2026-07-07T12:41:00.000Z',
    })),
    getAutonomySettings: vi.fn(async () => ({
      employeeId: 'lushirong',
      enabled: true,
      cadenceHours: 6,
      autoPromoteToDirectionKnowledge: true,
      lastRunAt: '2026-07-07T11:00:00.000Z',
      nextRunAt: '2026-07-07T17:00:00.000Z',
      runCount: 3,
      lastOutcome: 'success',
      lastSummary: '已从近期反思中提炼出新的导流经验',
    })),
    updateAutonomySettings: vi.fn(async (_employeeId: string, payload: {
      enabled?: boolean;
      cadenceHours?: number;
      autoPromoteToDirectionKnowledge?: boolean;
    }) => ({
      employeeId: 'lushirong',
      enabled: payload.enabled ?? true,
      cadenceHours: payload.cadenceHours ?? 6,
      autoPromoteToDirectionKnowledge: payload.autoPromoteToDirectionKnowledge ?? true,
      lastRunAt: '2026-07-07T11:00:00.000Z',
      nextRunAt: '2026-07-07T19:00:00.000Z',
      runCount: 3,
      lastOutcome: 'success',
      lastSummary: '已更新自治学习配置',
    })),
    getAutonomousLearningRuns: vi.fn(async () => [
      {
        cycleRunId: 'cycle-2',
        employeeId: 'lushirong',
        trigger: 'manual',
        createdAt: '2026-07-07T11:00:00.000Z',
        summary: '提炼出关于导流承接链路的经验',
        reflection: {
          reflectionId: 'reflection-2',
          summary: '对导流承接链路形成新的反思',
        },
        learningRecord: {
          recordId: 'learning-2',
          title: '导流承接链路经验',
          summary: '对导流承接链路形成新的反思',
        },
        directionKnowledgeRecord: {
          recordId: 'direction-kb-2',
          title: '导流承接链路经验',
        },
        autonomySettings: {
          employeeId: 'lushirong',
          enabled: true,
          cadenceHours: 6,
          autoPromoteToDirectionKnowledge: true,
          lastRunAt: '2026-07-07T11:00:00.000Z',
          nextRunAt: '2026-07-07T17:00:00.000Z',
          runCount: 3,
          lastOutcome: 'success',
          lastSummary: '提炼出关于导流承接链路的经验',
        },
      },
      {
        cycleRunId: 'cycle-1',
        employeeId: 'lushirong',
        trigger: 'scheduled',
        createdAt: '2026-07-07T05:00:00.000Z',
        summary: '无新反思可沉淀，记录空跑结论',
        reflection: null,
        learningRecord: null,
        directionKnowledgeRecord: null,
        autonomySettings: {
          employeeId: 'lushirong',
          enabled: true,
          cadenceHours: 6,
          autoPromoteToDirectionKnowledge: true,
          lastRunAt: '2026-07-07T05:00:00.000Z',
          nextRunAt: '2026-07-07T11:00:00.000Z',
          runCount: 2,
          lastOutcome: 'no-op',
          lastSummary: '无新反思可沉淀，记录空跑结论',
        },
      },
    ]),
    runAutonomousLearningAction: vi.fn(async () => ({
      cycleRunId: 'cycle-3',
      employeeId: 'lushirong',
      trigger: 'manual',
      createdAt: '2026-07-07T12:00:00.000Z',
      summary: '立即运行后补充了一条新的经验沉淀',
      reflection: {
        reflectionId: 'reflection-3',
        summary: '围绕最新推进补充了一次反思',
      },
      learningRecord: {
        recordId: 'learning-3',
        title: '立即运行产生的新经验',
        summary: '围绕最新推进补充了一次反思',
      },
      directionKnowledgeRecord: {
        recordId: 'direction-kb-3',
        title: '立即运行产生的新经验',
      },
      autonomySettings: {
        employeeId: 'lushirong',
        enabled: true,
        cadenceHours: 6,
        autoPromoteToDirectionKnowledge: true,
        lastRunAt: '2026-07-07T12:00:00.000Z',
        nextRunAt: '2026-07-07T18:00:00.000Z',
        runCount: 4,
        lastOutcome: 'success',
        lastSummary: '立即运行后补充了一条新的经验沉淀',
      },
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
    expect((await screen.findAllByText('方向：独立端增长导流')).length).toBeGreaterThanOrEqual(2);
    expect(
      await screen.findAllByText((content) => content.includes('继续推进提单页导流与新人券承接相关工作')),
    ).toHaveLength(2);
    expect(await screen.findByText('【技术方案】新人券真领券改造')).toBeTruthy();
    expect(await screen.findByText('推进提单页导流')).toBeTruthy();
    expect(await screen.findByText('repo-funshopping-core')).toBeTruthy();
    expect(await screen.findByText('经理OpenId：ou_55f68458c1c75e2a257647418efffdc7')).toBeTruthy();
    expect(await screen.findByText('bytedcli --json meego status')).toBeTruthy();
    expect((await screen.findAllByText('围绕导流推进形成了一次新的反思')).length).toBeGreaterThanOrEqual(2);
    expect((await screen.findAllByText('留存风险：low')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('沟通风格：direct')).toBeTruthy();
    expect(await screen.findByText('自治学习：开启')).toBeTruthy();
    expect(await screen.findByText('最近结果：success')).toBeTruthy();
    expect(await screen.findByText('提炼出关于导流承接链路的经验')).toBeTruthy();
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

  it('lets the manager preview and execute a group coordination action', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('群聊 chat_id'), {
      target: { value: 'oc_demo_group' },
    });
    fireEvent.change(screen.getByPlaceholderText('给项目群发推进消息'), {
      target: { value: '请大家确认本周技术评审的可参加时间' },
    });
    fireEvent.click(screen.getByRole('button', { name: '预览群消息命令' }));
    expect(await screen.findByText('lark-cli im +messages-send --chat-id oc_demo_group')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '批准后发群消息' }));
    expect(await screen.findByText('群消息已发送：请大家确认本周技术评审的可参加时间')).toBeTruthy();
  });

  it('lets the manager preview and execute meego workitem lookup plus project chat search', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('Meego 工作项关键词'), {
      target: { value: '独立端导流实验推进' },
    });
    fireEvent.click(screen.getByRole('button', { name: '预览 Meego 查询命令' }));
    expect(await screen.findByText('bytedcli --json meego workitem get --work-item-id 独立端导流实验推进')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '执行 Meego 查询' }));
    expect(await screen.findByText('工作项：123456 · 独立端导流实验推进')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('项目群关键字'), {
      target: { value: '独立端导流项目群' },
    });
    fireEvent.click(screen.getByRole('button', { name: '查找项目群' }));
    expect(await screen.findByText('项目群：独立端导流项目群（oc_demo_group）')).toBeTruthy();
  });

  it('lets the manager preview and execute tech review doc + meeting actions', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('技术评审文档标题'), {
      target: { value: '独立端导流技术评审' },
    });
    fireEvent.change(screen.getByPlaceholderText('技术问题背景'), {
      target: { value: '需要统一提单页与购物车导流策略' },
    });
    fireEvent.change(screen.getByPlaceholderText('下一步（每行一条）'), {
      target: { value: '确认方案范围\n约评审时间' },
    });
    fireEvent.click(screen.getByRole('button', { name: '预览技术文档命令' }));
    expect(await screen.findByText('lark-cli docs +create --title 独立端导流技术评审')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '批准后创建技术文档' }));
    expect(await screen.findByText('文档已创建：独立端导流技术评审')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('评审会议标题'), {
      target: { value: '独立端导流技术评审' },
    });
    fireEvent.change(screen.getByPlaceholderText('会议开始时间'), {
      target: { value: '2026-07-08T10:00:00+08:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('会议结束时间'), {
      target: { value: '2026-07-08T10:30:00+08:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('参会人 open_id，逗号分隔'), {
      target: { value: 'ou_55f68458c1c75e2a257647418efffdc7' },
    });
    fireEvent.click(screen.getByRole('button', { name: '预览评审会议命令' }));
    expect(await screen.findByText('lark-cli calendar +create --summary 独立端导流技术评审')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '批准后发起评审会议' }));
    expect(await screen.findByText('会议已创建：独立端导流技术评审')).toBeTruthy();
  });

  it('lets the manager promote the latest reflection into a learning record', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '沉淀为经验' }));
    expect((await screen.findAllByText('导流推进经验沉淀')).length).toBeGreaterThanOrEqual(1);
  });

  it('lets the manager create an emotion event and see the timeline', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '记录正向反馈' }));
    expect(await screen.findByText('老板认可推进质量，员工情绪转为自豪')).toBeTruthy();
    expect(await screen.findByText('blocked_in_review → anxious')).toBeTruthy();
  });

  it('lets the manager create a performance event and see retention risk pressure', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '记录负向绩效反馈' }));
    expect((await screen.findAllByText('评审质量不达预期，员工担心自己表现不佳')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('negative_review → high')).length).toBe(2);
  });

  it('lets the manager record and accept resignation intent', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '记录离职倾向' }));
    expect((await screen.findAllByText('员工在高压下明确表达离职意愿')).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: '接受离职' }));
    expect(await screen.findByText('在职状态：resigned')).toBeTruthy();
  });

  it('lets the manager promote experience into direction knowledge', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '提升为方向知识' }));
    expect((await screen.findAllByText('导流推进经验沉淀')).length).toBeGreaterThanOrEqual(2);
  });

  it('lets the manager record a proxy review and feed next steps back', async () => {
    render(<App />);
    fireEvent.change(await screen.findByPlaceholderText('代理评审主题'), {
      target: { value: '独立端导流需求评审' },
    });
    fireEvent.change(screen.getByPlaceholderText('评审结论'), {
      target: { value: '评审确认按购物车和提单页两条线推进' },
    });
    fireEvent.change(screen.getByPlaceholderText('会后下一步（每行一条）'), {
      target: { value: '整理技术方案细节\n催相关方确认排期' },
    });
    fireEvent.click(screen.getByRole('button', { name: '记录代理评审结论' }));
    expect(await screen.findByText('评审确认按购物车和提单页两条线推进')).toBeTruthy();
    expect((await screen.findAllByText('整理技术方案细节')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('已做：评审确认按购物车和提单页两条线推进')).toBeTruthy();
    expect(await screen.findByText('下一步：整理技术方案细节')).toBeTruthy();
  });

  it('lets the manager update autonomy settings for the selected employee', async () => {
    render(<App />);
    await screen.findByText('自治学习：开启');

    const enabledToggle = await screen.findByLabelText('启用自主学习');
    fireEvent.click(enabledToggle);

    const cadenceInput = screen.getByLabelText('学习节奏（小时）');
    fireEvent.change(cadenceInput, { target: { value: '12' } });

    const autoPromoteToggle = screen.getByLabelText('自动提升到方向知识');
    fireEvent.click(autoPromoteToggle);

    fireEvent.click(screen.getByRole('button', { name: '保存自治设置' }));

    expect(api.updateAutonomySettings).toHaveBeenCalledWith('lushirong', {
      enabled: false,
      cadenceHours: 12,
      autoPromoteToDirectionKnowledge: false,
    });
    expect(await screen.findByText('节奏：12 小时')).toBeTruthy();
    expect(await screen.findByText('自动提升方向知识：关闭')).toBeTruthy();
    expect(await screen.findByText('最近摘要：已更新自治学习配置')).toBeTruthy();
  });

  it('lets the manager run an autonomous learning cycle immediately', async () => {
    render(<App />);
    await screen.findByText('自治学习：开启');

    fireEvent.click(await screen.findByRole('button', { name: '立即运行自学习' }));

    expect(api.runAutonomousLearningAction).toHaveBeenCalledWith('lushirong');
    expect(await screen.findByText('最近结果：success')).toBeTruthy();
    expect(await screen.findByText('运行次数：4')).toBeTruthy();
    expect(await screen.findByText('最近摘要：立即运行后补充了一条新的经验沉淀')).toBeTruthy();
    expect(await screen.findByText('学习记录：立即运行产生的新经验')).toBeTruthy();
  });
});
