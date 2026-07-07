import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimeAdapter, RuntimeHeartbeat, RuntimeTaskEnvelope, RuntimeTaskReceipt } from './runtime-adapter';
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
}
