import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const baseUrl = process.env.RDLEADER_BASE_URL ?? 'http://127.0.0.1:3001';
const employeeId = process.env.RDLEADER_ENDURANCE_EMPLOYEE_ID ?? 'lushirong';
const cycles = Number(process.env.RDLEADER_ENDURANCE_CYCLES ?? 2);
const rootDir = '/Users/bytedance/GolandProjects/DevPlan/RdLeader';
const reportsDir = path.join(rootDir, 'docs', 'qa', 'reports');
const runtimeRoot = path.join(os.homedir(), 'GolandProjects', 'E', employeeId, '.rdleader');

async function requestJson(urlPath, options = {}) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers: {
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: response.ok, status: response.status, payload };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function clearPendingRuntimeState() {
  for (const dirName of ['tasks', 'tasks-processing', 'results']) {
    const dirPath = path.join(runtimeRoot, dirName);
    await fs.mkdir(dirPath, { recursive: true });
    const entries = await fs.readdir(dirPath).catch(() => []);
    await Promise.all(
      entries
        .filter((name) => name.endsWith('.json'))
        .map((name) => fs.rm(path.join(dirPath, name), { force: true }).catch(() => undefined)),
    );
  }
}

async function runCycle(index) {
  const cycleId = `endurance-${Date.now()}-${index}`;
  const taskFile = path.join(runtimeRoot, 'tasks-processing', `${cycleId}.json`);
  const processedTask = path.join(runtimeRoot, 'tasks-processed', `${cycleId}.json`);
  const resultFile = path.join(runtimeRoot, 'results', `${cycleId}.result.json`);
  const processedResultFile = path.join(runtimeRoot, 'results-processed', `${cycleId}.result.json`);

  await requestJson(`/employees/${employeeId}/runtime/stop`, { method: 'POST' }).catch(() => undefined);
  await clearPendingRuntimeState();
  await fs.mkdir(path.join(runtimeRoot, 'tasks-processing'), { recursive: true });
  await fs.writeFile(
    taskFile,
    JSON.stringify(
      {
        employeeId,
        taskTitle: `QA endurance recovery ${index}`,
        taskBody:
          '这是 RDLeader Runtime endurance/stale-processing recovery 验证任务。不要检查仓库，不要扫描代码，不要做额外研究。请立即且只输出一个 JSON 对象：{"status":"completed","summary":"已完成 endurance stale recovery 验证任务并成功返回结构化结果。","nextStepSummary":"等待控制面收取本轮结果并继续下一轮验证。","artifactRefs":[]}',
        taskType: 'status',
        dispatchedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );

  const startResponse = await requestJson(`/employees/${employeeId}/runtime/start`, {
    method: 'POST',
  });

  let recovered = false;
  let resultEmitted = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(3000);
    const processedTaskExists = await exists(processedTask);
    const resultFileExists = await exists(resultFile);
    const processedResultFileExists = await exists(processedResultFile);
    if (processedTaskExists) {
      recovered = true;
    }
    if (resultFileExists || processedResultFileExists) {
      resultEmitted = true;
    }
    if (recovered && resultEmitted) {
      break;
    }
  }

  const collectResponse = await requestJson(`/employees/${employeeId}/actions/collect-runtime-events`, {
    method: 'POST',
  });
  let archivedResult = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await exists(processedResultFile)) {
      archivedResult = true;
      break;
    }
    await sleep(1000);
  }
  const resultsResponse = await requestJson(`/employees/${employeeId}/runtime-results`);
  const cycleEvent = Array.isArray(resultsResponse.payload)
    ? resultsResponse.payload.find(
        (item) =>
          typeof item?.processedFilePath === 'string'
            ? item.processedFilePath.includes(`${cycleId}.result.json`)
            : typeof item?.sourceFilePath === 'string' && item.sourceFilePath.includes(`${cycleId}.result.json`),
      )
    : null;

  const passed =
    recovered &&
    resultEmitted &&
    archivedResult &&
    collectResponse.ok &&
    Boolean(cycleEvent) &&
    cycleEvent?.status === 'completed';

  return {
    cycle: index,
    cycleId,
    passed,
    recovered,
    resultEmitted,
    archivedResult,
    startResponse,
    collectResponse,
    cycleEvent,
    artifacts: {
      taskFile,
      processedTask,
      resultFile,
      processedResultFile,
    },
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const cycleResults = [];
  let failures = 0;

  for (let i = 1; i <= cycles; i += 1) {
    const result = await runCycle(i);
    cycleResults.push(result);
    if (!result.passed || !result.startResponse.ok || !result.collectResponse.ok) {
      failures += 1;
    }
  }

  await requestJson(`/employees/${employeeId}/runtime/stop`, { method: 'POST' }).catch(() => undefined);

  const finishedAt = new Date().toISOString();
  const report = {
    baseUrl,
    employeeId,
    startedAt,
    finishedAt,
    summary: {
      cycles,
      passed: cycles - failures,
      failed: failures,
    },
    cycleResults,
  };

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'latest-runtime-endurance.json'), JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(
    path.join(reportsDir, 'latest-runtime-endurance.md'),
    [
      '# RDLeader Runtime Endurance Report',
      '',
      `- employeeId: ${employeeId}`,
      `- startedAt: ${startedAt}`,
      `- finishedAt: ${finishedAt}`,
      `- cycles: ${cycles}`,
      `- passed: ${cycles - failures}`,
      '',
      '| Cycle | Verdict | Recovered | Result Emitted | Archived | Event Status | Summary |',
      '|---|---|---|---|---|---|---|',
      ...cycleResults.map((item) =>
        `| ${item.cycle} | ${item.passed ? 'pass' : 'fail'} | ${item.recovered ? 'yes' : 'no'} | ${
          item.resultEmitted ? 'yes' : 'no'
        } | ${item.archivedResult ? 'yes' : 'no'} | ${item.cycleEvent?.status ?? '-'} | ${String(
          item.cycleEvent?.summary ?? '',
        ).replace(/\n/g, '<br/>')} |`,
      ),
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch(async (error) => {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(
    path.join(reportsDir, 'latest-runtime-endurance-error.json'),
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        error: error instanceof Error ? error.stack ?? error.message : String(error),
      },
      null,
      2,
    ),
    'utf8',
  );
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
