import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveWorkspacePath, buildTraeAcpCommand } from './index';
import { TraeAcpAdapter, extractJsonPayload } from './trae-acp-adapter';

describe('runtime package', () => {
  it('derives an isolated workspace path for each employee', () => {
    expect(resolveWorkspacePath('zhouyongkang')).toMatch(/GolandProjects\/E\/zhouyongkang$/);
  });


  it('rejects employee ids that would escape the default workspace root', () => {
    expect(() => resolveWorkspacePath('../outside-worker')).toThrow(/Invalid employee id/);
  });

  it('rejects custom workspace resolver paths outside the configured root', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'rdleader-runtime-root-'));

    try {
      const adapter = new TraeAcpAdapter('/tmp/trae-cli', {
        workspaceRoot: root,
        workspacePathResolver: () => path.join(root, '..', 'escaped-worker'),
      });

      await expect(
        adapter.sendTask('alex-runtime', {
          taskTitle: 'Unsafe workspace',
          taskBody: 'Should not be written outside the workspace root',
          taskType: 'coding',
        }),
      ).rejects.toThrow(/outside the workspace root/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects unsafe employee ids before writing runtime task paths', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'rdleader-runtime-root-'));

    try {
      const adapter = new TraeAcpAdapter('/tmp/trae-cli', {
        workspaceRoot: root,
      });

      await expect(
        adapter.sendTask('../escaped-worker', {
          taskTitle: 'Unsafe employee',
          taskBody: 'This should never create a path outside the runtime root',
          taskType: 'coding',
        }),
      ).rejects.toThrow(/Invalid employee id/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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
        workspaceRoot: dir,
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
        workspaceRoot: dir,
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

  it('ignores runtime result files with unsafe names', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rdleader-runtime-events-'));

    try {
      const adapter = new TraeAcpAdapter('/tmp/trae-cli', {
        workspaceRoot: dir,
        workspacePathResolver: () => dir,
      });
      const resultDir = path.join(dir, '.rdleader', 'results');
      await import('node:fs/promises').then(({ mkdir, writeFile }) =>
        mkdir(resultDir, { recursive: true }).then(async () => {
          await writeFile(
            path.join(resultDir, 'result-1.json'),
            JSON.stringify({ workItemId: 'work-1', status: 'completed', summary: 'Runtime 已完成' }),
            'utf8',
          );
          await writeFile(
            path.join(resultDir, 'bad name.json'),
            JSON.stringify({ workItemId: 'unsafe', status: 'completed', summary: 'Should be ignored' }),
            'utf8',
          );
        }),
      );

      const events = await adapter.collectRuntimeEvents('lushirong');

      expect(events).toHaveLength(1);
      expect(events[0]?.workItemId).toBe('work-1');
      expect(existsSync(path.join(resultDir, 'bad name.json'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('extracts a structured JSON payload from mixed runtime logs', () => {
    const payload = extractJsonPayload(`
WARN some noisy log
not a json line
{"status":"completed","summary":"恢复成功","nextStepSummary":"继续收取结果","artifactRefs":["artifact://runtime-log"]}
`);

    expect(payload).toEqual({
      status: 'completed',
      summary: '恢复成功',
      nextStepSummary: '继续收取结果',
      artifactRefs: ['artifact://runtime-log'],
    });
  });
});
