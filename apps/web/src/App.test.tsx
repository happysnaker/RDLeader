import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import * as api from './lib/api';

const approvalFixtures = vi.hoisted(() => {
  const seed = [
    {
      requestId: 'approval-request-1',
      employeeId: 'lushirong',
      sourceMessageId: 'lushirong-employee-1',
      summary: '申请协调跨团队资源，先保障提单页导流排期。',
      riskLevel: 'high',
      status: 'pending',
      approvalSummary: '需要经理确认是否允许协调跨团队资源。',
      createdAt: '2026-07-07T12:46:30.000Z',
      resolvedAt: null,
    },
    {
      requestId: 'approval-request-2',
      employeeId: 'lushirong',
      sourceMessageId: 'lushirong-employee-2',
      summary: '申请临时同步购物车导流风险。',
      riskLevel: 'medium',
      status: 'pending',
      approvalSummary: '需要经理确认是否同步购物车导流风险。',
      createdAt: '2026-07-07T12:47:30.000Z',
      resolvedAt: null,
    },
    {
      requestId: 'approval-request-3',
      employeeId: 'lushirong',
      sourceMessageId: 'lushirong-employee-3',
      summary: '已批准的技术评审资源协调。',
      riskLevel: 'low',
      status: 'approved',
      approvalSummary: '经理已批准协调技术评审资源。',
      createdAt: '2026-07-07T10:00:00.000Z',
      resolvedAt: '2026-07-07T10:10:00.000Z',
    },
    {
      requestId: 'approval-request-4',
      employeeId: 'lushirong',
      sourceMessageId: 'lushirong-employee-4',
      summary: '已拒绝的额外人力申请。',
      riskLevel: 'medium',
      status: 'rejected',
      approvalSummary: '经理拒绝额外人力申请，先聚焦主链路。',
      createdAt: '2026-07-07T09:00:00.000Z',
      resolvedAt: '2026-07-07T09:15:00.000Z',
    },
  ];

  let state = seed.map((item) => ({ ...item }));

  return {
    reset() {
      state = seed.map((item) => ({ ...item }));
    },
    list(employeeId: string) {
      return state.filter((item) => item.employeeId === employeeId).map((item) => ({ ...item }));
    },
    decide(requestId: string, decision: 'approved' | 'rejected') {
      state = state.map((item) =>
        item.requestId === requestId
          ? {
              ...item,
              status: decision,
              resolvedAt: decision === 'approved' ? '2026-07-07T13:10:00.000Z' : '2026-07-07T13:11:00.000Z',
            }
          : item,
      );

      const updated = state.find((item) => item.requestId === requestId);
      if (!updated) {
        throw new Error(`Missing approval request: ${requestId}`);
      }

      return { ...updated };
    },
  };
});

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
          activeTaskCount: 3,
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
          activeTaskCount: 2,
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
      currentBlockers: ['等待提单页排期确认', '自然渠道素材待补齐'],
      latestReasoningSummary: '优先保证提单页导流闭环，再补自然渠道承接，避免两条链路同时失焦。',
      latestArtifacts: [
        'meego://work-item/123456',
        'doc://tech-review/independent-growth-diversion',
      ],
      recentWorkEpisodes: [
        {
          episodeId: 'episode-1',
          employeeId: 'lushirong',
          title: '推进提单页导流方案',
          summary: '完成导流实验方案收敛，并同步关键风险。',
          status: 'blocked',
          blocker: '等待提单页排期确认',
          reasoningSummary: '优先打通主链路，再处理自然渠道承接。',
          artifactRefs: ['meego://work-item/123456', 'doc://tech-review/independent-growth-diversion'],
          createdAt: '2026-07-07T12:50:00.000Z',
        },
      ],
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
    getCandidateInterviews: vi.fn(async () => []),
    createCandidateInterview: vi.fn(async (_candidateId: string, payload: {
      stage: string;
      scheduledAt: string;
      summary: string;
      recommendation: 'hire' | 'hold' | 'reject';
    }) => ({
      interviewId: 'interview-1',
      candidateId: 'candidate-1',
      stage: payload.stage,
      scheduledAt: payload.scheduledAt,
      summary: payload.summary,
      recommendation: payload.recommendation,
      createdAt: '2026-07-07T15:00:00.000Z',
    })),
    updateCandidateDecision: vi.fn(async (candidateId: string, status: 'offered' | 'rejected') => ({
      ok: true,
      candidateId,
      status,
    })),
    convertCandidateToEmployee: vi.fn(async (_candidateId: string, payload: {
      employeeId: string;
      directionId: string;
      level?: '1-2' | '2-1' | '2-2';
    }) => ({
      ok: true,
      candidateId: 'candidate-1',
      employee: {
        employeeId: payload.employeeId,
        displayName: '张三',
        level: payload.level ?? '1-2',
        directionId: payload.directionId,
        defaultKnowledgeBaseIds:
          payload.directionId === 'core-platform'
            ? ['repo-engineering-playbook', 'repo-rdleader-web']
            : ['dir-independent-growth-diversion', 'repo-funshopping-core'],
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
    getDirections: vi.fn(async () => [
      {
        directionId: 'independent-growth-diversion',
        displayName: '独立端增长导流',
      },
      {
        directionId: 'core-platform',
        displayName: '核心平台',
      },
    ]),
    getDirectionConfig: vi.fn(async (directionId: string) => {
      if (directionId === 'core-platform') {
        return {
          directionId,
          displayName: '核心平台',
          defaultKnowledgeBaseIds: ['dir-core-platform', 'repo-rdleader-web'],
        };
      }

      return {
        directionId,
        displayName: '独立端增长导流',
        defaultKnowledgeBaseIds: [
          'dir-independent-growth-diversion',
          'repo-funshopping-core',
          'repo-funshopping-user-growth-dispatch',
        ],
      };
    }),
    updateDirectionConfig: vi.fn(async (directionId: string, payload: {
      defaultKnowledgeBaseIds: string[];
    }) => ({
      directionId,
      displayName: directionId === 'core-platform' ? '核心平台' : '独立端增长导流',
      defaultKnowledgeBaseIds: payload.defaultKnowledgeBaseIds,
    })),
    updateEmployeeDirection: vi.fn(async (employeeId: string, directionId: string) => ({
      employeeId,
      directionId,
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
    getManagerConversation: vi.fn(async (employeeId: string) => [
      {
        messageId: `${employeeId}-manager-1`,
        employeeId,
        role: 'manager',
        body: '先给我一个今天的推进列表',
        taskType: 'status',
        createdAt: '2026-07-07T12:45:00.000Z',
      },
      {
        messageId: `${employeeId}-employee-1`,
        employeeId,
        role: 'employee',
        body: '提单页导流先推进，购物车导流今天同步风险。',
        taskType: 'status',
        reasoningSummary: '先闭环主链路，避免两条链路同时失焦。',
        artifactRefs: ['meego://work-item/123456', 'doc://tech-review/independent-growth-diversion'],
        approvalRequired: true,
        approvalSummary: '需要批准跨团队资源协调后再继续推进。',
        createdAt: '2026-07-07T12:46:00.000Z',
      },
    ]),
    getApprovalRequests: vi.fn(async (employeeId: string) => approvalFixtures.list(employeeId)),
    decideApprovalRequest: vi.fn(async (requestId: string, decision: 'approved' | 'rejected') =>
      approvalFixtures.decide(requestId, decision),
    ),
    sendManagerMessage: vi.fn(async (input: {
      employeeId: string;
      body: string;
    }) => ({
      ok: true,
      message: {
        messageId: `${input.employeeId}-manager-2`,
        employeeId: input.employeeId,
        role: 'manager',
        body: input.body,
        taskType: 'status',
        createdAt: '2026-07-07T12:47:00.000Z',
      },
      reply: {
        messageId: `${input.employeeId}-employee-2`,
        employeeId: input.employeeId,
        role: 'employee',
        body: '今天会先把提单页排期和 blocker 收敛给你。',
        taskType: 'status',
        reasoningSummary: '先拿到排期结论，再决定是否扩展次级链路。',
        artifactRefs: ['meego://work-item/123456'],
        approvalRequired: false,
        approvalSummary: null,
        createdAt: '2026-07-07T12:48:00.000Z',
      },
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
    getBrainPreview: vi.fn(async (employeeId: string, taskType: string) => ({
      employeeId,
      taskType,
      layers: [
        {
          layer: 'intent',
          payload: {
            summary: taskType === 'coding' ? '优先修复提单页导流链路' : `按${taskType}任务组织管理动作`,
          },
        },
        {
          layer: 'memory',
          payload: {
            sources: taskType === 'coding' ? ['recent-episode', 'direction-kb'] : ['manager-review', 'group-sync'],
          },
        },
        {
          layer: 'response',
          payload: {
            nextAction: taskType === 'coding' ? '先确认主链路 blockers' : `输出 ${taskType} 视角的经理摘要`,
          },
        },
      ],
      inputsPreview: {
        workingMemory:
          taskType === 'coding'
            ? ['提单页导流排期待确认', '先闭环主链路']
            : [`${taskType} 节奏待同步`, '需要经理确认资源'],
        episodicMemory:
          taskType === 'coding'
            ? ['最近一次技术评审要求先保主链路']
            : [`最近一次${taskType}沟通需要明确负责人`],
        knowledgeItems:
          taskType === 'coding'
            ? ['repo-funshopping-core', 'doc://tech-review/independent-growth-diversion']
            : ['dir-independent-growth-diversion', 'playbook://manager-collab'],
      },
    })),
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
    getWorkEpisodes: vi.fn(async () => [
      {
        episodeId: 'episode-1',
        employeeId: 'lushirong',
        title: '推进提单页导流方案',
        summary: '完成导流实验方案收敛，并同步关键风险。',
        status: 'blocked',
        blocker: '等待提单页排期确认',
        reasoningSummary: '优先打通主链路，再处理自然渠道承接。',
        artifactRefs: ['meego://work-item/123456', 'doc://tech-review/independent-growth-diversion'],
        createdAt: '2026-07-07T12:50:00.000Z',
      },
    ]),
    createWorkEpisode: vi.fn(async (_employeeId: string, payload: {
      title: string;
      summary: string;
      status: string;
      blocker?: string;
      reasoningSummary?: string;
      artifactRefs?: string[];
    }) => ({
      episodeId: 'episode-2',
      employeeId: 'lushirong',
      ...payload,
      artifactRefs: payload.artifactRefs ?? [],
      createdAt: '2026-07-07T13:00:00.000Z',
    })),
    getWorkItems: vi.fn(async () => [
      {
        workItemId: 'seed-work-3',
        employeeId: 'lushirong',
        title: '同步项目群排期',
        summary: '同步项目群排期（初始种子任务）',
        status: 'active',
        source: 'seed',
      },
      {
        workItemId: 'seed-work-2',
        employeeId: 'lushirong',
        title: '维护自然渠道承接策略',
        summary: '维护自然渠道承接策略（初始种子任务）',
        status: 'active',
        source: 'seed',
      },
      {
        workItemId: 'seed-work-1',
        employeeId: 'lushirong',
        title: '推进提单页导流',
        summary: '推进提单页导流（初始种子任务）',
        status: 'active',
        source: 'seed',
      },
    ]),
    createWorkItem: vi.fn(async (_employeeId: string, payload: {
      title: string;
      summary: string;
      status?: 'active' | 'blocked' | 'completed';
    }) => ({
      workItemId: 'manager-work-1',
      employeeId: 'lushirong',
      title: payload.title,
      summary: payload.summary,
      status: payload.status ?? 'active',
      source: 'manager',
      createdAt: '2026-07-07T13:10:00.000Z',
      updatedAt: '2026-07-07T13:10:00.000Z',
    })),
    updateWorkItemStatus: vi.fn(async (workItemId: string, status: 'active' | 'blocked' | 'completed') => ({
      workItemId,
      employeeId: 'lushirong',
      title: '新增导流实验',
      summary: '新增导流实验任务',
      status,
      source: 'manager',
      createdAt: '2026-07-07T13:10:00.000Z',
      updatedAt: '2026-07-07T13:12:00.000Z',
    })),
    getRuntimeDispatches: vi.fn(async () => [
      {
        dispatchId: 'dispatch-1',
        employeeId: 'lushirong',
        workItemId: 'seed-work-1',
        taskTitle: '推进提单页导流',
        taskBody: '先确认主链路 blocker，再推进代码改造',
        taskType: 'coding',
        status: 'dispatched',
        workspaceTaskRef: '/tmp/lushirong/.rdleader/tasks/seed-work-1.json',
        createdAt: '2026-07-07T13:20:00.000Z',
      },
    ]),
    getRuntimeSessions: vi.fn(async () => [
      {
        sessionId: 'runtime-session-1',
        employeeId: 'lushirong',
        runtimeKind: 'trae_acp',
        status: 'running',
        pid: 456,
        startedAt: '2026-07-07T13:15:00.000Z',
        stoppedAt: null,
      },
    ]),
    getProjectGroups: vi.fn(async () => [
      {
        bindingId: 'group-lushirong-default',
        employeeId: 'lushirong',
        chatId: 'oc_demo_group',
        chatName: '独立端导流项目群',
        status: 'active',
        isDefault: true,
        managerProxyRequired: true,
        lastSyncedAt: null,
      },
    ]),
    createProjectGroup: vi.fn(async (_employeeId: string, payload: {
      chatId: string;
      chatName: string;
      status?: 'active' | 'watching' | 'archived';
      isDefault?: boolean;
      managerProxyRequired?: boolean;
    }) => ({
      bindingId: 'group-lushirong-sync',
      employeeId: 'lushirong',
      chatId: payload.chatId,
      chatName: payload.chatName,
      status: payload.status ?? 'active',
      isDefault: payload.isDefault ?? false,
      managerProxyRequired: payload.managerProxyRequired ?? true,
      lastSyncedAt: '2026-07-07T14:00:00.000Z',
    })),
    updateProjectGroupStatus: vi.fn(async (_employeeId: string, bindingId: string, status: 'active' | 'watching' | 'archived') => ({
      bindingId,
      employeeId: 'lushirong',
      chatId: 'oc_demo_group',
      chatName: bindingId === 'group-lushirong-sync' ? '独立端导流同步群' : '独立端导流项目群',
      status,
      isDefault: bindingId !== 'group-lushirong-default',
      managerProxyRequired: true,
      lastSyncedAt: '2026-07-07T14:01:00.000Z',
    })),
    setDefaultProjectGroup: vi.fn(async (_employeeId: string, bindingId: string) => ({
      bindingId,
      employeeId: 'lushirong',
      chatId: 'oc_growth_sync',
      chatName: '独立端导流同步群',
      status: 'active',
      isDefault: true,
      managerProxyRequired: true,
      lastSyncedAt: '2026-07-07T14:02:00.000Z',
    })),
    getRuntimeResults: vi.fn(async () => [
      {
        eventId: 'runtime-result-1',
        employeeId: 'lushirong',
        workItemId: 'seed-work-1',
        status: 'completed',
        summary: 'Runtime 已完成提单页导流代码改造',
        nextStepSummary: '下一步验证实验结果并同步项目群',
        artifactRefs: ['artifact://patch-collect'],
        sourceFilePath: '/tmp/lushirong/.rdleader/results/result-1.json',
        processedFilePath: '/tmp/lushirong/.rdleader/results-processed/result-1.json',
        createdAt: '2026-07-07T13:30:00.000Z',
      },
    ]),
    createRuntimeDispatch: vi.fn(async (_employeeId: string, payload: {
      workItemId?: string;
      taskTitle: string;
      taskBody: string;
      taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
    }) => ({
      dispatchId: 'dispatch-2',
      employeeId: 'lushirong',
      workItemId: payload.workItemId ?? null,
      taskTitle: payload.taskTitle,
      taskBody: payload.taskBody,
      taskType: payload.taskType,
      status: 'dispatched',
      workspaceTaskRef: '/tmp/lushirong/.rdleader/tasks/dispatch-2.json',
      createdAt: '2026-07-07T13:21:00.000Z',
      runtimeReceipt: {
        workspacePath: '/tmp/lushirong',
        taskFilePath: '/tmp/lushirong/.rdleader/tasks/dispatch-2.json',
        dispatchedAt: '2026-07-07T13:21:00.000Z',
      },
    })),
    startRuntimeAction: vi.fn(async () => ({
      ok: true,
      runtime: {
        employeeId: 'lushirong',
        runtimeKind: 'trae_acp',
        status: 'running',
        pid: 456,
      },
      session: {
        sessionId: 'runtime-session-2',
        employeeId: 'lushirong',
        runtimeKind: 'trae_acp',
        status: 'running',
        pid: 456,
        startedAt: '2026-07-07T13:40:00.000Z',
        stoppedAt: null,
      },
    })),
    stopRuntimeAction: vi.fn(async () => ({
      ok: true,
      runtime: {
        employeeId: 'lushirong',
        runtimeKind: 'trae_acp',
        status: 'stopped',
        pid: null,
      },
      session: {
        sessionId: 'runtime-session-1',
        employeeId: 'lushirong',
        runtimeKind: 'trae_acp',
        status: 'stopped',
        pid: null,
        startedAt: '2026-07-07T13:15:00.000Z',
        stoppedAt: '2026-07-07T13:50:00.000Z',
      },
    })),
    collectRuntimeEventsAction: vi.fn(async () => ({
      ok: true,
      count: 1,
      events: [
        {
          eventId: 'runtime-result-2',
          employeeId: 'lushirong',
          workItemId: 'seed-work-3',
          status: 'completed',
          summary: 'Runtime 已完成同步项目群排期',
          nextStepSummary: '下一步同步老板确认结果',
          artifactRefs: ['artifact://dispatch-result-2'],
          sourceFilePath: '/tmp/lushirong/.rdleader/results/result-2.json',
          processedFilePath: '/tmp/lushirong/.rdleader/results-processed/result-2.json',
          createdAt: '2026-07-07T13:31:00.000Z',
        },
      ],
    })),
  };
});

describe('App', () => {
  beforeEach(() => {
    approvalFixtures.reset();
    vi.clearAllMocks();
  });

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
    expect((await screen.findAllByText('推进提单页导流')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('repo-funshopping-core')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('活跃任务数：3')).toBeTruthy();
    expect(await screen.findByText('经理OpenId：ou_55f68458c1c75e2a257647418efffdc7')).toBeTruthy();
    expect(await screen.findByText('bytedcli --json meego status')).toBeTruthy();
    expect((await screen.findAllByText('围绕导流推进形成了一次新的反思')).length).toBeGreaterThanOrEqual(2);
    expect((await screen.findAllByText('留存风险：low')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('沟通风格：direct')).toBeTruthy();
    expect(await screen.findByText('优先保证提单页导流闭环，再补自然渠道承接，避免两条链路同时失焦。')).toBeTruthy();
    expect((await screen.findAllByText('meego://work-item/123456')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText((content) => content.includes('等待提单页排期确认'))).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('自治学习：开启')).toBeTruthy();
    expect(await screen.findByText('最近结果：success')).toBeTruthy();
    expect(await screen.findByText('提炼出关于导流承接链路的经验')).toBeTruthy();
  });

  it('lets the manager send a message to the selected employee', async () => {
    render(<App />);

    expect(await screen.findByText('最新推理摘要')).toBeTruthy();
    expect((await screen.findAllByText('任务 / 结果产物')).length).toBeGreaterThanOrEqual(2);
    const input = await screen.findByPlaceholderText('给员工发消息');
    fireEvent.change(input, { target: { value: '先给我一个今天的推进列表' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    expect(api.sendManagerMessage).toHaveBeenCalledWith({
      employeeId: 'lushirong',
      body: '先给我一个今天的推进列表',
    });
    expect((await screen.findAllByText('经理')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('员工')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('今天会先把提单页排期和 blocker 收敛给你。')).toBeTruthy();
    expect(await screen.findByText('先拿到排期结论，再决定是否扩展次级链路。')).toBeTruthy();
    expect((await screen.findAllByText('meego://work-item/123456')).length).toBeGreaterThanOrEqual(1);
  });

  it('loads existing persisted manager conversation history', async () => {
    render(<App />);

    await waitFor(() => expect(api.getManagerConversation).toHaveBeenCalledWith('lushirong'));
    expect(await screen.findByText('先给我一个今天的推进列表')).toBeTruthy();
    expect(await screen.findByText('提单页导流先推进，购物车导流今天同步风险。')).toBeTruthy();
    expect(await screen.findByText('先闭环主链路，避免两条链路同时失焦。')).toBeTruthy();
    expect((await screen.findAllByText('doc://tech-review/independent-growth-diversion')).length).toBeGreaterThanOrEqual(1);
  });

  it('shows approvalRequired hints in employee replies', async () => {
    render(<App />);

    expect(await screen.findByText('需要经理批准')).toBeTruthy();
    expect(await screen.findByText('需要批准跨团队资源协调后再继续推进。')).toBeTruthy();
  });

  it('loads approval requests for the selected employee', async () => {
    render(<App />);

    await waitFor(() => expect(api.getApprovalRequests).toHaveBeenCalledWith('lushirong'));
    expect(await screen.findByText('审批请求')).toBeTruthy();
    expect(await screen.findByText('申请协调跨团队资源，先保障提单页导流排期。')).toBeTruthy();
    expect(await screen.findByText('申请临时同步购物车导流风险。')).toBeTruthy();
    expect(await screen.findByText('已批准的技术评审资源协调。')).toBeTruthy();
    expect(await screen.findByText('已拒绝的额外人力申请。')).toBeTruthy();
  });

  it('lets the leader approve a pending approval request', async () => {
    render(<App />);

    const requestCard = (await screen.findByText('申请协调跨团队资源，先保障提单页导流排期。')).closest('article');
    expect(requestCard).toBeTruthy();
    expect(within(requestCard as HTMLElement).getByText('状态：待处理')).toBeTruthy();

    fireEvent.click(await screen.findByRole('button', { name: '批准请求 approval-request-1' }));

    expect(api.decideApprovalRequest).toHaveBeenCalledWith('approval-request-1', 'approved');
    await waitFor(() =>
      expect(within(requestCard as HTMLElement).getByText('状态：已批准')).toBeTruthy(),
    );
    expect(within(requestCard as HTMLElement).queryByRole('button', { name: '批准请求 approval-request-1' })).toBeNull();
  });

  it('lets the leader reject a pending approval request', async () => {
    render(<App />);

    const requestCard = (await screen.findByText('申请临时同步购物车导流风险。')).closest('article');
    expect(requestCard).toBeTruthy();
    expect(within(requestCard as HTMLElement).getByText('状态：待处理')).toBeTruthy();

    fireEvent.click(await screen.findByRole('button', { name: '拒绝请求 approval-request-2' }));

    expect(api.decideApprovalRequest).toHaveBeenCalledWith('approval-request-2', 'rejected');
    await waitFor(() =>
      expect(within(requestCard as HTMLElement).getByText('状态：已拒绝')).toBeTruthy(),
    );
    expect(within(requestCard as HTMLElement).queryByRole('button', { name: '拒绝请求 approval-request-2' })).toBeNull();
  });

  it('lets the manager log a work episode and surface it in the detail view', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('工作记录标题'), {
      target: { value: '收敛提单页导流方案' },
    });
    fireEvent.change(screen.getByPlaceholderText('工作记录摘要'), {
      target: { value: '明确先推进提单页，再补自然渠道承接。' },
    });
    fireEvent.change(screen.getByPlaceholderText('状态，如 in_progress / blocked / done'), {
      target: { value: 'in_progress' },
    });
    fireEvent.change(screen.getByPlaceholderText('当前阻塞项（可选）'), {
      target: { value: '等产品确认优先级' },
    });
    fireEvent.change(screen.getByPlaceholderText('最新推理摘要（可选）'), {
      target: { value: '主链路先闭环，再扩展次级承接。' },
    });
    fireEvent.change(screen.getByPlaceholderText('任务 / 结果产物引用（每行一条）'), {
      target: { value: 'doc://draft/tdl\nmeego://work-item/999' },
    });

    fireEvent.click(screen.getByRole('button', { name: '记录工作片段' }));

    expect(api.createWorkEpisode).toHaveBeenCalledWith('lushirong', {
      title: '收敛提单页导流方案',
      summary: '明确先推进提单页，再补自然渠道承接。',
      status: 'in_progress',
      blocker: '等产品确认优先级',
      reasoningSummary: '主链路先闭环，再扩展次级承接。',
      artifactRefs: ['doc://draft/tdl', 'meego://work-item/999'],
    });
    expect(await screen.findByText((content) => content.includes('收敛提单页导流方案'))).toBeTruthy();
    expect(await screen.findByText('主链路先闭环，再扩展次级承接。')).toBeTruthy();
    expect(await screen.findByText('doc://draft/tdl')).toBeTruthy();
    expect(await screen.findByText('当前阻塞项：等产品确认优先级')).toBeTruthy();
  });

  it('lets the manager add and complete work items while refreshing active assignments', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('任务标题'), {
      target: { value: '新增导流实验' },
    });
    fireEvent.change(screen.getByPlaceholderText('任务摘要'), {
      target: { value: '新增导流实验任务' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加任务' }));

    expect(api.createWorkItem).toHaveBeenCalledWith('lushirong', {
      title: '新增导流实验',
      summary: '新增导流实验任务',
      status: 'active',
    });
    expect(await screen.findByText('新增导流实验 · active')).toBeTruthy();
    expect(await screen.findByText('当前活跃任务数：4')).toBeTruthy();
    expect(await screen.findByText('活跃任务数：4')).toBeTruthy();

    fireEvent.click((await screen.findAllByRole('button', { name: '标记完成' }))[0]!);
    expect(api.updateWorkItemStatus).toHaveBeenCalledWith('manager-work-1', 'completed');
    expect(await screen.findByText('新增导流实验 · completed')).toBeTruthy();
    expect(await screen.findByText('当前活跃任务数：3')).toBeTruthy();
  });

  it('lets the manager dispatch a runtime task tied to a work item', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('Runtime 任务标题'), {
      target: { value: '推进导流代码改造' },
    });
    fireEvent.change(screen.getByPlaceholderText('Runtime 任务内容'), {
      target: { value: '请在隔离工作区里推进提单页导流代码改造' },
    });
    fireEvent.click(screen.getByRole('button', { name: '派发到 Runtime' }));

    expect(api.createRuntimeDispatch).toHaveBeenCalledWith('lushirong', {
      workItemId: 'seed-work-3',
      taskTitle: '推进导流代码改造',
      taskBody: '请在隔离工作区里推进提单页导流代码改造',
      taskType: 'coding',
    });
    expect(await screen.findByText('推进导流代码改造 · coding')).toBeTruthy();
    expect(
      await screen.findByText((content) => content.includes('/tmp/lushirong/.rdleader/tasks/dispatch-2.json')),
    ).toBeTruthy();
  });

  it('lets the manager start and stop runtime while showing session history', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '启动 Runtime' }));
    expect(api.startRuntimeAction).toHaveBeenCalledWith('lushirong');
    expect((await screen.findAllByText('running · pid 456')).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: '停止 Runtime' }));
    expect(api.stopRuntimeAction).toHaveBeenCalledWith('lushirong');
    expect((await screen.findAllByText('stopped · pid -')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('停止：2026-07-07T13:50:00.000Z')).toBeTruthy();
  });

  it('lets the manager collect runtime results and fold them back into visible state', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '收取 Runtime 结果' }));

    expect(api.collectRuntimeEventsAction).toHaveBeenCalledWith('lushirong');
    expect(await screen.findByText('completed · Runtime 已完成同步项目群排期')).toBeTruthy();
    expect(
      (await screen.findAllByText((content) => content.includes('下一步：下一步同步老板确认结果'))).length,
    ).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('结果文件：/tmp/lushirong/.rdleader/results-processed/result-2.json')).toBeTruthy();
    expect((await screen.findAllByText('活跃任务数：2')).length).toBeGreaterThanOrEqual(1);
  });

  it('lets the manager bind and govern project groups for an employee', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('项目群 chat_id'), {
      target: { value: 'oc_growth_sync' },
    });
    fireEvent.change(screen.getByPlaceholderText('项目群名称'), {
      target: { value: '独立端导流同步群' },
    });
    fireEvent.click(screen.getByRole('button', { name: '绑定项目群' }));

    expect(api.createProjectGroup).toHaveBeenCalledWith('lushirong', {
      chatId: 'oc_growth_sync',
      chatName: '独立端导流同步群',
      status: 'active',
      isDefault: false,
      managerProxyRequired: true,
    });
    expect(await screen.findByText('独立端导流同步群（oc_growth_sync）')).toBeTruthy();

    fireEvent.click((await screen.findAllByRole('button', { name: '归档' }))[0]!);
    await waitFor(() =>
      expect(api.updateProjectGroupStatus).toHaveBeenCalledWith('lushirong', 'group-lushirong-default', 'archived'),
    );

    fireEvent.click((await screen.findAllByRole('button', { name: '设为默认群' }))[1]!);
    await waitFor(() =>
      expect(api.setDefaultProjectGroup).toHaveBeenCalledWith('lushirong', 'group-lushirong-sync'),
    );
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

    expect(await screen.findByText('候选人：张三（interviewing）')).toBeTruthy();
  });

  it('lets the manager offer and hire a candidate into a real employee', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('候选人姓名'), {
      target: { value: '张三' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试记录'), {
      target: { value: '老板亲自面试，先看导流方向基础能力' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加候选人' }));
    fireEvent.click(await screen.findByRole('button', { name: '发 Offer' }));

    await waitFor(() => expect(api.updateCandidateDecision).toHaveBeenCalledWith('candidate-1', 'offered'));
    expect(await screen.findByText('候选人：张三（offered）')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('录用员工ID'), {
      target: { value: 'zhangsan' },
    });
    fireEvent.click(screen.getByRole('button', { name: '录用为员工' }));

    await waitFor(() =>
      expect(api.convertCandidateToEmployee).toHaveBeenCalledWith('candidate-1', {
        employeeId: 'zhangsan',
        directionId: 'independent-growth-diversion',
        level: '1-2',
      }),
    );
    expect(await screen.findByText('候选人：张三（hired）')).toBeTruthy();
    expect((await screen.findAllByText('张三')).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the interview requirement when hiring is attempted before any interview is recorded', async () => {
    vi.mocked(api.convertCandidateToEmployee).mockRejectedValueOnce(
      new Error('candidate must have at least one interview before hiring'),
    );

    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('候选人姓名'), {
      target: { value: '张三' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试记录'), {
      target: { value: '老板亲自面试，先看导流方向基础能力' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加候选人' }));
    expect(await screen.findByText('候选人：张三（interviewing）')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('录用员工ID'), {
      target: { value: 'zhangsan' },
    });
    fireEvent.click(screen.getByRole('button', { name: '录用为员工' }));

    await waitFor(() =>
      expect(api.convertCandidateToEmployee).toHaveBeenCalledWith('candidate-1', {
        employeeId: 'zhangsan',
        directionId: 'independent-growth-diversion',
        level: '1-2',
      }),
    );
    expect(await screen.findByText('candidate must have at least one interview before hiring')).toBeTruthy();
  });

  it('lets the manager record a structured interview for a candidate', async () => {
    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('候选人姓名'), {
      target: { value: '张三' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试记录'), {
      target: { value: '老板亲自面试，先看导流方向基础能力' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加候选人' }));
    expect(await screen.findByText('候选人：张三（interviewing）')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('面试候选人'), {
      target: { value: 'candidate-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试轮次'), {
      target: { value: 'manager-round' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试时间'), {
      target: { value: '2026-07-08T14:00:00+08:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试记录摘要'), {
      target: { value: '候选人对导流链路拆解比较清晰，但还要补更多跨团队推进案例。' },
    });
    fireEvent.change(screen.getByPlaceholderText('面试建议（hire / hold / reject）'), {
      target: { value: 'hold' },
    });
    fireEvent.click(screen.getByRole('button', { name: '记录面试' }));

    expect(api.createCandidateInterview).toHaveBeenCalledWith('candidate-1', {
      stage: 'manager-round',
      scheduledAt: '2026-07-08T14:00:00+08:00',
      summary: '候选人对导流链路拆解比较清晰，但还要补更多跨团队推进案例。',
      recommendation: 'hold',
    });
    expect(await screen.findByText('面试：manager-round · hold · 2026-07-08T14:00:00+08:00')).toBeTruthy();
  });

  it('lets the manager promote and fire the selected employee', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '晋升到 2-2' }));
    expect(await screen.findByText('当前职级：2-2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '解雇员工' }));
    expect(await screen.findByText('在职状态：fired')).toBeTruthy();
  });

  it('lets the manager change the selected employee direction and refresh detail immediately', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText('员工方向'), {
      target: { value: 'core-platform' },
    });
    fireEvent.click(screen.getByRole('button', { name: '更新员工方向' }));

    expect(api.updateEmployeeDirection).toHaveBeenCalledWith('lushirong', 'core-platform');
    expect(await screen.findByText('方向：核心平台')).toBeTruthy();
    expect(await screen.findByText('dir-core-platform')).toBeTruthy();
    expect(await screen.findByText('repo-rdleader-web')).toBeTruthy();
  });

  it('lets the manager update direction default knowledge bases and refresh detail immediately', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText('默认知识库（每行一条）'), {
      target: { value: 'dir-independent-growth-diversion\nrepo-rdleader-web\nrepo-engineering-playbook' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存方向知识库配置' }));

    expect(api.updateDirectionConfig).toHaveBeenCalledWith('independent-growth-diversion', {
      defaultKnowledgeBaseIds: [
        'dir-independent-growth-diversion',
        'repo-rdleader-web',
        'repo-engineering-playbook',
      ],
    });
    expect(await screen.findByText('repo-engineering-playbook')).toBeTruthy();
    expect(await screen.findByText('repo-rdleader-web')).toBeTruthy();
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

  it('loads the default brain preview for the selected employee', async () => {
    render(<App />);

    expect(await screen.findByText('脑内预览')).toBeTruthy();
    expect(api.getBrainPreview).toHaveBeenCalledWith('lushirong', 'coding');
    expect(await screen.findByText('当前任务类型：coding')).toBeTruthy();
    expect(await screen.findByText('intent')).toBeTruthy();
    expect(await screen.findByText('优先修复提单页导流链路')).toBeTruthy();
    expect(await screen.findByText('提单页导流排期待确认')).toBeTruthy();
    expect((await screen.findAllByText('repo-funshopping-core')).length).toBeGreaterThanOrEqual(1);
  });

  it('refreshes the brain preview when the manager switches task type', async () => {
    render(<App />);
    await screen.findByText('当前任务类型：coding');

    fireEvent.click(screen.getByRole('button', { name: 'coordination' }));

    expect(await screen.findByText('当前任务类型：coordination')).toBeTruthy();
    expect(api.getBrainPreview).toHaveBeenCalledWith('lushirong', 'coordination');
    expect(await screen.findByText('按coordination任务组织管理动作')).toBeTruthy();
    expect(await screen.findByText('coordination 节奏待同步')).toBeTruthy();
    expect(await screen.findByText('playbook://manager-collab')).toBeTruthy();
  });
});
