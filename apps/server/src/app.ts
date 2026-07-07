import Fastify from 'fastify';
import { assembleTaskContext, type AssembleTaskContextInput } from '@rdleader/brain';
import { buildSeedDirectionKnowledgeRecords, loadEmployeeMemory, type EmployeeMemoryEntry } from '@rdleader/ingest';
import { independentGrowthDiversionDirection, lushirongSeed, zhouyongkangSeed } from '@rdleader/seed';
import { TraeAcpAdapter, type RuntimeAdapter, type RuntimeCollectedEvent, resolveWorkspacePath } from '@rdleader/runtime';
import { createDb } from './db/client';
import { requiresApproval } from '@rdleader/policy';
import type { FeishuProfile } from '@rdleader/domain';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EmployeeRepository } from './repositories/employee-repository';
import { EmployeeProfileRepository } from './repositories/employee-profile-repository';
import { CandidateRepository } from './repositories/candidate-repository';
import { CandidateLifecycleRepository } from './repositories/candidate-lifecycle-repository';
import { InterviewRepository } from './repositories/interview-repository';
import { MessageRepository } from './repositories/message-repository';
import { ReflectionRepository } from './repositories/reflection-repository';
import { LearningRecordRepository } from './repositories/learning-record-repository';
import { ApprovalRequestRepository } from './repositories/approval-request-repository';
import { EmotionEventRepository } from './repositories/emotion-event-repository';
import { PerformanceEventRepository } from './repositories/performance-event-repository';
import { DirectionKnowledgeRepository } from './repositories/direction-knowledge-repository';
import { DirectionConfigRepository } from './repositories/direction-config-repository';
import { ProjectGroupBindingRepository } from './repositories/project-group-binding-repository';
import { ProjectOpsEventRepository } from './repositories/project-ops-event-repository';
import { ResignationEventRepository } from './repositories/resignation-event-repository';
import { ManagerProxyReviewRepository } from './repositories/manager-proxy-review-repository';
import {
  ManagerConversationMessageRepository,
  type ManagerConversationTaskType,
} from './repositories/manager-conversation-message-repository';
import { AutonomySettingsRepository } from './repositories/autonomy-settings-repository';
import { AutonomousLearningRunRepository } from './repositories/autonomous-learning-run-repository';
import { RuntimeDispatchRepository } from './repositories/runtime-dispatch-repository';
import { RuntimeResultEventRepository } from './repositories/runtime-result-event-repository';
import { RuntimeSessionRepository } from './repositories/runtime-session-repository';
import { WorkItemRepository } from './repositories/work-item-repository';
import { WorkEpisodeRepository } from './repositories/work-episode-repository';
import { runAutonomousLearningCycle } from './services/autonomous-learning';
import { startAutonomyScheduler } from './scheduler/autonomy-scheduler';

const execFileAsync = promisify(execFile);

async function detectIntegrationStatus() {
  async function hasBinary(command: string): Promise<boolean> {
    try {
      await execFileAsync('bash', ['-lc', `command -v ${command}`]);
      return true;
    } catch {
      return false;
    }
  }

  const [traeAcpInstalled, codexInstalled, bytedcliInstalled, larkCliInstalled] = await Promise.all([
    hasBinary('trae-cli'),
    hasBinary('codex'),
    hasBinary('bytedcli'),
    hasBinary('lark-cli'),
  ]);

  return {
    traeAcp: traeAcpInstalled ? 'ready' : 'missing',
    codex: codexInstalled ? 'installed' : 'missing',
    bytedcli: bytedcliInstalled ? 'ready' : 'missing',
    larkCli: larkCliInstalled ? 'ready' : 'missing',
  };
}

async function loadBytedcliAuth() {
  const { stdout } = await execFileAsync('bytedcli', ['--json', 'auth', 'status']);
  const payload = JSON.parse(stdout);
  return {
    authenticated: payload?.data?.authenticated ?? false,
    identity: payload?.data?.bytecloud_auth?.identity?.email ?? '',
  };
}

async function loadLarkAuth() {
  const { stdout } = await execFileAsync('lark-cli', ['auth', 'status', '--json', '--verify']);
  const payload = JSON.parse(stdout);
  return {
    verified: payload?.verified ?? false,
    userName: payload?.identities?.user?.userName ?? '',
    openId: payload?.identities?.user?.openId ?? '',
  };
}

async function loadMeegoAuth() {
  const { stdout } = await execFileAsync('bytedcli', ['--json', 'meego', 'status']);
  const payload = JSON.parse(stdout);
  return {
    authenticated: payload?.data?.authenticated ?? false,
    endpoint: payload?.data?.endpoint ?? '',
    toolCount: payload?.data?.tool_count ?? 0,
  };
}

