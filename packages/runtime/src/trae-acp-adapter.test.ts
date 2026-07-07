import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveWorkspacePath, buildTraeAcpCommand } from './index';
import { TraeAcpAdapter } from './trae-acp-adapter';

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

  it('writes dispatched task envelopes into the employee workspace inbox', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rdleader-runtime-'));

    try {
      const adapter = new TraeAcpAdapter('/tmp/trae-cli', {
        workspacePathResolver: () => dir,
      });

      const receipt = await adapter.sendTask('lushirong', {
        taskTitle: '推进提单页导流',
        taskBody: '先确认主链路 blocker，再拆下一步动作',
        taskType: 'coding',
        workItemId: 'work-1',
        dispatchedAt: '2026-07-07T10:00:00.000Z',
        brainContext: {
          taskType: 'coding',
          layers: [{ layer: 'identity' }, { layer: 'working' }],
        },
      });

      const payload = JSON.parse(readFileSync(receipt.taskFilePath, 'utf8')) as {
        employeeId: string;
        taskTitle: string;
        taskBody: string;
        taskType: string;
        workItemId?: string;
        dispatchedAt: string;
      };

      expect(receipt.workspacePath).toBe(dir);
      expect(payload).toMatchObject({
        employeeId: 'lushirong',
        taskTitle: '推进提单页导流',
        taskBody: '先确认主链路 blocker，再拆下一步动作',
        taskType: 'coding',
        workItemId: 'work-1',
        dispatchedAt: '2026-07-07T10:00:00.000Z',
        brainContext: {
          taskType: 'coding',
          layers: [{ layer: 'identity' }, { layer: 'working' }],
        },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('collects runtime result events from the employee workspace and archives them', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rdleader-runtime-events-'));

    try {
      const adapter = new TraeAcpAdapter('/tmp/trae-cli', {
        workspacePathResolver: () => dir,
      });
      const resultDir = path.join(dir, '.rdleader', 'results');
      await import('node:fs/promises').then(({ mkdir, writeFile }) =>
        mkdir(resultDir, { recursive: true }).then(() =>
          writeFile(
            path.join(resultDir, 'result-1.json'),
            JSON.stringify(
              {
                workItemId: 'work-1',
                status: 'completed',
                summary: 'Runtime 已完成导流代码改造',
                nextStepSummary: '接下来验证实验结果',
                artifactRefs: ['artifact://patch-1'],
                createdAt: '2026-07-07T10:30:00.000Z',
              },
              null,
              2,
            ),
            'utf8',
          ),
        ),
      );

      const events = await adapter.collectRuntimeEvents('lushirong');
      expect(events).toMatchObject([
        {
          employeeId: 'lushirong',
          workItemId: 'work-1',
          status: 'completed',
          summary: 'Runtime 已完成导流代码改造',
          nextStepSummary: '接下来验证实验结果',
          artifactRefs: ['artifact://patch-1'],
          createdAt: '2026-07-07T10:30:00.000Z',
        },
      ]);

      const archived = readFileSync(path.join(dir, '.rdleader', 'results-processed', 'result-1.json'), 'utf8');
      expect(JSON.parse(archived)).toMatchObject({
        workItemId: 'work-1',
        summary: 'Runtime 已完成导流代码改造',
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
