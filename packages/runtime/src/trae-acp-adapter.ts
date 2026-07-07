import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeAdapter,
  RuntimeCollectedEvent,
  RuntimeHeartbeat,
  RuntimeTaskEnvelope,
  RuntimeTaskReceipt,
} from './runtime-adapter';
import { resolveWorkspacePath } from './workspace-manager';

const processes = new Map<string, ChildProcess>();

export function buildTraeAcpCommand(binaryPath: string): string[] {
  return [binaryPath, 'acp', 'serve'];
}

function defaultWorkspacePathResolver(employeeId: string) {
  return resolveWorkspacePath(employeeId);
}

export class TraeAcpAdapter implements RuntimeAdapter {
  constructor(
    private readonly binaryPath: string,
    private readonly options: {
      workspacePathResolver?: (employeeId: string) => string;
    } = {},
  ) {}

  private resolveWorkspace(employeeId: string) {
    return (this.options.workspacePathResolver ?? defaultWorkspacePathResolver)(employeeId);
  }

  async start(employeeId: string): Promise<RuntimeHeartbeat> {
    const workspacePath = this.resolveWorkspace(employeeId);
    await mkdir(workspacePath, { recursive: true });

    if (processes.has(employeeId)) {
      const current = processes.get(employeeId)!;
      return {
        employeeId,
        runtimeKind: 'trae_acp',
        status: 'running',
        pid: current.pid ?? null,
      };
    }

    const [command, ...args] = buildTraeAcpCommand(this.binaryPath);
    const child = spawn(command, args, {
      cwd: workspacePath,
      stdio: 'ignore',
      detached: false,
    });
    processes.set(employeeId, child);

    return {
      employeeId,
      runtimeKind: 'trae_acp',
      status: 'running',
      pid: child.pid ?? null,
    };
  }

  async stop(employeeId: string): Promise<void> {
    const current = processes.get(employeeId);
    if (!current) return;
    current.kill();
    processes.delete(employeeId);
  }

  async heartbeat(employeeId: string): Promise<RuntimeHeartbeat> {
    const current = processes.get(employeeId);
    return {
      employeeId,
      runtimeKind: 'trae_acp',
      status: current && !current.killed ? 'running' : 'stopped',
      pid: current?.pid ?? null,
    };
  }

  async sendTask(employeeId: string, taskEnvelope: RuntimeTaskEnvelope): Promise<RuntimeTaskReceipt> {
    const workspacePath = this.resolveWorkspace(employeeId);
    const dispatchedAt = taskEnvelope.dispatchedAt ?? new Date().toISOString();
    const taskDir = path.join(workspacePath, '.rdleader', 'tasks');
    const taskFilePath = path.join(taskDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);

    await mkdir(taskDir, { recursive: true });
    await writeFile(
      taskFilePath,
      JSON.stringify(
        {
          employeeId,
          ...taskEnvelope,
          dispatchedAt,
        },
        null,
        2,
      ),
      'utf8',
    );

    return {
      employeeId,
      runtimeKind: 'trae_acp',
      workspacePath,
      taskFilePath,
      dispatchedAt,
    };
  }

  async collectRuntimeEvents(employeeId: string): Promise<RuntimeCollectedEvent[]> {
    const workspacePath = this.resolveWorkspace(employeeId);
    const resultsDir = path.join(workspacePath, '.rdleader', 'results');
    const processedDir = path.join(workspacePath, '.rdleader', 'results-processed');

    await mkdir(resultsDir, { recursive: true });
    await mkdir(processedDir, { recursive: true });

    const files = (await readdir(resultsDir)).filter((file) => file.endsWith('.json')).sort();
    const events: RuntimeCollectedEvent[] = [];

    for (const file of files) {
      const sourceFilePath = path.join(resultsDir, file);
      const processedFilePath = path.join(processedDir, file);
      const payload = JSON.parse(await readFile(sourceFilePath, 'utf8')) as Partial<RuntimeCollectedEvent>;

      const createdAt = typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString();
      const status =
        payload.status === 'blocked' || payload.status === 'failed' || payload.status === 'completed'
          ? payload.status
          : 'completed';

      events.push({
        employeeId,
        runtimeKind: 'trae_acp',
        workItemId: typeof payload.workItemId === 'string' ? payload.workItemId : undefined,
        dispatchId: typeof payload.dispatchId === 'string' ? payload.dispatchId : undefined,
        status,
        summary: typeof payload.summary === 'string' ? payload.summary : 'Runtime 返回了一条结果',
        nextStepSummary: typeof payload.nextStepSummary === 'string' ? payload.nextStepSummary : undefined,
        artifactRefs: Array.isArray(payload.artifactRefs)
          ? payload.artifactRefs.filter((item): item is string => typeof item === 'string')
          : [],
        sourceFilePath,
        processedFilePath,
        createdAt,
      });

      await rename(sourceFilePath, processedFilePath);
    }

    return events;
  }
}
