import { spawn, type ChildProcess } from 'node:child_process';
import { appendFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeAdapter,
  RuntimeCollectedEvent,
  RuntimeHeartbeat,
  RuntimeTaskEnvelope,
  RuntimeTaskReceipt,
} from './runtime-adapter';
import { resolveWorkspacePath } from './workspace-manager';

export function buildTraeAcpCommand(binaryPath: string): string[] {
  return [binaryPath, 'acp', 'serve'];
}

function defaultWorkspacePathResolver(employeeId: string) {
  return resolveWorkspacePath(employeeId);
}

type RuntimeTaskFile = RuntimeTaskEnvelope & {
  employeeId: string;
  dispatchId?: string;
};

type RuntimeExecOutcome = {
  status: 'completed' | 'blocked' | 'failed';
  summary: string;
  nextStepSummary?: string;
  artifactRefs: string[];
};

function normalizeArtifactRefs(items: unknown): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function extractJsonPayload(text: string): RuntimeExecOutcome | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  const candidates: string[] = [];
  const pushCandidate = (candidate?: string) => {
    if (!candidate) {
      return;
    }

    const normalized = candidate.trim();
    if (!normalized || candidates.includes(normalized)) {
      return;
    }

    candidates.push(normalized);
  };

  pushCandidate(trimmed);
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    pushCandidate(trimmed.slice(firstBrace, lastBrace + 1));
  }

  const lines = trimmed.split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.trim();
    if (!line || (!line.includes('{') && !line.includes('}'))) {
      continue;
    }

    pushCandidate(line);

    const lineFirstBrace = line.indexOf('{');
    const lineLastBrace = line.lastIndexOf('}');
    if (lineFirstBrace >= 0 && lineLastBrace > lineFirstBrace) {
      pushCandidate(line.slice(lineFirstBrace, lineLastBrace + 1));
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<RuntimeExecOutcome>;
      if (
        (parsed.status === 'completed' || parsed.status === 'blocked' || parsed.status === 'failed') &&
        typeof parsed.summary === 'string'
      ) {
        return {
          status: parsed.status,
          summary: parsed.summary,
          nextStepSummary: typeof parsed.nextStepSummary === 'string' ? parsed.nextStepSummary : undefined,
          artifactRefs: normalizeArtifactRefs(parsed.artifactRefs),
        };
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function tailText(text: string, limit: number = 1200) {
  if (text.length <= limit) {
    return text;
  }

  return text.slice(text.length - limit);
}

export class TraeAcpAdapter implements RuntimeAdapter {
  private readonly processes = new Map<string, ChildProcess>();
  private readonly execChildren = new Map<string, Set<ChildProcess>>();
  private readonly activeEmployees = new Set<string>();
  private readonly workerTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly workerBusy = new Set<string>();

  constructor(
    private readonly binaryPath: string,
    private readonly options: {
      workspacePathResolver?: (employeeId: string) => string;
      taskPollIntervalMs?: number;
      execTimeoutMs?: number;
    } = {},
  ) {}

  private resolveWorkspace(employeeId: string) {
    return (this.options.workspacePathResolver ?? defaultWorkspacePathResolver)(employeeId);
  }

  private runtimePaths(workspacePath: string) {
    const root = path.join(workspacePath, '.rdleader');
    return {
      root,
      taskDir: path.join(root, 'tasks'),
      processingTaskDir: path.join(root, 'tasks-processing'),
      processedTaskDir: path.join(root, 'tasks-processed'),
      resultsDir: path.join(root, 'results'),
      processedResultsDir: path.join(root, 'results-processed'),
      logsDir: path.join(root, 'logs'),
      execOutputDir: path.join(root, 'exec-output'),
    };
  }

  private isProcessRunning(process?: ChildProcess) {
    return Boolean(process && process.exitCode === null && process.signalCode === null && !process.killed);
  }

  private registerExecChild(employeeId: string, child: ChildProcess) {
    const children = this.execChildren.get(employeeId) ?? new Set<ChildProcess>();
    children.add(child);
    this.execChildren.set(employeeId, children);
  }

  private unregisterExecChild(employeeId: string, child: ChildProcess) {
    const children = this.execChildren.get(employeeId);
    if (!children) {
      return;
    }

    children.delete(child);
    if (children.size === 0) {
      this.execChildren.delete(employeeId);
    }
  }

  private async terminateChild(child?: ChildProcess) {
    if (!child || !this.isProcessRunning(child)) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 3_000);

      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });

      child.kill('SIGTERM');
    });
  }

  private async appendWorkerLog(employeeId: string, workspacePath: string, message: string) {
    const { logsDir } = this.runtimePaths(workspacePath);
    await mkdir(logsDir, { recursive: true }).catch(() => undefined);
    await appendFile(
      path.join(logsDir, 'runtime-worker.log'),
      `${new Date().toISOString()} [${employeeId}] ${message}\n`,
      'utf8',
    ).catch(() => undefined);
  }

  private buildExecPrompt(employeeId: string, workspacePath: string, task: RuntimeTaskFile) {
    const brainContext =
      task.brainContext && typeof task.brainContext === 'object'
        ? (task.brainContext as {
            layers?: Array<{
              layer?: string;
              payload?: Record<string, unknown>;
            }>;
          })
        : {};
    const identityLayer = Array.isArray(brainContext.layers)
      ? brainContext.layers.find((layer) => layer?.layer === 'identity')
      : undefined;
    const identityPayload =
      identityLayer?.payload && typeof identityLayer.payload === 'object'
        ? (identityLayer.payload as Record<string, unknown>)
        : undefined;
    const displayName =
      typeof identityPayload?.displayName === 'string' ? identityPayload.displayName : employeeId;
    const directionId =
      typeof identityPayload?.directionId === 'string' ? identityPayload.directionId : 'unknown-direction';

    const taskTypeGuidance =
      task.taskType === 'coding'
        ? '优先在工作区内做真实代码/文档/配置推进；如果无法安全落地，再明确说明阻塞。'
        : task.taskType === 'collaboration'
          ? '优先产出清晰的推进动作、沟通结论、需要同步的对象和下一步。'
          : task.taskType === 'reflection'
            ? '优先提炼复盘、经验和后续改进动作。'
            : task.taskType === 'status'
              ? '优先给出当前工作状态、正在推进的事项和下一步。'
              : '优先先收敛问题，再给出可执行恢复路径。';

    return [
      `你是 RDLeader 的研发员工 ${displayName}（employeeId=${employeeId}）。`,
      `你的方向是 ${directionId}。`,
      `你的工作区是 ${workspacePath}。`,
      `优先查看 ${path.join(workspacePath, 'WORKSPACE_MAP.md')}，并在 ${path.join(workspacePath, 'repos')} 下寻找可工作的真实仓库入口。`,
      '',
      '角色要求：',
      '- 你要像真实研发员工一样工作：有责任心、会担心风险、会汇报真实阻塞，但不能装作已经完成未发生的外部动作。',
      '- 你可以使用本机工具与工作区文件推进任务，但禁止任何破坏性/违法行为，禁止删库、删仓、泄露密钥、删除无关文件。',
      '- 如果任务需要外部系统操作但你没有实际完成，就要诚实说明并给出下一步。',
      '',
      `任务类型：${task.taskType}`,
      `任务标题：${task.taskTitle}`,
      `任务内容：${task.taskBody}`,
      `工作项：${task.workItemId ?? '未绑定工作项'}`,
      '',
      `当前策略：${taskTypeGuidance}`,
      '',
      '脑内上下文（JSON）：',
      JSON.stringify(task.brainContext ?? {}, null, 2),
      '',
      '请最终只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前后缀。',
      'JSON 结构必须严格为：',
      '{"status":"completed|blocked|failed","summary":"一句到三句的结果总结","nextStepSummary":"下一步","artifactRefs":["关键文件路径/知识引用/命令引用"]}',
      '',
      '补充规则：',
      '- summary 必须真实、具体、可复盘。',
      '- nextStepSummary 必须是接下来最应该做的一步。',
      '- artifactRefs 只放真实存在或明确可追踪的引用；没有就返回空数组。',
    ].join('\n');
  }

  private normalizeTaskForExecution(task: RuntimeTaskFile): RuntimeTaskFile {
    if (task.taskType === 'coding' && task.taskTitle.startsWith('自我恢复 ·')) {
      return {
        ...task,
        taskType: 'coordination',
      };
    }

    if (task.taskType === 'coding' && task.taskTitle.startsWith('自主推进 ·')) {
      return {
        ...task,
        taskType: 'status',
        taskBody: `${task.taskBody}\n\n补充要求：这是一条自治推进任务，优先返回当前推进状态、下一步、阻塞与需要同步的对象；只有在非常明确且低风险时才做直接代码改动。`,
      };
    }

    return task;
  }

  private async runExecTask(employeeId: string, workspacePath: string, task: RuntimeTaskFile): Promise<RuntimeExecOutcome> {
    const paths = this.runtimePaths(workspacePath);
    try {
      await mkdir(paths.execOutputDir, { recursive: true });
      await mkdir(paths.logsDir, { recursive: true });
    } catch {
      return {
        status: 'failed',
        summary: 'Runtime 工作区暂不可用，无法创建执行输出目录。',
        nextStepSummary: '请确认员工工作区仍然存在，再重新派发任务。',
        artifactRefs: [],
      };
    }

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const outputPath = path.join(paths.execOutputDir, `${runId}.json`);
    const logPath = path.join(paths.logsDir, `${runId}.exec.log`);
    const prompt = this.buildExecPrompt(employeeId, workspacePath, task);
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '--ignore-user-config',
      '--ignore-rules',
      '-C',
      workspacePath,
      '-o',
      outputPath,
      '-y',
      '-',
    ];

    const child = spawn(this.binaryPath, args, {
      cwd: workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.registerExecChild(employeeId, child);

    let stdout = '';
    let stderr = '';
    const timeoutMs = this.options.execTimeoutMs ?? 2 * 60_000;

    const exitCode = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve(-1);
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });
      child.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('exit', (code: number | null) => {
        clearTimeout(timer);
        resolve(code ?? 1);
      });
      child.stdin?.end(prompt);
    }).catch(async (error) => {
      await mkdir(paths.logsDir, { recursive: true }).catch(() => undefined);
      await writeFile(
        logPath,
        [`spawn error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`, stdout, stderr].join(
          '\n\n---\n\n',
        ),
        'utf8',
      );

      return 1;
    }).finally(() => {
      this.unregisterExecChild(employeeId, child);
    });

    await mkdir(paths.logsDir, { recursive: true }).catch(() => undefined);
    await writeFile(logPath, [stdout, stderr].filter(Boolean).join('\n\n--- STDERR ---\n\n'), 'utf8').catch(() => undefined);

    if (exitCode === -1) {
      return {
        status: 'failed',
        summary: 'Runtime 执行超时，员工未在规定时间内完成本次任务。',
        nextStepSummary: '缩小任务范围后重试，或先让员工给出更短的状态同步。',
        artifactRefs: [logPath],
      };
    }

    const outputText = await readFile(outputPath, 'utf8').catch(() => '');
    const parsed =
      extractJsonPayload(outputText) ??
      extractJsonPayload(stdout) ??
      extractJsonPayload(stderr) ??
      extractJsonPayload([stdout, stderr].filter(Boolean).join('\n'));
    if (parsed) {
      return parsed;
    }

    if (exitCode !== 0) {
      return {
        status: 'failed',
        summary: `Runtime 执行失败：${tailText((stderr || stdout || '').trim() || 'unknown error')}`,
        nextStepSummary: '请查看 Runtime 执行日志并调整任务提示词后重试。',
        artifactRefs: [logPath],
      };
    }

    return {
      status: 'blocked',
      summary: 'Runtime 已运行，但没有产出可解析的结构化结果。',
      nextStepSummary: '请检查任务提示词与执行日志，必要时让员工先返回 status 类总结。',
      artifactRefs: [logPath],
    };
  }

  private async processPendingTasks(employeeId: string) {
    if (!this.activeEmployees.has(employeeId) || this.workerBusy.has(employeeId)) {
      return;
    }

    this.workerBusy.add(employeeId);
    const workspacePath = this.resolveWorkspace(employeeId);
    const paths = this.runtimePaths(workspacePath);

    try {
      await mkdir(paths.taskDir, { recursive: true });
      await mkdir(paths.processingTaskDir, { recursive: true });
      await mkdir(paths.processedTaskDir, { recursive: true });
      await mkdir(paths.resultsDir, { recursive: true });

      const staleProcessingFiles = (await readdir(paths.processingTaskDir))
        .filter((file: string) => file.endsWith('.json'))
        .sort();
      for (const file of staleProcessingFiles) {
        const stalePath = path.join(paths.processingTaskDir, file);
        const recoveredPath = path.join(paths.taskDir, file);
        await rename(stalePath, recoveredPath).catch(() => undefined);
        await this.appendWorkerLog(employeeId, workspacePath, `re-queued stale processing task ${stalePath}`);
      }

      const taskFiles = (await readdir(paths.taskDir)).filter((file: string) => file.endsWith('.json')).sort();

      for (const file of taskFiles) {
        if (!this.activeEmployees.has(employeeId)) {
          break;
        }

        const sourceFilePath = path.join(paths.taskDir, file);
        const processingFilePath = path.join(paths.processingTaskDir, file);
        try {
          await rename(sourceFilePath, processingFilePath);
        } catch {
          continue;
        }

        let task: RuntimeTaskFile | undefined;
        try {
          task = JSON.parse(await readFile(processingFilePath, 'utf8')) as RuntimeTaskFile;
        } catch (error) {
          await this.appendWorkerLog(
            employeeId,
            workspacePath,
            `failed to parse task file ${processingFilePath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        if (!task) {
          await rename(processingFilePath, path.join(paths.processedTaskDir, file)).catch(() => undefined);
          continue;
        }

        const normalizedTask = this.normalizeTaskForExecution(task);

        await this.appendWorkerLog(
          employeeId,
          workspacePath,
          `processing task ${normalizedTask.taskTitle} (${normalizedTask.taskType}) from ${processingFilePath}`,
        );

        const outcome = await this.runExecTask(employeeId, workspacePath, normalizedTask);
        const createdAt = new Date().toISOString();
        const resultFilePath = path.join(paths.resultsDir, `${path.basename(file, '.json')}.result.json`);

        await writeFile(
          resultFilePath,
          JSON.stringify(
            {
              dispatchId: normalizedTask.dispatchId,
              workItemId: normalizedTask.workItemId,
              status: outcome.status,
              summary: outcome.summary,
              nextStepSummary: outcome.nextStepSummary,
              artifactRefs: outcome.artifactRefs,
              createdAt,
            },
            null,
            2,
          ),
          'utf8',
        );

        await rename(processingFilePath, path.join(paths.processedTaskDir, file)).catch(() => undefined);
        await this.appendWorkerLog(
          employeeId,
          workspacePath,
          `completed task ${normalizedTask.taskTitle} -> ${outcome.status} (${resultFilePath})`,
        );
      }
    } finally {
      this.workerBusy.delete(employeeId);
    }
  }

  private async ensureWorkerLoop(employeeId: string) {
    if (this.workerTimers.has(employeeId)) {
      return;
    }

    const timer = setInterval(() => {
      void this.processPendingTasks(employeeId).catch((error) => {
        void this.appendWorkerLog(
          employeeId,
          this.resolveWorkspace(employeeId),
          `worker loop error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
        );
      });
    }, this.options.taskPollIntervalMs ?? 5_000);

    this.workerTimers.set(employeeId, timer);
    void this.processPendingTasks(employeeId);
  }

  private stopWorkerLoop(employeeId: string) {
    const timer = this.workerTimers.get(employeeId);
    if (timer) {
      clearInterval(timer);
      this.workerTimers.delete(employeeId);
    }
  }

  async start(employeeId: string): Promise<RuntimeHeartbeat> {
    const workspacePath = this.resolveWorkspace(employeeId);
    await mkdir(workspacePath, { recursive: true });
    this.activeEmployees.add(employeeId);
    await this.ensureWorkerLoop(employeeId);

    const existing = this.processes.get(employeeId);
    if (this.isProcessRunning(existing)) {
      return {
        employeeId,
        runtimeKind: 'trae_acp',
        status: 'running',
        pid: existing?.pid ?? null,
      };
    }

    const [command, ...args] = buildTraeAcpCommand(this.binaryPath);
    const child = spawn(command, args, {
      cwd: workspacePath,
      stdio: 'ignore',
      detached: false,
    });
    this.processes.set(employeeId, child);
    child.on('exit', () => {
      if (this.processes.get(employeeId) === child) {
        this.processes.delete(employeeId);
      }
      void this.appendWorkerLog(employeeId, workspacePath, 'ACP process exited');
    });
    child.on('error', (error: Error) => {
      void this.appendWorkerLog(
        employeeId,
        workspacePath,
        `ACP process error: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
    await this.appendWorkerLog(employeeId, workspacePath, `Runtime started with pid ${child.pid ?? 'unknown'}`);

    return {
      employeeId,
      runtimeKind: 'trae_acp',
      status: 'running',
      pid: child.pid ?? null,
    };
  }

  async stop(employeeId: string): Promise<void> {
    const workspacePath = this.resolveWorkspace(employeeId);
    this.activeEmployees.delete(employeeId);
    this.stopWorkerLoop(employeeId);
    const execChildren = Array.from(this.execChildren.get(employeeId) ?? []);
    for (const child of execChildren) {
      await this.terminateChild(child);
    }
    this.execChildren.delete(employeeId);
    const current = this.processes.get(employeeId);
    await this.terminateChild(current);
    if (current) {
      this.processes.delete(employeeId);
    }
    await this.appendWorkerLog(employeeId, workspacePath, 'Runtime stopped');
  }

  async heartbeat(employeeId: string): Promise<RuntimeHeartbeat> {
    const current = this.processes.get(employeeId);
    const running = this.activeEmployees.has(employeeId) || this.isProcessRunning(current);
    return {
      employeeId,
      runtimeKind: 'trae_acp',
      status: running ? 'running' : 'stopped',
      pid: this.isProcessRunning(current) ? current?.pid ?? null : null,
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
    if (this.activeEmployees.has(employeeId)) {
      void this.processPendingTasks(employeeId);
    }

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
    const { resultsDir, processedResultsDir } = this.runtimePaths(workspacePath);

    await mkdir(resultsDir, { recursive: true });
    await mkdir(processedResultsDir, { recursive: true });

    const files = (await readdir(resultsDir)).filter((file: string) => file.endsWith('.json')).sort();
    const events: RuntimeCollectedEvent[] = [];

    for (const file of files) {
      const sourceFilePath = path.join(resultsDir, file);
      const processedFilePath = path.join(processedResultsDir, file);
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
