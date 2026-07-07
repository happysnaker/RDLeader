import Fastify from 'fastify';
import { loadEmployeeMemory, type EmployeeMemoryEntry } from '@rdleader/ingest';
import { lushirongSeed, zhouyongkangSeed } from '@rdleader/seed';
import { TraeAcpAdapter } from '@rdleader/runtime';
import { createDb } from './db/client';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

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
}) {
  const app = Fastify();
  createDb(options.databaseUrl);
  const runtime = new TraeAcpAdapter('/Users/bytedance/.local/bin/trae-cli');
  const memoryLoader = options.memoryLoader ?? loadEmployeeMemory;
  const integrationStatusLoader = options.integrationStatusLoader ?? detectIntegrationStatus;
  const bytedcliAuthLoader = options.bytedcliAuthLoader ?? loadBytedcliAuth;
  const larkAuthLoader = options.larkAuthLoader ?? loadLarkAuth;
  const meegoAuthLoader = options.meegoAuthLoader ?? loadMeegoAuth;
  const employeeStore = [structuredClone(lushirongSeed), structuredClone(zhouyongkangSeed)];
  const candidateStore: Array<{
    candidateId: string;
    name: string;
    interviewNotes: string;
    status: 'interviewing';
  }> = [];
  const internalMessageStore: Array<{
    senderEmployeeId: string;
    recipientEmployeeId: string;
    body: string;
  }> = [];

  const summarizeEmployees = () => employeeStore.map((employee) => ({
    employeeId: employee.employeeId,
    displayName: employee.displayName,
    level: employee.level,
    directionId: employee.directionId,
    recentDoneSummary: employee.recentDoneSummary,
    nextStepSummary: employee.nextStepSummary,
    workspacePath: employee.workspacePath,
    runtimeKind: employee.runtimeKind,
    emotionCurrent: employee.emotionState.current,
    emotionIntensity: employee.emotionState.intensity,
    emotionSummary: employee.emotionState.summary,
    reliabilityScore: employee.performanceState.reliabilityScore,
  }));

  app.get('/health', async () => ({ ok: true }));
  app.get('/integrations/status', async () => integrationStatusLoader());
  app.get('/integrations/bytedcli/auth', async () => bytedcliAuthLoader());
  app.get('/integrations/lark/auth', async () => larkAuthLoader());
  app.get('/integrations/meego/auth', async () => meegoAuthLoader());
  app.get('/employees', async () => summarizeEmployees());
  app.get('/employees/:employeeId', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeStore.find((candidate) => candidate.employeeId === employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return {
      ...employee,
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
    const employee = employeeStore.find((candidate) => candidate.employeeId === employeeId);

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
    const employee = employeeStore.find((candidate) => candidate.employeeId === employeeId);

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

    internalMessageStore.push({
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
    const employee = employeeStore.find((candidate) => candidate.employeeId === employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return internalMessageStore.filter((message) => {
      return message.senderEmployeeId === employeeId || message.recipientEmployeeId === employeeId;
    });
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

    const candidate = {
      candidateId: `candidate-${candidateStore.length + 1}`,
      name: body.name,
      interviewNotes: body.interviewNotes,
      status: 'interviewing' as const,
    };
    candidateStore.push(candidate);

    return reply.code(201).send({ ok: true, candidate });
  });

  app.post('/employees/:employeeId/level', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { level: '1-2' | '2-1' | '2-2' };
    const employee = employeeStore.find((candidate) => candidate.employeeId === employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employee.level = body.level;
    return { ok: true, employeeId, level: employee.level };
  });

  app.post('/employees/:employeeId/employment-status', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { employmentStatus: 'candidate' | 'active' | 'probation' | 'resigned' | 'fired' };
    const employee = employeeStore.find((candidate) => candidate.employeeId === employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employee.employmentStatus = body.employmentStatus;
    return { ok: true, employeeId, employmentStatus: employee.employmentStatus };
  });

  return app;
}