async function lookupMeegoWorkitem(input: { lookupType: 'id' | 'title'; query: string }) {
  const args = ['--json', 'meego', 'workitem', 'get', '--work-item-id', input.query];
  const { stdout } = await execFileAsync('bytedcli', args);
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildMeegoWorkitemLookupCommand(input: { lookupType: 'id' | 'title'; query: string }) {
  return ['bytedcli', '--json', 'meego', 'workitem', 'get', '--work-item-id', input.query];
}

function buildMeegoWorkitemUpdateCommand(input: {
  workItemId: string;
  projectKey: string;
  fields: string;
}) {
  return [
    'bytedcli',
    '--json',
    'meego',
    'workitem',
    'update',
    '--project-key',
    input.projectKey,
    '--work-item-id',
    input.workItemId,
    '--fields',
    input.fields,
  ];
}

async function updateMeegoWorkitem(input: {
  workItemId: string;
  projectKey: string;
  fields: string;
}) {
  const command = buildMeegoWorkitemUpdateCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildMeegoCommentCreateCommand(input: {
  workItemId: string;
  projectKey: string;
  commentContent: string;
}) {
  return [
    'bytedcli',
    '--json',
    'meego',
    'comment',
    'create',
    '--project-key',
    input.projectKey,
    '--work-item-id',
    input.workItemId,
    '--comment-content',
    input.commentContent,
  ];
}

async function createMeegoComment(input: {
  workItemId: string;
  projectKey: string;
  commentContent: string;
}) {
  const command = buildMeegoCommentCreateCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildTechReviewDocContent(input: {
  title: string;
  problem: string;
  nextSteps: string[];
}) {
  const steps = input.nextSteps.map((step) => `<li>${escapeXml(step)}</li>`).join('');
  return `<title>${escapeXml(input.title)}</title><h1>背景</h1><p>${escapeXml(
    input.problem,
  )}</p><h1>下一步</h1><ul>${steps}</ul>`;
}

function buildTechReviewDocCommand(input: {
  title: string;
  problem: string;
  nextSteps: string[];
}) {
  return [
    'lark-cli',
    'docs',
    '+create',
    '--as',
    'user',
    '--title',
    input.title,
    '--content',
    buildTechReviewDocContent(input),
    '--json',
  ];
}

async function createTechReviewDoc(input: {
  title: string;
  problem: string;
  nextSteps: string[];
}) {
  const command = buildTechReviewDocCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildTechReviewMeetingCommand(input: {
  summary: string;
  description: string;
  start: string;
  end: string;
  attendeeIds: string[];
}) {
  return [
    'lark-cli',
    'calendar',
    '+create',
    '--as',
    'user',
    '--summary',
    input.summary,
    '--description',
    input.description,
    '--start',
    input.start,
    '--end',
    input.end,
    '--attendee-ids',
    input.attendeeIds.join(','),
    '--json',
  ];
}

async function createTechReviewMeeting(input: {
  summary: string;
  description: string;
  start: string;
  end: string;
  attendeeIds: string[];
}) {
  const command = buildTechReviewMeetingCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

async function searchFeishuChat(input: { query: string }) {
  const command = ['lark-cli', 'im', '+chat-search', '--as', 'bot', '--query', input.query, '--json'];
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildFeishuChatSearchCommand(input: { query: string }) {
  return ['lark-cli', 'im', '+chat-search', '--as', 'bot', '--query', input.query, '--json'];
}

function buildFeishuAgentSetupProfileName(employeeId: string) {
  return `rdleader-${employeeId}`;
}

function buildFeishuAgentCreateCommand(employeeId: string) {
  return ['lark-cli', 'config', 'init', '--new', '--name', buildFeishuAgentSetupProfileName(employeeId)];
}

function buildFeishuAgentBindCommand(input: {
  appId: string;
  agentSource?: string;
  identityPreset?: string;
}) {
  return [
    'lark-cli',
    'config',
    'bind',
    '--source',
    input.agentSource ?? 'lark-channel',
    '--app-id',
    input.appId,
    '--identity',
    input.identityPreset ?? 'bot-only',
  ];
}

function buildFeishuAgentBindCommandPreview() {
  return buildFeishuAgentBindCommand({ appId: '<appId>' });
}

function normalizeFeishuProfile(profile: FeishuProfile, fallbackBotName: string): Required<Pick<FeishuProfile, 'dmPolicy' | 'botName' | 'botOpenId' | 'bindingStatus' | 'chatMode' | 'identityPreset' | 'agentSource' | 'setupProfileName'>> & FeishuProfile {
  const botName = profile.botName || fallbackBotName;
  return {
    ...profile,
    dmPolicy: 'manager-only',
    botName,
    botOpenId: profile.botOpenId || 'pending',
    bindingStatus: profile.bindingStatus ?? (profile.appId ? 'bound' : 'unbound'),
    chatMode: profile.chatMode ?? 'mention',
    identityPreset: profile.identityPreset ?? 'bot-only',
    agentSource: profile.agentSource ?? 'lark-channel',
    setupProfileName: profile.setupProfileName ?? '',
  };
}

function buildManagerDmCommand(input: {
  managerOpenId: string;
  employeeDisplayName: string;
  body: string;
}) {
  return [
    'lark-cli',
    'im',
    '+messages-send',
    '--as',
    'bot',
    '--user-id',
    input.managerOpenId,
    '--text',
    `【RDLeader·${input.employeeDisplayName}】${input.body}`,
    '--json',
  ];
}

async function sendManagerDm(input: {
  managerOpenId: string;
  employeeDisplayName: string;
  body: string;
}) {
  const command = buildManagerDmCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildGroupMessageCommand(input: {
  chatId: string;
  employeeDisplayName: string;
  body: string;
}) {
  return [
    'lark-cli',
    'im',
    '+messages-send',
    '--as',
    'bot',
    '--chat-id',
    input.chatId,
    '--text',
    `【RDLeader·${input.employeeDisplayName}】${input.body}`,
    '--json',
  ];
}

async function sendGroupMessage(input: {
  chatId: string;
  employeeDisplayName: string;
  body: string;
}) {
  const command = buildGroupMessageCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || isStringArray(value);
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)));
}

function classifyManagerChatTaskType(messageBody: string): ManagerConversationTaskType {
  const normalized = messageBody.toLowerCase();

  if (/(复盘|回顾|总结|反思)/.test(messageBody)) {
    return 'reflection';
  }

  if (/(发群|群里|comment|评论|schedule|排期|拉会|会议|create doc|文档|doc|update status|meego)/.test(normalized + messageBody)) {
    return 'collaboration';
  }

  if (/(代码|修复|联调|实现|开发|方案)/.test(messageBody)) {
    return 'coding';
  }

  if (/(状态|进展|同步|汇报|给我看|下一步|拆)/.test(messageBody)) {
    return 'status';
  }

  return 'coordination';
}

function extractArtifactRefsFromBody(messageBody: string) {
  return Array.from(messageBody.matchAll(/\b[a-z]+:\/\/[^\s，。；,;]+/gi), (match) => match[0]);
}

function buildApprovalHint(messageBody: string) {
  const normalized = messageBody.toLowerCase();
  const riskyKeywords = [
    { pattern: /meego/, label: 'Meego 状态或字段更新' },
    { pattern: /发群|群里/, label: '群消息发送' },
    { pattern: /comment|评论/, label: '评论写入' },
    { pattern: /schedule|排期|拉会|会议/, label: '会议日程操作' },
    { pattern: /create doc|建文档|创建文档|doc/, label: '文档创建' },
    { pattern: /update status|更新状态/, label: '状态更新' },
  ].filter((item) => item.pattern.test(normalized + messageBody));

  const approvalRequired =
    riskyKeywords.length > 0 && requiresApproval({ kind: 'mutate-external', target: 'external-system' });

  return {
    approvalRequired,
    approvalSummary: approvalRequired
      ? `涉及${riskyKeywords.map((item) => item.label).join('、')}等外部变更动作，需要经理明确审批后再执行。`
      : null,
  };
}

function isBrainPreviewTaskType(value: unknown): value is AssembleTaskContextInput['taskType'] {
  return ['coding', 'coordination', 'status', 'reflection', 'collaboration'].includes(String(value));
}

function buildDefaultEmployeeProfile(input: {
  employeeId: string;
  displayName: string;
  managerId: string;
}) {
  return {
    employeeId: input.employeeId,
    managerId: input.managerId,
    riskFlags: [],
    personaProfile: {
      communicationTone: 'structured' as const,
      ownershipBias: 'medium' as const,
      conflictTolerance: 'medium' as const,
      pressureResponse: 'steady' as const,
      confidenceBaseline: 'steady' as const,
      collaborationStyle: 'proactive' as const,
      escalationPreference: 'normal' as const,
    },
    emotionTriggers: ['新环境适应中'],
    feishuProfile: {
      dmPolicy: 'manager-only' as const,
      botName: input.displayName,
      botOpenId: 'pending',
    },
  };
}

function buildDefaultEmployeeRow(input: {
  employeeId: string;
  displayName: string;
  level: '1-2' | '2-1' | '2-2';
  directionId: string;
}) {
  return {
    employeeId: input.employeeId,
    displayName: input.displayName,
    level: input.level,
    employmentStatus: 'active' as const,
    directionId: input.directionId,
    recentDoneSummary: '新员工已入职，等待领取首个任务',
    nextStepSummary: '完成环境熟悉并领取首个任务',
    workspacePath: resolveWorkspacePath(input.employeeId),
    runtimeKind: 'trae_acp' as const,
    resignationIntent: 'low',
    emotionCurrent: 'focused',
    emotionIntensity: 0.18,
    emotionSummary: '新员工刚完成入职，正在适应团队节奏',
    deliveryTrend: 'flat',
    communicationQuality: 'ok',
    blockerHandling: 'ok',
    reviewQuality: 'ok',
    promotionReadiness: 'watch',
    retentionRisk: 'low',
    reliabilityScore: 0.6,
  };
}

export async function buildApp(options: {
  databaseUrl: string;
  memoryLoader?: (employeeId: 'lushirong' | 'zhouyongkang') => Promise<EmployeeMemoryEntry[]>;
  now?: () => Date;
  integrationStatusLoader?: () => Promise<{
    traeAcp: string;
    codex: string;
    bytedcli: string;
    larkCli: string;
  }>;
  bytedcliAuthLoader?: () => Promise<{
    authenticated: boolean;
    identity: string;
  }>;
  larkAuthLoader?: () => Promise<{
    verified: boolean;
    userName: string;
    openId: string;
  }>;
  meegoAuthLoader?: () => Promise<{
    authenticated: boolean;
    endpoint: string;
    toolCount: number;
  }>;
  meegoWorkitemLookup?: (input: {
    lookupType: 'id' | 'title';
    query: string;
  }) => Promise<unknown>;
  meegoWorkitemUpdate?: (input: {
    workItemId: string;
    projectKey: string;
    fields: string;
  }) => Promise<unknown>;
  meegoCommentCreate?: (input: {
    workItemId: string;
    projectKey: string;
    commentContent: string;
  }) => Promise<unknown>;
  larkDocCreator?: (input: {
    title: string;
    problem: string;
    nextSteps: string[];
  }) => Promise<unknown>;
  larkCalendarEventCreator?: (input: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendeeIds: string[];
  }) => Promise<unknown>;
  feishuChatSearch?: (input: {
    query: string;
  }) => Promise<unknown>;
  larkManagerDmSender?: (input: {
    managerOpenId: string;
    employeeDisplayName: string;
    body: string;
  }) => Promise<unknown>;
  larkGroupMessageSender?: (input: {
    chatId: string;
    employeeDisplayName: string;
    body: string;
  }) => Promise<unknown>;
  runtimeAdapter?: RuntimeAdapter;
  autonomyScheduler?: {
    enabled?: boolean;
    intervalMs?: number;
  };
}) {
  const app = Fastify();
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'content-type,authorization');

    if (request.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  });

  const sqlite = createDb(options.databaseUrl);
  const employeeRepository = new EmployeeRepository(sqlite);
  const employeeProfileRepository = new EmployeeProfileRepository(sqlite);
  const candidateRepository = new CandidateRepository(sqlite);
  const candidateLifecycleRepository = new CandidateLifecycleRepository(sqlite);
  const interviewRepository = new InterviewRepository(sqlite);
  const messageRepository = new MessageRepository(sqlite);
  const reflectionRepository = new ReflectionRepository(sqlite);
  const learningRecordRepository = new LearningRecordRepository(sqlite);
  const approvalRequestRepository = new ApprovalRequestRepository(sqlite);
  const emotionEventRepository = new EmotionEventRepository(sqlite);
  const performanceEventRepository = new PerformanceEventRepository(sqlite);
  const directionKnowledgeRepository = new DirectionKnowledgeRepository(sqlite);
  const directionConfigRepository = new DirectionConfigRepository(sqlite);
  const projectGroupBindingRepository = new ProjectGroupBindingRepository(sqlite);
  const projectOpsEventRepository = new ProjectOpsEventRepository(sqlite);
  const resignationEventRepository = new ResignationEventRepository(sqlite);
  const managerProxyReviewRepository = new ManagerProxyReviewRepository(sqlite);
  const managerConversationMessageRepository = new ManagerConversationMessageRepository(sqlite);
  const autonomySettingsRepository = new AutonomySettingsRepository(sqlite);
  const autonomousLearningRunRepository = new AutonomousLearningRunRepository(sqlite);
  const runtimeDispatchRepository = new RuntimeDispatchRepository(sqlite);
  const runtimeResultEventRepository = new RuntimeResultEventRepository(sqlite);
  const runtimeSessionRepository = new RuntimeSessionRepository(sqlite);
  const workItemRepository = new WorkItemRepository(sqlite);
  const workEpisodeRepository = new WorkEpisodeRepository(sqlite);
  const runtime = options.runtimeAdapter ?? new TraeAcpAdapter('/Users/bytedance/.local/bin/trae-cli');
  const memoryLoader = options.memoryLoader ?? loadEmployeeMemory;
  const now = options.now ?? (() => new Date());
  const integrationStatusLoader = options.integrationStatusLoader ?? detectIntegrationStatus;
  const bytedcliAuthLoader = options.bytedcliAuthLoader ?? loadBytedcliAuth;
  const larkAuthLoader = options.larkAuthLoader ?? loadLarkAuth;
  const meegoAuthLoader = options.meegoAuthLoader ?? loadMeegoAuth;
  const meegoWorkitemLookup = options.meegoWorkitemLookup ?? lookupMeegoWorkitem;
  const meegoWorkitemUpdate = options.meegoWorkitemUpdate ?? updateMeegoWorkitem;
  const meegoCommentCreate = options.meegoCommentCreate ?? createMeegoComment;
  const larkDocCreator = options.larkDocCreator ?? createTechReviewDoc;
  const larkCalendarEventCreator = options.larkCalendarEventCreator ?? createTechReviewMeeting;
  const feishuChatSearch = options.feishuChatSearch ?? searchFeishuChat;
  const larkManagerDmSender = options.larkManagerDmSender ?? sendManagerDm;
  const larkGroupMessageSender = options.larkGroupMessageSender ?? sendGroupMessage;
  const seedEmployees = [structuredClone(lushirongSeed), structuredClone(zhouyongkangSeed)];
  const seedDirectionConfigs = [
    {
      directionId: independentGrowthDiversionDirection.directionId,
      displayName: independentGrowthDiversionDirection.displayName,
      defaultKnowledgeBaseIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds,
      defaultRepoIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds.filter((id) => id.startsWith('repo-')),
      commonDocumentRefs: [],
      routingHints: [],
    },
  ];

  directionConfigRepository.seed(seedDirectionConfigs);
  projectGroupBindingRepository.seed([
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
    {
      bindingId: 'group-zhouyongkang-default',
      employeeId: 'zhouyongkang',
      chatId: 'oc_demo_group',
      chatName: '独立端导流项目群',
      status: 'active',
      isDefault: true,
      managerProxyRequired: true,
      lastSyncedAt: null,
    },
  ]);
  employeeRepository.seed(seedEmployees);
  employeeProfileRepository.seed(seedEmployees);
  directionKnowledgeRepository.seed(buildSeedDirectionKnowledgeRecords());
  for (const employee of seedEmployees) {
    autonomySettingsRepository.getOrCreate(employee.employeeId, now().toISOString());
    workItemRepository.seedAssignments(employee.employeeId, employee.currentAssignments, now().toISOString());
  }

  const summarizeEmployees = () =>
    employeeRepository.list().map((employee) => ({
      ...employee,
      activeTaskCount: workItemRepository.listOpenForEmployee(employee.employeeId).length,
    }));
  const getEmployee = (employeeId: string) => employeeRepository.get(employeeId);
  const getEmployeeProfile = (employeeId: string) => employeeProfileRepository.get(employeeId);
  const getCurrentAssignments = (employeeId: string) => workItemRepository.listOpenForEmployee(employeeId).map((item) => item.title);
  const listRecentApprovalRequests = (employeeId: string) => approvalRequestRepository.listForEmployee(employeeId).slice(0, 5);
  const listRuntimeSessions = (employeeId: string) => runtimeSessionRepository.listForEmployee(employeeId).slice(0, 10);
  const listRecentRuntimeResults = (employeeId: string) => runtimeResultEventRepository.listForEmployee(employeeId).slice(0, 10);
  const buildWorkEpisodeObservability = (employeeId: string) => {
    const recentWorkEpisodes = workEpisodeRepository.listForEmployee(employeeId);
    const currentBlockers = Array.from(
      new Set(
        recentWorkEpisodes
          .filter((episode) => (episode.status === 'active' || episode.status === 'blocked') && episode.blocker?.trim())
          .map((episode) => episode.blocker!.trim()),
      ),
    );

    return {
      recentWorkEpisodes: recentWorkEpisodes.slice(0, 5),
      currentBlockers,
      latestReasoningSummary: recentWorkEpisodes.find((episode) => episode.reasoningSummary?.trim())?.reasoningSummary,
      latestArtifacts: recentWorkEpisodes.find((episode) => episode.artifactRefs.length > 0)?.artifactRefs ?? [],
    };
  };
  const buildBrainPreview = (employeeId: string, taskType: AssembleTaskContextInput['taskType']) => {
    const employeeRow = getEmployee(employeeId);
    const employeeProfile = getEmployeeProfile(employeeId);

    if (!employeeRow || !employeeProfile) {
      return undefined;
    }

    const directionConfig = directionConfigRepository.get(employeeRow.directionId);
    const workObservability = buildWorkEpisodeObservability(employeeId);
    const recentReflections = reflectionRepository.listForEmployee(employeeId).slice(0, 5);
    const recentLearningRecords = learningRecordRepository.listForEmployee(employeeId).slice(0, 5);
    const recentDirectionKnowledge = directionKnowledgeRepository.listForDirection(employeeRow.directionId).slice(0, 5);
    const recentManagerReviews = managerProxyReviewRepository.listForEmployee(employeeId).slice(0, 5);

    const workingMemory = uniqueStrings([
      ...getCurrentAssignments(employeeId).map((assignment) => `当前任务：${assignment}`),
      `最近完成：${employeeRow.recentDoneSummary}`,
      `下一步：${employeeRow.nextStepSummary}`,
      ...workObservability.currentBlockers.map((blocker) => `阻塞：${blocker}`),
      ...(workObservability.latestReasoningSummary ? [`推理摘要：${workObservability.latestReasoningSummary}`] : []),
    ]);

    const episodicMemory = uniqueStrings([
      ...workObservability.recentWorkEpisodes.map((episode) =>
        `工作片段：${episode.status} · ${episode.title} · ${episode.summary}${episode.blocker ? ` · 阻塞：${episode.blocker}` : ''}`,
      ),
      ...recentManagerReviews.map((review) => `经理代理评审：${review.reviewTopic} · ${review.conclusion}`),
      ...recentReflections.map((reflection) => `反思：${reflection.summary}`),
    ]);

    const knowledgeItems = uniqueStrings([
      ...(directionConfig?.defaultKnowledgeBaseIds ?? []),
      ...(directionConfig?.defaultRepoIds ?? []),
      ...(directionConfig?.commonDocumentRefs ?? []),
      ...(directionConfig?.routingHints ?? []).map((hint) => `routing:${hint}`),
      ...recentLearningRecords.map((record) => `学习记录：${record.title}`),
      ...recentDirectionKnowledge.map((record) => `方向知识：${record.title}`),
    ]);

    const employeeContext = {
      employeeId: employeeRow.employeeId,
      displayName: employeeRow.displayName,
      directionId: employeeRow.directionId,
      personaProfile: employeeProfile.personaProfile,
      emotionState: {
        current: employeeRow.emotionCurrent,
        intensity: employeeRow.emotionIntensity,
        triggers: employeeProfile.emotionTriggers,
        summary: employeeRow.emotionSummary,
      },
      performanceState: {
        deliveryTrend: employeeRow.deliveryTrend,
        communicationQuality: employeeRow.communicationQuality,
        blockerHandling: employeeRow.blockerHandling,
        reviewQuality: employeeRow.reviewQuality,
        promotionReadiness: employeeRow.promotionReadiness,
        retentionRisk: employeeRow.retentionRisk,
        reliabilityScore: employeeRow.reliabilityScore,
      },
    };

    const assembled = assembleTaskContext({
      employee: employeeContext,
      taskType,
      workingMemory,
      episodicMemory,
      knowledgeItems,
    });

    return {
      employeeId,
      taskType,
      layers: assembled.layers,
      inputsPreview: {
        workingMemory,
        episodicMemory,
        knowledgeItems,
      },
    };
  };
  const buildManagerConversationReply = (employeeId: string, managerMessageBody: string) => {
    const employeeRow = getEmployee(employeeId);
    const employeeProfile = getEmployeeProfile(employeeId);

    if (!employeeRow || !employeeProfile) {
      return undefined;
    }

    const taskType = classifyManagerChatTaskType(managerMessageBody);
    const preview = buildBrainPreview(employeeId, taskType);
    const workObservability = buildWorkEpisodeObservability(employeeId);
    const approvalHint = buildApprovalHint(managerMessageBody);
    const artifactRefs = uniqueStrings([
      ...extractArtifactRefsFromBody(managerMessageBody),
      ...workObservability.latestArtifacts,
    ]).slice(0, 5);
    const blockerText = workObservability.currentBlockers[0] ?? '当前没有新增阻塞';
    const reasoningSummary =
      workObservability.latestReasoningSummary ??
      preview?.inputsPreview.workingMemory.find((item) => item.startsWith('推理摘要：'))?.replace('推理摘要：', '') ??
      `${employeeRow.displayName}会先按当前工作上下文收敛问题，再给出可执行拆解。`;
    const toneLead =
      employeeProfile.personaProfile.communicationTone === 'structured'
        ? `${employeeRow.displayName}收到，我按结构同步一下：`
        : `${employeeRow.displayName}收到，我先直接说结论：`;
    const nextStep = employeeRow.nextStepSummary;
    const currentAssignments = getCurrentAssignments(employeeId);
    const statusLine = `现在我这边主要在推进${currentAssignments[0] ?? '当前事项'}，下一步是${nextStep}。`;
    const blockerLine =
      blockerText === '当前没有新增阻塞'
        ? '当前没有新的外部卡点，我会直接往下推进。'
        : `当前卡点是${blockerText}，我会先把这个点收敛掉。`;
    const reasoningLine = `我的判断依据是：${reasoningSummary}`;
    const approvalLine = approvalHint.approvalRequired
      ? `这条指令涉及外部动作，${approvalHint.approvalSummary} 我会先等你明确批准再执行。`
      : '我先按这个方向拆好可执行项，再把结果同步给你。';

    return {
      taskType,
      artifactRefs,
      reasoningSummary,
      approvalRequired: approvalHint.approvalRequired,
      approvalSummary: approvalHint.approvalSummary,
      body: [toneLead, statusLine, blockerLine, `下一步我会先推进：${nextStep}。`, reasoningLine, approvalLine].join(' '),
      preview,
    };
  };
  const runEmployeeAutonomousLearning = async (employeeId: string, trigger: string) => {
    const employee = getEmployee(employeeId);
    if (!employee) {
      return undefined;
    }

    return runAutonomousLearningCycle({
      employee,
      trigger,
      now,
      loadMemory: () => memoryLoader(employee.employeeId as 'lushirong' | 'zhouyongkang'),
      autonomySettingsRepository,
      autonomousLearningRunRepository,
      reflectionRepository,
      learningRecordRepository,
      directionKnowledgeRepository,
    });
  };
  const runDueAutonomousLearningCycles = async (trigger: string = 'due_cycle') => {
    const dueSettings = autonomySettingsRepository.listDue(now().toISOString());
    const runs: Awaited<ReturnType<typeof runAutonomousLearningCycle>>[] = [];

    for (const settings of dueSettings) {
      const run = await runEmployeeAutonomousLearning(settings.employeeId, trigger);
      if (run) {
        runs.push(run);
      }
    }

    return runs;
  };
  const collectEmployeeRuntimeEvents = async (employeeId: string) => {
    const employee = getEmployee(employeeId);
    if (!employee) {
      return undefined;
    }

    const events = await runtime.collectRuntimeEvents(employeeId);
    const persisted = events.map((event) => {
      const saved = runtimeResultEventRepository.create({
        employeeId: event.employeeId,
        dispatchId: event.dispatchId ?? null,
        workItemId: event.workItemId ?? null,
        status: event.status,
        summary: event.summary,
        nextStepSummary: event.nextStepSummary ?? null,
        artifactRefs: event.artifactRefs,
        sourceFilePath: event.sourceFilePath,
        processedFilePath: event.processedFilePath,
        createdAt: event.createdAt,
      });

      if (event.workItemId) {
        const nextWorkStatus = event.status === 'completed' ? 'completed' : 'blocked';
        workItemRepository.updateStatus(event.workItemId, nextWorkStatus, event.createdAt);
      }

      employeeRepository.updateWorkState(employeeId, {
        recentDoneSummary: event.summary,
        nextStepSummary: event.nextStepSummary ?? employee.nextStepSummary,
      });

      workEpisodeRepository.create(
        {
          employeeId,
          title: event.workItemId ? `Runtime 结果 · ${event.workItemId}` : 'Runtime 结果回流',
          summary: event.summary,
          status: event.status === 'completed' ? 'completed' : 'blocked',
          blocker: event.status === 'blocked' || event.status === 'failed' ? event.summary : null,
          reasoningSummary: event.nextStepSummary ?? null,
          artifactRefs: event.artifactRefs,
        },
        event.createdAt,
      );

      return saved;
    });

    return persisted;
  };

  let stopAutonomyScheduler = () => {};
  app.addHook('onReady', async () => {
    stopAutonomyScheduler = startAutonomyScheduler({
      enabled: options.autonomyScheduler?.enabled ?? false,
      intervalMs: options.autonomyScheduler?.intervalMs ?? 60_000,
      runDueCycles: () => runDueAutonomousLearningCycles('scheduler'),
      onError: (error) => app.log.error(error),
    });
  });
  app.addHook('onClose', async () => {
    stopAutonomyScheduler();
  });

  app.get('/health', async () => ({ ok: true }));
  app.get('/integrations/status', async () => integrationStatusLoader());
  app.get('/integrations/bytedcli/auth', async () => bytedcliAuthLoader());
  app.get('/integrations/lark/auth', async () => larkAuthLoader());
  app.get('/integrations/meego/auth', async () => meegoAuthLoader());
  app.get('/directions', async () => directionConfigRepository.list());
  app.get('/directions/:directionId/config', async (request, reply) => {
    const { directionId } = request.params as { directionId: string };
    const config = directionConfigRepository.get(directionId);

    if (!config) {
      return reply.code(404).send({ message: 'direction config not found' });
    }

    return config;
  });
  app.post('/directions/:directionId/config', async (request, reply) => {
    const { directionId } = request.params as { directionId: string };
    const body = request.body as {
      displayName?: string;
      defaultKnowledgeBaseIds?: unknown;
      defaultRepoIds?: unknown;
      commonDocumentRefs?: unknown;
      routingHints?: unknown;
    };

    if (
      !isOptionalStringArray(body.defaultKnowledgeBaseIds) ||
      !isOptionalStringArray(body.defaultRepoIds) ||
      !isOptionalStringArray(body.commonDocumentRefs) ||
      !isOptionalStringArray(body.routingHints)
    ) {
      return reply
        .code(400)
        .send({ message: 'defaultKnowledgeBaseIds, defaultRepoIds, commonDocumentRefs, and routingHints must be string arrays' });
    }

    const existingConfig = directionConfigRepository.get(directionId);
    if (!existingConfig && !body.displayName?.trim()) {
      return reply.code(400).send({ message: 'displayName is required' });
    }

    return directionConfigRepository.upsert({
      directionId,
      displayName: body.displayName?.trim() ?? existingConfig?.displayName ?? directionId,
      defaultKnowledgeBaseIds: body.defaultKnowledgeBaseIds ?? existingConfig?.defaultKnowledgeBaseIds ?? [],
      defaultRepoIds: body.defaultRepoIds ?? existingConfig?.defaultRepoIds ?? [],
      commonDocumentRefs: body.commonDocumentRefs ?? existingConfig?.commonDocumentRefs ?? [],
      routingHints: body.routingHints ?? existingConfig?.routingHints ?? [],
    });
  });
  app.get('/employees', async () => summarizeEmployees());
  app.get('/employees/:employeeId', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employeeRow = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employeeRow || !employeeProfile) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const directionConfig = directionConfigRepository.get(employeeRow.directionId);
    const memory =
      employeeId === 'lushirong' || employeeId === 'zhouyongkang'
        ? await memoryLoader(employeeId)
        : [];

    return {
      employeeId: employeeRow.employeeId,
      displayName: employeeRow.displayName,
      directionId: employeeRow.directionId,
      currentAssignments: getCurrentAssignments(employeeId),
      level: employeeRow.level,
      employmentStatus: employeeRow.employmentStatus,
      recentDoneSummary: employeeRow.recentDoneSummary,
      nextStepSummary: employeeRow.nextStepSummary,
      workspacePath: employeeRow.workspacePath,
      runtimeKind: employeeRow.runtimeKind,
      defaultKnowledgeBaseIds: directionConfig?.defaultKnowledgeBaseIds ?? [],
      directionConfig: directionConfig ?? null,
      riskFlags: employeeProfile.riskFlags,
      personaProfile: employeeProfile.personaProfile,
      feishuProfile: employeeProfile.feishuProfile,
      projectGroups: projectGroupBindingRepository.listForEmployee(employeeId),
      emotionState: {
        current: employeeRow.emotionCurrent,
        intensity: employeeRow.emotionIntensity,
        triggers: employeeProfile.emotionTriggers,
        summary: employeeRow.emotionSummary,
      },
      performanceState: {
        deliveryTrend: employeeRow.deliveryTrend,
        communicationQuality: employeeRow.communicationQuality,
        blockerHandling: employeeRow.blockerHandling,
        reviewQuality: employeeRow.reviewQuality,
        promotionReadiness: employeeRow.promotionReadiness,
        retentionRisk: employeeRow.retentionRisk,
        reliabilityScore: employeeRow.reliabilityScore,
      },
      resignationIntent:
        employeeRow.resignationIntent,
      latestLearningRecordId: learningRecordRepository.listForEmployee(employeeId)[0]?.recordId,
      ...buildWorkEpisodeObservability(employeeId),
      runtimeSessions: listRuntimeSessions(employeeId),
      recentRuntimeResults: listRecentRuntimeResults(employeeId),
      runtime: await runtime.heartbeat(employeeRow.employeeId),
      memory,
      conversations: managerConversationMessageRepository.listForEmployee(employeeId).slice(-5),
      recentApprovalRequests: listRecentApprovalRequests(employeeId),
    };
  });

  app.get('/employees/:employeeId/memory', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (employeeId !== 'lushirong' && employeeId !== 'zhouyongkang') {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return memoryLoader(employeeId);
  });

  app.get('/employees/:employeeId/brain-preview', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const taskType = (request.query as { taskType?: unknown }).taskType ?? 'coding';

    if (!isBrainPreviewTaskType(taskType)) {
      return reply.code(400).send({ message: 'invalid taskType' });
    }

    const preview = buildBrainPreview(employeeId, taskType);
    if (!preview) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return preview;
  });

  app.get('/employees/:employeeId/work-episodes', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return workEpisodeRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/work-items', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return workItemRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/project-groups', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return projectGroupBindingRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/runtime-dispatches', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return runtimeDispatchRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/runtime-sessions', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return runtimeSessionRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/runtime-results', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return runtimeResultEventRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/manager-conversation', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return managerConversationMessageRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/approval-requests', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return approvalRequestRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/work-episodes', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      title?: string;
      summary?: string;
      status?: string;
      blocker?: string | null;
      reasoningSummary?: string | null;
      artifactRefs?: string[];
    };

    if (!body.title?.trim() || !body.summary?.trim() || !body.status?.trim()) {
      return reply.code(400).send({ message: 'title, summary, and status are required' });
    }

    if (
      body.artifactRefs !== undefined &&
      (!Array.isArray(body.artifactRefs) || body.artifactRefs.some((artifactRef) => typeof artifactRef !== 'string'))
    ) {
      return reply.code(400).send({ message: 'artifactRefs must be a string array' });
    }

    const episode = workEpisodeRepository.create(
      {
        employeeId,
        title: body.title,
        summary: body.summary,
        status: body.status,
        blocker: body.blocker,
        reasoningSummary: body.reasoningSummary,
        artifactRefs: body.artifactRefs,
      },
      now().toISOString(),
    );

    return reply.code(201).send(episode);
  });

  app.post('/employees/:employeeId/work-items', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      title?: string;
      summary?: string;
      status?: string;
    };

    if (!body.title?.trim() || !body.summary?.trim()) {
      return reply.code(400).send({ message: 'title and summary are required' });
    }

    const normalizedStatus =
      body.status === 'blocked' || body.status === 'completed' || body.status === 'active'
        ? body.status
        : 'active';

    const workItem = workItemRepository.create(
      {
        employeeId,
        title: body.title,
        summary: body.summary,
        status: normalizedStatus,
      },
      now().toISOString(),
    );

    return reply.code(201).send(workItem);
  });

  app.post('/employees/:employeeId/project-groups', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      chatId?: string;
      chatName?: string;
      status?: 'active' | 'watching' | 'archived';
      isDefault?: boolean;
      managerProxyRequired?: boolean;
    };

    if (!body.chatId?.trim() || !body.chatName?.trim()) {
      return reply.code(400).send({ message: 'chatId and chatName are required' });
    }

    const binding = projectGroupBindingRepository.create({
      employeeId,
      chatId: body.chatId.trim(),
      chatName: body.chatName.trim(),
      status: body.status,
      isDefault: body.isDefault,
      managerProxyRequired: body.managerProxyRequired,
      lastSyncedAt: now().toISOString(),
    });

    return reply.code(201).send(binding);
  });

  app.post('/employees/:employeeId/runtime-dispatches', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      workItemId?: string;
      taskTitle?: string;
      taskBody?: string;
      taskType?: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
    };

    if (!body.taskTitle?.trim() || !body.taskBody?.trim()) {
      return reply.code(400).send({ message: 'taskTitle and taskBody are required' });
    }

    if (body.workItemId) {
      const linkedWorkItem = workItemRepository.get(body.workItemId);
      if (!linkedWorkItem || linkedWorkItem.employeeId !== employeeId) {
        return reply.code(404).send({ message: 'work item not found' });
      }
    }

    const taskType = isBrainPreviewTaskType(body.taskType) ? body.taskType : 'coding';
    const brainPreview = buildBrainPreview(employeeId, taskType);
    const dispatchedAt = now().toISOString();
    const runtimeReceipt = await runtime.sendTask(employeeId, {
      taskTitle: body.taskTitle.trim(),
      taskBody: body.taskBody.trim(),
      taskType,
      workItemId: body.workItemId,
      dispatchedAt,
      brainContext: brainPreview,
    });

    const dispatch = runtimeDispatchRepository.create({
      employeeId,
      workItemId: body.workItemId ?? null,
      taskTitle: body.taskTitle.trim(),
      taskBody: body.taskBody.trim(),
      taskType,
      status: 'dispatched',
      workspaceTaskRef: runtimeReceipt.taskFilePath,
      createdAt: dispatchedAt,
    });

    return reply.code(201).send({
      ...dispatch,
      runtimeReceipt,
      brainPreview,
    });
  });

  app.post('/employees/:employeeId/runtime/start', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const heartbeat = await runtime.start(employeeId);
    const existingSession = runtimeSessionRepository.latestActiveForEmployee(employeeId);
    const session =
      existingSession ??
      runtimeSessionRepository.createRunning({
        employeeId,
        runtimeKind: heartbeat.runtimeKind,
        pid: heartbeat.pid,
        startedAt: now().toISOString(),
      });

    return reply.code(200).send({
      ok: true,
      runtime: heartbeat,
      session,
    });
  });

  app.post('/employees/:employeeId/runtime/stop', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    await runtime.stop(employeeId);
    const heartbeat = await runtime.heartbeat(employeeId);
    const existingSession = runtimeSessionRepository.latestActiveForEmployee(employeeId);
    const session = existingSession ? runtimeSessionRepository.stopSession(existingSession.sessionId, now().toISOString()) : undefined;

    return reply.code(200).send({
      ok: true,
      runtime: heartbeat,
      session: session ?? null,
    });
  });

  app.post('/employees/:employeeId/project-groups/:bindingId/status', async (request, reply) => {
    const { employeeId, bindingId } = request.params as { employeeId: string; bindingId: string };
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as { status?: 'active' | 'watching' | 'archived' };
    if (body.status !== 'active' && body.status !== 'watching' && body.status !== 'archived') {
      return reply.code(400).send({ message: 'status must be active, watching, or archived' });
    }

    const existing = projectGroupBindingRepository.get(bindingId);
    if (!existing || existing.employeeId !== employeeId) {
      return reply.code(404).send({ message: 'project group binding not found' });
    }

    return projectGroupBindingRepository.updateStatus(bindingId, body.status, now().toISOString());
  });

  app.post('/employees/:employeeId/project-groups/:bindingId/default', async (request, reply) => {
    const { employeeId, bindingId } = request.params as { employeeId: string; bindingId: string };
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const existing = projectGroupBindingRepository.get(bindingId);
    if (!existing || existing.employeeId !== employeeId) {
      return reply.code(404).send({ message: 'project group binding not found' });
    }

    return projectGroupBindingRepository.setDefault(bindingId);
  });

  app.post('/employees/:employeeId/actions/collect-runtime-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const events = await collectEmployeeRuntimeEvents(employeeId);
    if (!events) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return reply.code(200).send({
      ok: true,
      count: events.length,
      events,
    });
  });

  app.get('/employees/:employeeId/autonomy-settings', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return autonomySettingsRepository.getOrCreate(employeeId, now().toISOString());
  });

  app.post('/employees/:employeeId/autonomy-settings', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      enabled?: boolean;
      cadenceHours?: number;
      autoPromoteToDirectionKnowledge?: boolean;
      nextRunAt?: string | null;
    };

    if (body.cadenceHours !== undefined && (!Number.isInteger(body.cadenceHours) || body.cadenceHours <= 0)) {
      return reply.code(400).send({ message: 'cadenceHours must be a positive integer' });
    }

    return autonomySettingsRepository.update(
      employeeId,
      {
        enabled: body.enabled,
        cadenceHours: body.cadenceHours,
        autoPromoteToDirectionKnowledge: body.autoPromoteToDirectionKnowledge,
        nextRunAt: body.nextRunAt,
      },
      now().toISOString(),
    );
  });

  app.get('/employees/:employeeId/autonomous-learning-runs', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return autonomousLearningRunRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/feishu-bot-preview', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const larkAuth = await larkAuthLoader();
    const feishuProfile = employeeProfile?.feishuProfile ?? employee.feishuProfile;

    return {
      employeeId: employee.employeeId,
      botName: feishuProfile.botName ?? employee.displayName,
      dmPolicy: feishuProfile.dmPolicy ?? 'manager-only',
      managerOpenId: feishuProfile.managerOpenId ?? larkAuth.openId,
      groupPolicy: 'allowlist',
      requireMention: feishuProfile.chatMode ? feishuProfile.chatMode === 'mention' : true,
      bindingStatus: feishuProfile.bindingStatus ?? 'unbound',
      appId: feishuProfile.appId,
      botOpenId: feishuProfile.botOpenId,
      canJoinProjectGroups: true,
      runtimeKind: employee.runtimeKind,
      workspacePath: employee.workspacePath,
    };
  });

  app.get('/employees/:employeeId/feishu-agent/setup-plan', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return {
      employeeId: employee.employeeId,
      botName: employee.displayName,
      setupMode: 'larklink-compatible',
      requiredCapabilities: ['bot', 'im.message.receive_v1', 'im:message:send_as_bot'],
      createCommand: ['lark-cli', 'config', 'init', '--new', '--name', `rdleader-${employee.employeeId}`],
      bindCommandPreview: [
        'lark-cli',
        'config',
        'bind',
        '--source',
        'lark-channel',
        '--app-id',
        '<appId>',
        '--identity',
        'bot-only',
      ],
    };
  });

  app.post('/employees/:employeeId/feishu-agent/bind', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employee || !employeeProfile) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      appId: string;
      appSecretRef: string;
      botOpenId: string;
      managerOpenId: string;
      chatMode: 'mention' | 'all';
    };

    const nextFeishuProfile = {
      ...employeeProfile.feishuProfile,
      botName: employee.displayName,
      botOpenId: body.botOpenId,
      dmPolicy: 'manager-only' as const,
      bindingStatus: 'bound' as const,
      appId: body.appId,
      appSecretRef: body.appSecretRef,
      managerOpenId: body.managerOpenId,
      chatMode: body.chatMode,
      identityPreset: 'bot-only' as const,
      agentSource: 'lark-channel' as const,
      setupProfileName: `rdleader-${employee.employeeId}`,
      lastBoundAt: now().toISOString(),
    };

    employeeProfileRepository.updateFeishuProfile(employeeId, nextFeishuProfile);

    return {
      employeeId,
      bindingStatus: 'bound',
      appId: body.appId,
      appSecretRef: body.appSecretRef,
      botOpenId: body.botOpenId,
      managerOpenId: body.managerOpenId,
      chatMode: body.chatMode,
      dmPolicy: 'manager-only',
      bindCommand: [
        'lark-cli',
        'config',
        'bind',
        '--source',
        'lark-channel',
        '--app-id',
        body.appId,
        '--identity',
        'bot-only',
      ],
    };
  });

  app.get('/employees/:employeeId/project-ops-preview', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const integrationStatus = await integrationStatusLoader();
    const meegoAuth = await meegoAuthLoader();
    return {
      employeeId: employee.employeeId,
      managerProxyRequired: true,
      bytedcliReady: integrationStatus.bytedcli === 'ready',
      meegoAuthenticated: meegoAuth.authenticated,
      recommendedCommands: [
        'bytedcli --json meego status',
        'bytedcli meego config --tenant dcar',
        'bytedcli meego workitem --help',
      ],
      workflow: [
        '员工在群里推进项目与技术方案',
        '老板代理参加需求评审会议',
        '会议结论回填给员工继续推进',
      ],
    };
  });

  app.post('/chat/internal-message', async (request) => {
    const body = request.body as {
      senderEmployeeId: string;
      recipientEmployeeId: string;
      body: string;
    };

    messageRepository.create({
      senderEmployeeId: body.senderEmployeeId,
      recipientEmployeeId: body.recipientEmployeeId,
      body: body.body,
    });

    return {
      ok: true,
      message: {
        senderEmployeeId: body.senderEmployeeId,
        recipientEmployeeId: body.recipientEmployeeId,
        body: body.body,
      },
    };
  });

  app.get('/employees/:employeeId/internal-messages', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return messageRepository.listForEmployee(employeeId);
  });

  app.post('/chat/manager-message', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      body: string;
    };

    const employee = getEmployee(body.employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!body.body?.trim()) {
      return reply.code(400).send({ message: 'body is required' });
    }

    const taskType = classifyManagerChatTaskType(body.body);
    const createdAt = now().toISOString();
    const managerMessage = managerConversationMessageRepository.create(
      {
        employeeId: body.employeeId,
        role: 'manager',
        body: body.body.trim(),
        taskType,
        artifactRefs: extractArtifactRefsFromBody(body.body),
      },
      createdAt,
    );
    const generatedReply = buildManagerConversationReply(body.employeeId, body.body.trim());

    if (!generatedReply) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const employeeReply = managerConversationMessageRepository.create(
      {
        employeeId: body.employeeId,
        role: 'employee',
        body: generatedReply.body,
        taskType: generatedReply.taskType,
        reasoningSummary: generatedReply.reasoningSummary,
        artifactRefs: generatedReply.artifactRefs,
        approvalRequired: generatedReply.approvalRequired,
        approvalSummary: generatedReply.approvalSummary,
      },
      createdAt,
    );

    if (generatedReply.approvalRequired) {
      approvalRequestRepository.create(
        {
          employeeId: body.employeeId,
          sourceMessageId: managerMessage.messageId,
          summary: managerMessage.body,
          riskLevel: 'high',
          approvalSummary: generatedReply.approvalSummary,
        },
        createdAt,
      );
    }

    return {
      ok: true,
      message: managerMessage,
      reply: employeeReply,
    };
  });

  app.post('/approval-requests/:requestId/decision', async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const body = request.body as {
      decision?: unknown;
      approvalSummary?: string | null;
    };

    if (body.decision !== 'approved' && body.decision !== 'rejected') {
      return reply.code(400).send({ message: 'decision must be approved or rejected' });
    }

    const approvalRequest = approvalRequestRepository.get(requestId);
    if (!approvalRequest) {
      return reply.code(404).send({ message: 'approval request not found' });
    }

    if (approvalRequest.status !== 'pending') {
      return reply.code(409).send({ message: 'approval request already resolved' });
    }

    return approvalRequestRepository.decide(
      requestId,
      {
        status: body.decision,
        approvalSummary: body.approvalSummary,
      },
      now().toISOString(),
    );
  });

  app.post('/work-items/:workItemId/status', async (request, reply) => {
    const { workItemId } = request.params as { workItemId: string };
    const body = request.body as { status?: string };

    if (body.status !== 'active' && body.status !== 'blocked' && body.status !== 'completed') {
      return reply.code(400).send({ message: 'status must be active, blocked, or completed' });
    }

    const existing = workItemRepository.get(workItemId);
    if (!existing) {
      return reply.code(404).send({ message: 'work item not found' });
    }

    return workItemRepository.updateStatus(workItemId, body.status, now().toISOString());
  });

  app.post('/hr/candidates', async (request, reply) => {
    const body = request.body as {
      name: string;
      interviewNotes: string;
    };

    const candidate = candidateRepository.create(body);
    candidateLifecycleRepository.create(
      {
        candidateId: candidate.candidateId,
        eventType: 'candidate_created',
        status: candidate.status,
        summary: candidate.interviewNotes.trim()
          ? `创建候选人档案：${candidate.name}。初始面试备注：${candidate.interviewNotes.trim()}`
          : `创建候选人档案：${candidate.name}`,
      },
      now().toISOString(),
    );

    return reply.code(201).send({ ok: true, candidate });
  });

  app.get('/hr/candidates', async () => candidateRepository.list());

  app.post('/hr/candidates/:candidateId/interviews', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const body = request.body as {
      stage?: string;
      scheduledAt?: string;
      summary?: string;
      recommendation?: 'hire' | 'hold' | 'reject';
    };

    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    if (!body.stage?.trim() || !body.scheduledAt?.trim() || !body.summary?.trim()) {
      return reply.code(400).send({ message: 'stage, scheduledAt, and summary are required' });
    }

    if (body.recommendation !== 'hire' && body.recommendation !== 'hold' && body.recommendation !== 'reject') {
      return reply.code(400).send({ message: 'recommendation must be hire, hold, or reject' });
    }

    const interview = interviewRepository.create({
      candidateId,
      stage: body.stage.trim(),
      scheduledAt: body.scheduledAt.trim(),
      summary: body.summary.trim(),
      recommendation: body.recommendation,
    });
    candidateLifecycleRepository.create(
      {
        candidateId,
        eventType: 'interview_recorded',
        status: candidate.status,
        summary: `记录 ${interview.stage} 面试，建议 ${interview.recommendation}：${interview.summary}`,
      },
      now().toISOString(),
    );

    return reply.code(201).send(interview);
  });

  app.get('/hr/candidates/:candidateId/interviews', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    return interviewRepository.listForCandidate(candidateId);
  });

  app.get('/hr/candidates/:candidateId/lifecycle', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    return candidateLifecycleRepository.listForCandidate(candidateId);
  });

  app.post('/hr/candidates/:candidateId/decision', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const body = request.body as { status?: 'offered' | 'rejected' };
    const candidate = candidateRepository.get(candidateId);

    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    if (body.status !== 'offered' && body.status !== 'rejected') {
      return reply.code(400).send({ message: 'status must be offered or rejected' });
    }

    candidateRepository.updateStatus(candidateId, body.status);
    candidateLifecycleRepository.create(
      {
        candidateId,
        eventType: 'decision_updated',
        status: body.status,
        summary: `更新招聘决策为 ${body.status}`,
      },
      now().toISOString(),
    );
    return {
      ok: true,
      candidateId,
      status: body.status,
    };
  });

  app.post('/hr/candidates/:candidateId/convert-to-employee', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const body = request.body as {
      employeeId?: string;
      directionId?: string;
      level?: '1-2' | '2-1' | '2-2';
    };

    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    if (!body.employeeId?.trim() || !body.directionId?.trim()) {
      return reply.code(400).send({ message: 'employeeId and directionId are required' });
    }

    if (interviewRepository.listForCandidate(candidateId).length === 0) {
      return reply.code(400).send({ message: 'candidate must have at least one interview before hiring' });
    }

    if (candidate.status !== 'offered') {
      return reply.code(400).send({ message: 'candidate must be offered before hiring' });
    }

    if (employeeRepository.get(body.employeeId)) {
      return reply.code(409).send({ message: 'employee already exists' });
    }

    const directionConfig = directionConfigRepository.get(body.directionId);
    if (!directionConfig) {
      return reply.code(404).send({ message: 'direction config not found' });
    }

    const employeeRow = buildDefaultEmployeeRow({
      employeeId: body.employeeId.trim(),
      displayName: candidate.name,
      level: body.level ?? '1-2',
      directionId: body.directionId.trim(),
    });
    employeeRepository.create(employeeRow);
    employeeProfileRepository.create(
      buildDefaultEmployeeProfile({
        employeeId: employeeRow.employeeId,
        displayName: employeeRow.displayName,
        managerId: 'boss',
      }),
    );
    workItemRepository.create(
      {
        employeeId: employeeRow.employeeId,
        title: '完成入职熟悉',
        summary: '熟悉团队方向、知识库与开发流程',
        status: 'active',
      },
      now().toISOString(),
    );
    candidateRepository.updateStatus(candidateId, 'hired');
    candidateLifecycleRepository.create(
      {
        candidateId,
        eventType: 'candidate_hired',
        status: 'hired',
        summary: `录用为员工 ${employeeRow.employeeId}，方向 ${employeeRow.directionId}，职级 ${employeeRow.level}`,
      },
      now().toISOString(),
    );

    return reply.code(201).send({
      ok: true,
      candidateId,
      employee: {
        employeeId: employeeRow.employeeId,
        displayName: employeeRow.displayName,
        level: employeeRow.level,
        directionId: employeeRow.directionId,
        defaultKnowledgeBaseIds: directionConfig.defaultKnowledgeBaseIds,
      },
    });
  });

  app.post('/employees/:employeeId/level', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { level: '1-2' | '2-1' | '2-2' };
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employeeRepository.updateLevel(employeeId, body.level);
    return { ok: true, employeeId, level: body.level };
  });

  app.post('/employees/:employeeId/employment-status', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { employmentStatus: 'candidate' | 'active' | 'probation' | 'resigned' | 'fired' };
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employeeRepository.updateEmploymentStatus(employeeId, body.employmentStatus);
    return { ok: true, employeeId, employmentStatus: body.employmentStatus };
  });

  app.post('/employees/:employeeId/direction', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { directionId?: string };
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!body.directionId?.trim()) {
      return reply.code(400).send({ message: 'directionId is required' });
    }

    const directionConfig = directionConfigRepository.get(body.directionId);
    if (!directionConfig) {
      return reply.code(404).send({ message: 'direction config not found' });
    }

    employeeRepository.updateDirection(employeeId, body.directionId);
    return {
      ok: true,
      employeeId,
      directionId: body.directionId,
      directionConfig,
    };
  });

  app.post('/employees/:employeeId/actions/send-manager-dm', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      body: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    const larkAuth = await larkAuthLoader();
    const command = buildManagerDmCommand({
      managerOpenId: larkAuth.openId,
      employeeDisplayName: employee.displayName,
      body: body.body,
    });

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        managerOpenId: larkAuth.openId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        managerOpenId: larkAuth.openId,
        command,
      });
    }

    const result = await larkManagerDmSender({
      managerOpenId: larkAuth.openId,
      employeeDisplayName: employee.displayName,
      body: body.body,
    });

    return {
      mode: 'executed',
      employeeId,
      managerOpenId: larkAuth.openId,
      result,
    };
  });

  app.post('/employees/:employeeId/actions/send-group-message', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      chatId: string;
      body: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildGroupMessageCommand({
      chatId: body.chatId,
      employeeDisplayName: employee.displayName,
      body: body.body,
    });

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        chatId: body.chatId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        chatId: body.chatId,
        command,
      });
    }

    const result = await larkGroupMessageSender({
      chatId: body.chatId,
      employeeDisplayName: employee.displayName,
      body: body.body,
    });

    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'send_group_message',
        summary: `向项目群 ${body.chatId} 发送推进消息：${body.body}`,
        nextStepSummary: '等待群内反馈并继续推进排期或评审安排',
        targetRef: body.chatId,
        detail: {
          chatId: body.chatId,
          body: body.body,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      chatId: body.chatId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/refresh-meego-status', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const meego = await meegoAuthLoader();
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'refresh_meego_status',
        summary: `刷新 Meego 状态：${meego.authenticated ? 'authenticated' : 'missing'} / ${meego.toolCount} tools`,
        nextStepSummary: '根据认证状态继续查询或更新工作项',
        targetRef: meego.endpoint,
        detail: {
          meego,
        },
      },
      now().toISOString(),
    );

    return {
      employeeId,
      meego,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/meego-workitem-lookup', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      lookupType: 'id' | 'title';
      query: string;
      dryRun?: boolean;
    };

    const command = buildMeegoWorkitemLookupCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    const result = await meegoWorkitemLookup(body);
    const firstItem = result?.items?.[0];
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'meego_workitem_lookup',
        summary: firstItem
          ? `查询 Meego 工作项：${body.query} -> ${firstItem.id} ${firstItem.title}`
          : `查询 Meego 工作项：${body.query}`,
        nextStepSummary: '确认是否需要补充评论、更新字段或同步到项目群',
        targetRef:
          typeof firstItem?.id === 'string'
            ? firstItem.id
            : body.query,
        detail: {
          lookupType: body.lookupType,
          query: body.query,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/meego-workitem-update', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      workItemId: string;
      projectKey: string;
      fields: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildMeegoWorkitemUpdateCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        command,
      });
    }

    const result = await meegoWorkitemUpdate(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'meego_workitem_update',
        summary: `更新 Meego 工作项 ${body.workItemId} 字段`,
        nextStepSummary: '继续跟进字段变更后的排期或负责人确认',
        targetRef: body.workItemId,
        detail: {
          projectKey: body.projectKey,
          fields: body.fields,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/meego-comment-create', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      workItemId: string;
      projectKey: string;
      commentContent: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildMeegoCommentCreateCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        command,
      });
    }

    const result = await meegoCommentCreate(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'meego_comment_create',
        summary: `在 Meego 工作项 ${body.workItemId} 下评论：${body.commentContent}`,
        nextStepSummary: '等待相关方回复并继续推进工作项处理',
        targetRef: body.workItemId,
        detail: {
          projectKey: body.projectKey,
          commentContent: body.commentContent,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/create-tech-review-doc', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      title: string;
      problem: string;
      nextSteps: string[];
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildTechReviewDocCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        title: body.title,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        title: body.title,
        command,
      });
    }

    const result = await larkDocCreator(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'create_tech_review_doc',
        summary: `创建技术评审文档：${body.title}`,
        nextStepSummary: '将文档同步到项目群并推动相关方确认评审范围',
        targetRef: body.title,
        detail: {
          problem: body.problem,
          nextSteps: body.nextSteps,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/schedule-tech-review', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      summary: string;
      description: string;
      start: string;
      end: string;
      attendeeIds: string[];
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildTechReviewMeetingCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        summary: body.summary,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        summary: body.summary,
        command,
      });
    }

    const result = await larkCalendarEventCreator(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'schedule_tech_review',
        summary: `发起技术评审会议：${body.summary}`,
        nextStepSummary: '推动参会人确认时间并准备会前材料',
        targetRef: body.summary,
        detail: {
          description: body.description,
          start: body.start,
          end: body.end,
          attendeeIds: body.attendeeIds,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/find-project-chat', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      query: string;
      dryRun?: boolean;
    };

    const command = buildFeishuChatSearchCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    const result = await feishuChatSearch(body);
    const firstChat = result?.chats?.[0];
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'find_project_chat',
        summary: firstChat
          ? `查找项目群：${body.query} -> ${firstChat.name}（${firstChat.chatId}）`
          : `查找项目群：${body.query}`,
        nextStepSummary: '确认目标项目群后绑定为默认群或继续发送推进消息',
        targetRef: typeof firstChat?.chatId === 'string' ? firstChat.chatId : body.query,
        detail: {
          query: body.query,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.get('/employees/:employeeId/project-ops-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return projectOpsEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/reflections/refresh', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const memory = await memoryLoader(employeeId as 'lushirong' | 'zhouyongkang');
    const summary =
      memory.length > 0
        ? '围绕导流推进形成了一次新的反思'
        : '围绕当前工作形成了一次新的反思';

    const reflection = reflectionRepository.create({
      employeeId,
      summary,
    });

    return reply.code(201).send(reflection);
  });

  app.get('/employees/:employeeId/reflections', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return reflectionRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/emotion-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      eventType: string;
      intensityDelta: number;
      nextEmotion: string;
      summary: string;
    };

    const nextIntensity = Math.max(0, Math.min(1, employee.emotionIntensity + body.intensityDelta));
    const event = emotionEventRepository.create({
      employeeId,
      eventType: body.eventType,
      intensityDelta: body.intensityDelta,
      nextEmotion: body.nextEmotion,
      summary: body.summary,
    });

    employeeRepository.updateEmotion(employeeId, {
      emotionCurrent: body.nextEmotion,
      emotionIntensity: nextIntensity,
      emotionSummary: body.summary,
    });

    return reply.code(201).send(event);
  });

  app.get('/employees/:employeeId/emotion-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return emotionEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/performance-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      eventType: string;
      reliabilityDelta: number;
      nextDeliveryTrend: string;
      nextPromotionReadiness: string;
      nextRetentionRisk: string;
      summary: string;
    };

    const nextReliability = Math.max(0, Math.min(1, employee.reliabilityScore + body.reliabilityDelta));
    const event = performanceEventRepository.create({
      employeeId,
      eventType: body.eventType,
      reliabilityDelta: body.reliabilityDelta,
      nextDeliveryTrend: body.nextDeliveryTrend,
      nextPromotionReadiness: body.nextPromotionReadiness,
      nextRetentionRisk: body.nextRetentionRisk,
      summary: body.summary,
    });

    employeeRepository.updatePerformance(employeeId, {
      deliveryTrend: body.nextDeliveryTrend,
      promotionReadiness: body.nextPromotionReadiness,
      retentionRisk: body.nextRetentionRisk,
      reliabilityScore: nextReliability,
    });
    if (body.nextRetentionRisk === 'high') {
      employeeRepository.updateResignationIntent(employeeId, 'watch');
    }

    return reply.code(201).send(event);
  });

  app.get('/employees/:employeeId/performance-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return performanceEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/manager-proxy-reviews', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      reviewTopic: string;
      conclusion: string;
      nextSteps: string[];
    };

    const review = managerProxyReviewRepository.create({
      employeeId,
      reviewTopic: body.reviewTopic,
      conclusion: body.conclusion,
      nextSteps: body.nextSteps,
    });

    employeeRepository.updateWorkState(employeeId, {
      recentDoneSummary: body.conclusion,
      nextStepSummary: body.nextSteps[0] ?? employee.nextStepSummary,
    });

    return reply.code(201).send(review);
  });

  app.get('/employees/:employeeId/manager-proxy-reviews', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return managerProxyReviewRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/resignation-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      nextIntent: string;
      summary: string;
    };

    const event = resignationEventRepository.create({
      employeeId,
      nextIntent: body.nextIntent,
      summary: body.summary,
    });
    employeeRepository.updateResignationIntent(employeeId, body.nextIntent);

    return reply.code(201).send(event);
  });

  app.get('/employees/:employeeId/resignation-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return resignationEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/actions/accept-resignation', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employeeRepository.updateEmploymentStatus(employeeId, 'resigned');
    return { ok: true, employeeId, employmentStatus: 'resigned' };
  });

  app.post('/employees/:employeeId/actions/run-autonomous-learning', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const run = await runEmployeeAutonomousLearning(employeeId, 'manual');
    if (!run) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return reply.code(201).send(run);
  });

  app.post('/employees/:employeeId/learning-records/promote-latest-reflection', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const latest = reflectionRepository.latestForEmployee(employeeId);
    if (!latest) {
      return reply.code(404).send({ message: 'reflection not found' });
    }

    const body = request.body as { scope: 'personal' | 'direction' };
    const learningRecord = learningRecordRepository.create({
      employeeId,
      reflectionId: latest.reflectionId,
      title: '导流推进经验沉淀',
      summary: latest.summary,
      scope: body.scope,
    });

    return reply.code(201).send(learningRecord);
  });

  app.get('/employees/:employeeId/learning-records', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return learningRecordRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/learning-records/:recordId/promote-to-direction-knowledge', async (request, reply) => {
    const { employeeId, recordId } = request.params as { employeeId: string; recordId: string };
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const record = learningRecordRepository.get(recordId);
    if (!record || record.employeeId !== employeeId) {
      return reply.code(404).send({ message: 'learning record not found' });
    }

    const directionRecord = directionKnowledgeRepository.create({
      employeeId,
      directionId: employee.directionId,
      learningRecordId: record.recordId,
      title: record.title,
      summary: record.summary,
    });

    return reply.code(201).send(directionRecord);
  });

  app.post('/autonomy/run-due-cycles', async () => {
    const runs = await runDueAutonomousLearningCycles();
    return {
      ok: true,
      runCount: runs.length,
      runs,
    };
  });

  app.get('/directions/:directionId/knowledge-records', async (request) => {
    const { directionId } = request.params as { directionId: string };
    return directionKnowledgeRepository.listForDirection(directionId);
  });

  return app;
}
