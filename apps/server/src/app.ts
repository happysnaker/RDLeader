import Fastify from 'fastify';
import { loadEmployeeMemory, type EmployeeMemoryEntry } from '@rdleader/ingest';
import { lushirongSeed, zhouyongkangSeed } from '@rdleader/seed';
import { TraeAcpAdapter } from '@rdleader/runtime';
import { createDb } from './db/client';
import { requiresApproval } from '@rdleader/policy';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EmployeeRepository } from './repositories/employee-repository';
import { CandidateRepository } from './repositories/candidate-repository';
import { MessageRepository } from './repositories/message-repository';
import { ReflectionRepository } from './repositories/reflection-repository';
import { LearningRecordRepository } from './repositories/learning-record-repository';
import { EmotionEventRepository } from './repositories/emotion-event-repository';
import { PerformanceEventRepository } from './repositories/performance-event-repository';
import { DirectionKnowledgeRepository } from './repositories/direction-knowledge-repository';
import { ResignationEventRepository } from './repositories/resignation-event-repository';

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

export async function buildApp(options: {
  databaseUrl: string;
  memoryLoader?: (employeeId: 'lushirong' | 'zhouyongkang') => Promise<EmployeeMemoryEntry[]>;
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
}) {
  const app = Fastify();
  const sqlite = createDb(options.databaseUrl);
  const employeeRepository = new EmployeeRepository(sqlite);
  const candidateRepository = new CandidateRepository(sqlite);
  const messageRepository = new MessageRepository(sqlite);
  const reflectionRepository = new ReflectionRepository(sqlite);
  const learningRecordRepository = new LearningRecordRepository(sqlite);
  const emotionEventRepository = new EmotionEventRepository(sqlite);
  const performanceEventRepository = new PerformanceEventRepository(sqlite);
  const directionKnowledgeRepository = new DirectionKnowledgeRepository(sqlite);
  const resignationEventRepository = new ResignationEventRepository(sqlite);
  const runtime = new TraeAcpAdapter('/Users/bytedance/.local/bin/trae-cli');
  const memoryLoader = options.memoryLoader ?? loadEmployeeMemory;
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

  employeeRepository.seed(seedEmployees);

  const summarizeEmployees = () => employeeRepository.list();

  app.get('/health', async () => ({ ok: true }));
  app.get('/integrations/status', async () => integrationStatusLoader());
  app.get('/integrations/bytedcli/auth', async () => bytedcliAuthLoader());
  app.get('/integrations/lark/auth', async () => larkAuthLoader());
  app.get('/integrations/meego/auth', async () => meegoAuthLoader());
  app.get('/employees', async () => summarizeEmployees());
  app.get('/employees/:employeeId', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = seedEmployees.find((candidate) => candidate.employeeId === employeeId);
    const employeeRow = employeeRepository.get(employeeId);

    if (!employee || !employeeRow) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return {
      ...employee,
      level: employeeRow.level,
      employmentStatus: employeeRow.employmentStatus,
      recentDoneSummary: employeeRow.recentDoneSummary,
      nextStepSummary: employeeRow.nextStepSummary,
      workspacePath: employeeRow.workspacePath,
      runtimeKind: employeeRow.runtimeKind,
      emotionState: {
        ...employee.emotionState,
        current: employeeRow.emotionCurrent,
        intensity: employeeRow.emotionIntensity,
        summary: employeeRow.emotionSummary,
      },
      performanceState: {
        ...employee.performanceState,
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
      runtime: await runtime.heartbeat(employee.employeeId),
      memory: await memoryLoader(employee.employeeId as 'lushirong' | 'zhouyongkang'),
      conversations: [],
    };
  });

  app.get('/employees/:employeeId/memory', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (employeeId !== 'lushirong' && employeeId !== 'zhouyongkang') {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return memoryLoader(employeeId);
  });

  app.get('/employees/:employeeId/feishu-bot-preview', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const larkAuth = await larkAuthLoader();
    return {
      employeeId: employee.employeeId,
      botName: employee.displayName,
      dmPolicy: 'manager-only',
      managerOpenId: larkAuth.openId,
      groupPolicy: 'allowlist',
      requireMention: true,
      runtimeKind: employee.runtimeKind,
      workspacePath: employee.workspacePath,
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

  app.post('/chat/manager-message', async (request) => {
    const body = request.body as {
      employeeId: string;
      body: string;
    };

    return {
      ok: true,
      message: {
        employeeId: body.employeeId,
        body: body.body,
      },
    };
  });

  app.post('/hr/candidates', async (request, reply) => {
    const body = request.body as {
      name: string;
      interviewNotes: string;
    };

    const candidate = candidateRepository.create(body);

    return reply.code(201).send({ ok: true, candidate });
  });

  app.get('/hr/candidates', async () => candidateRepository.list());

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

    return {
      mode: 'executed',
      employeeId,
      chatId: body.chatId,
      result,
    };
  });

  app.post('/employees/:employeeId/actions/refresh-meego-status', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return {
      employeeId,
      meego: await meegoAuthLoader(),
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

    return {
      employeeId,
      result: await meegoWorkitemLookup(body),
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

    return {
      mode: 'executed',
      employeeId,
      result: await meegoWorkitemUpdate(body),
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

    return {
      mode: 'executed',
      employeeId,
      result: await meegoCommentCreate(body),
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

    return {
      mode: 'executed',
      employeeId,
      result: await larkDocCreator(body),
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

    return {
      mode: 'executed',
      employeeId,
      result: await larkCalendarEventCreator(body),
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

    return {
      employeeId,
      result: await feishuChatSearch(body),
    };
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

  app.get('/directions/:directionId/knowledge-records', async (request) => {
    const { directionId } = request.params as { directionId: string };
    return directionKnowledgeRepository.listForDirection(directionId);
  });

  return app;
}
