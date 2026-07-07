import os from 'node:os';
import path from 'node:path';

export function resolveWorkspacePath(employeeId: string): string {
  return path.join(os.homedir(), 'GolandProjects', 'E', employeeId);
}
