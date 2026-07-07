import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import type { RuntimeAdapter, RuntimeHeartbeat } from './runtime-adapter';
import { resolveWorkspacePath } from './workspace-manager';

const processes = new Map<string, ChildProcess>();

export function buildTraeAcpCommand(binaryPath: string): string[] {
  return [binaryPath, 'acp', 'serve'];
}

export class TraeAcpAdapter implements RuntimeAdapter {
  constructor(private readonly binaryPath: string) {}

  async start(employeeId: string): Promise<RuntimeHeartbeat> {
    const workspacePath = resolveWorkspacePath(employeeId);
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
}
