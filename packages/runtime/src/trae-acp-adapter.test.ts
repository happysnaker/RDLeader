import { describe, expect, it } from 'vitest';
import { resolveWorkspacePath, buildTraeAcpCommand } from './index';

describe('runtime package', () => {
  it('derives an isolated workspace path for each employee', () => {
    expect(resolveWorkspacePath('zhouyongkang')).toMatch(/GolandProjects\/E\/zhouyongkang$/);
  });

  it('builds the local Trae ACP command', () => {
    expect(buildTraeAcpCommand('/Users/bytedance/.local/bin/trae-cli')).toEqual([
      '/Users/bytedance/.local/bin/trae-cli',
      'acp',
      'serve',
    ]);
  });
});
