import os from 'node:os';
import path from 'node:path';

const SAFE_WORKER_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/u;

export function getDefaultWorkspaceRoot(): string {
  return path.join(os.homedir(), 'GolandProjects', 'E');
}

export function assertSafeWorkerId(employeeId: string): void {
  if (!SAFE_WORKER_ID.test(employeeId)) {
    throw new Error(`Invalid employee id for workspace path: ${employeeId}`);
  }
}

export function assertPathInsideRoot(candidatePath: string, rootPath: string): string {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(resolvedRoot, resolvedCandidate);

  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return resolvedCandidate;
  }

  throw new Error(`Resolved workspace path is outside the workspace root: ${resolvedCandidate}`);
}

export function resolveWorkspacePath(employeeId: string): string {
  assertSafeWorkerId(employeeId);
  return path.join(getDefaultWorkspaceRoot(), employeeId);
}
