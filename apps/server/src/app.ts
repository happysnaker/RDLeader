import Fastify from 'fastify';
import { loadEmployeeMemory, type EmployeeMemoryEntry } from '@rdleader/ingest';
import { lushirongSeed, zhouyongkangSeed } from '@rdleader/seed';
import { TraeAcpAdapter } from '@rdleader/runtime';
import { createDb } from './db/client';

export async function buildApp(options: {
  databaseUrl: string;
  memoryLoader?: (employeeId: 'lushirong' | 'zhouyongkang') => Promise<EmployeeMemoryEntry[]>;
}) {
  const app = Fastify();
  createDb(options.databaseUrl);
  const runtime = new TraeAcpAdapter('/Users/bytedance/.local/bin/trae-cli');
  const memoryLoader = options.memoryLoader ?? loadEmployeeMemory;
  const employeeStore = [structuredClone(lushirongSeed), structuredClone(zhouyongkangSeed)];
  const candidateStore: Array<{
    candidateId: string;
    name: string;
    interviewNotes: string;
    status: 'interviewing';
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

  app.post('/chat/internal-message', async (request) => {
    const body = request.body as {
      senderEmployeeId: string;
      recipientEmployeeId: string;
      body: string;
    };

    return {
      ok: true,
      message: {
        senderEmployeeId: body.senderEmployeeId,
        recipientEmployeeId: body.recipientEmployeeId,
        body: body.body,
      },
    };
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
