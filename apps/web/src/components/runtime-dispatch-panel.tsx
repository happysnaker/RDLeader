import { useEffect, useState } from 'react';
import {
  collectRuntimeEventsAction,
  createRuntimeDispatch,
  getRuntimeDispatches,
  getRuntimeResults,
  getRuntimeSessions,
  getWorkItems,
  startRuntimeAction,
  stopRuntimeAction,
  type RuntimeDispatch,
  type RuntimeResultEvent,
  type RuntimeSession,
  type WorkItem,
} from '../lib/api';
import { ExpandableText } from './expandable-text';
import { formatDisplayReference, formatDisplayText } from '../lib/display';

function formatTaskTypeLabel(taskType: RuntimeDispatch['taskType']) {
  if (taskType === 'coding') return '研发';
  if (taskType === 'coordination') return '协同';
  if (taskType === 'status') return '状态';
  if (taskType === 'reflection') return '复盘';
  return '协作';
}

function taskTypeOptionLabel(taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration') {
  return formatTaskTypeLabel(taskType as RuntimeDispatch['taskType']);
}

function formatRuntimeStatusLabel(status?: string | null) {
  if (status === 'running') return '运行中';
  if (status === 'stopped') return '已停止';
  if (status === 'completed') return '已完成';
  if (status === 'blocked') return '阻塞';
  if (status === 'failed') return '失败';
  if (status === 'queued') return '排队中';
  if (status === 'dispatched') return '已派发';
  return status ?? '-';
}

function formatRuntimeTime(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function normalizeRuntimeResults(payload: RuntimeResultEvent[] | null | undefined) {
  return Array.isArray(payload) ? payload : [];
}

function normalizeRuntimeSessions(payload: RuntimeSession[] | null | undefined) {
  return Array.isArray(payload) ? payload : [];
}

function upsertSessionArray(current: RuntimeSession[], session: RuntimeSession) {
  const existing = current.find((item) => item.sessionId === session.sessionId);
  if (existing) {
    return current.map((item) => (item.sessionId === session.sessionId ? session : item));
  }

  return [session, ...current];
}

function mergeDispatches(current: RuntimeDispatch[], incoming: RuntimeDispatch[]) {
  const merged = [...incoming, ...current].filter(
    (dispatch, index, array) => array.findIndex((candidate) => candidate.dispatchId === dispatch.dispatchId) === index,
  );

  return merged.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function mergeResults(current: RuntimeResultEvent[], incoming: RuntimeResultEvent[]) {
  const merged = [...incoming, ...current].filter(
    (event, index, array) => array.findIndex((candidate) => candidate.eventId === event.eventId) === index,
  );

  return merged.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function mergeSessions(current: RuntimeSession[], incoming: RuntimeSession[]) {
  const next = new Map(current.map((session) => [session.sessionId, session] as const));

  for (const session of incoming) {
    const existing = next.get(session.sessionId);
    if (!existing) {
      next.set(session.sessionId, session);
      continue;
    }

    if (existing.stoppedAt && !session.stoppedAt) {
      continue;
    }

    if (session.stoppedAt && !existing.stoppedAt) {
      next.set(session.sessionId, session);
      continue;
    }

    next.set(session.sessionId, session);
  }

  return Array.from(next.values()).sort((left, right) => String(right.startedAt).localeCompare(String(left.startedAt)));
}

export function RuntimeDispatchPanel(props: {
  employeeId: string;
  initialResults?: RuntimeResultEvent[] | null;
  initialSessions?: RuntimeSession[] | null;
  onAssignmentsChange?: (openTitles: string[]) => void;
  onRuntimeStateChange?: (runtime: { status: string; pid: number | null }) => void;
  onResultsCollected?: (payload: {
    recentDoneSummary: string;
    nextStepSummary?: string | null;
    currentAssignments: string[];
  }) => void;
}) {
  const [dispatches, setDispatches] = useState<RuntimeDispatch[]>([]);
  const [results, setResults] = useState<RuntimeResultEvent[]>(normalizeRuntimeResults(props.initialResults));
  const [sessions, setSessions] = useState<RuntimeSession[]>(normalizeRuntimeSessions(props.initialSessions));
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskBody, setTaskBody] = useState('');
  const [taskType, setTaskType] = useState<'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration'>('coding');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    setResults(normalizeRuntimeResults(props.initialResults));
    setSessions(normalizeRuntimeSessions(props.initialSessions));
  }, [props.employeeId, props.initialResults, props.initialSessions]);

  useEffect(() => {
    let active = true;

    async function loadPanels() {
      const [nextDispatches, nextResults, nextSessions, nextWorkItems] = await Promise.all([
        getRuntimeDispatches(props.employeeId),
        getRuntimeResults(props.employeeId),
        getRuntimeSessions(props.employeeId),
        getWorkItems(props.employeeId),
      ]);
      if (!active) return;
      setDispatches((current) => mergeDispatches(current, Array.isArray(nextDispatches) ? nextDispatches : []));
      setResults((current) => mergeResults(current, Array.isArray(nextResults) ? nextResults : []));
      setSessions((current) => mergeSessions(current, Array.isArray(nextSessions) ? nextSessions : []));
      const normalizedWorkItems = Array.isArray(nextWorkItems) ? nextWorkItems : [];
      setWorkItems(normalizedWorkItems);
      setSelectedWorkItemId((current) => current || normalizedWorkItems[0]?.workItemId || '');
      props.onAssignmentsChange?.(normalizedWorkItems.filter((item) => item.status !== 'completed').map((item) => item.title));
      setLastSyncedAt(new Date().toISOString());
    }

    void loadPanels();
    const timer = window.setInterval(() => {
      void loadPanels();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.employeeId]);

  async function submit() {
    if (!taskTitle.trim() || !taskBody.trim()) return;

    const dispatch = await createRuntimeDispatch(props.employeeId, {
      workItemId: selectedWorkItemId || undefined,
      taskTitle,
      taskBody,
      taskType,
    });
    setDispatches((current) => [dispatch, ...current]);
    if (dispatch.runtime) {
      props.onRuntimeStateChange?.({
        status: dispatch.runtime.status,
        pid: dispatch.runtime.pid,
      });
    }
    if (dispatch.session) {
      setSessions((current) => {
        const existing = current.find((session) => session.sessionId === dispatch.session!.sessionId);
        if (existing) {
          return current.map((session) => (session.sessionId === dispatch.session!.sessionId ? dispatch.session! : session));
        }
        return [dispatch.session!, ...current];
      });
    }
    setTaskTitle('');
    setTaskBody('');
    setTaskType('coding');
    setLastSyncedAt(new Date().toISOString());
  }

  async function collect() {
    const payload = await collectRuntimeEventsAction(props.employeeId);
    const events = Array.isArray(payload.events) ? payload.events : [];
    if (events.length === 0) {
      const [latestResults, latestSessions] = await Promise.all([
        getRuntimeResults(props.employeeId),
        getRuntimeSessions(props.employeeId),
      ]);
      setResults(Array.isArray(latestResults) ? latestResults : []);
      setSessions(Array.isArray(latestSessions) ? latestSessions : []);
      return;
    }

    const nextResults = [...events, ...results];
    setResults(
      nextResults.filter(
        (event, index, array) => array.findIndex((candidate) => candidate.eventId === event.eventId) === index,
      ),
    );
    setLastSyncedAt(new Date().toISOString());

    const loadedWorkItems = workItems.length > 0 ? workItems : await getWorkItems(props.employeeId);
    const currentWorkItems = Array.isArray(loadedWorkItems) ? loadedWorkItems : [];
    const updatedWorkItems = currentWorkItems.map((item) => {
      const matched = events.find((event) => event.workItemId === item.workItemId);
      return matched
        ? {
            ...item,
            status: (matched.status === 'completed' ? 'completed' : 'blocked') as WorkItem['status'],
          }
        : item;
    });
    setWorkItems(updatedWorkItems);
    const openTitles = updatedWorkItems.filter((item) => item.status !== 'completed').map((item) => item.title);
    props.onAssignmentsChange?.(openTitles);

    const latestEvent = events[0]!;
    props.onResultsCollected?.({
      recentDoneSummary: latestEvent.summary,
      nextStepSummary: latestEvent.nextStepSummary ?? undefined,
      currentAssignments: openTitles,
    });
  }

  async function startRuntime() {
    const payload = await startRuntimeAction(props.employeeId);
    props.onRuntimeStateChange?.({
      status: payload.runtime.status,
      pid: payload.runtime.pid,
    });
    if (payload.session) {
      setSessions((current) => upsertSessionArray(current, payload.session!));
    }
    setLastSyncedAt(new Date().toISOString());
  }

  async function stopRuntime() {
    const payload = await stopRuntimeAction(props.employeeId);
    props.onRuntimeStateChange?.({
      status: payload.runtime.status,
      pid: payload.runtime.pid,
    });
    if (payload.session) {
      setSessions((current) =>
        current.map((session) => (session.sessionId === payload.session!.sessionId ? payload.session! : session)),
      );
    }
    setLastSyncedAt(new Date().toISOString());
  }

  const latestSession = sessions[0] ?? null;
  const runningSessionCount = sessions.filter((session) => session.status === 'running').length;
  const openWorkItemCount = workItems.filter((item) => item.status !== 'completed').length;
  const completedResultCount = results.filter((event) => event.status === 'completed').length;
  const unresolvedResultCount = results.filter((event) => event.status === 'blocked' || event.status === 'failed').length;

  return (
    <section className="ops-section runtime-console">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">运行时</p>
          <h3>运行时控制台</h3>
          <p className="ops-section__summary-note">自动轮询派发、结果和会话状态，适合直接盯运行时健康度与结果回流。</p>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">{formatRuntimeStatusLabel(latestSession?.status ?? 'stopped')}</span>
          <span className="inline-state inline-state--light">{lastSyncedAt ? `同步于 ${formatRuntimeTime(lastSyncedAt)}` : '准备同步'}</span>
        </div>
      </div>
      <div className="runtime-console__stats">
        <div className="runtime-console__stat">
          <span>活跃会话</span>
          <strong>{runningSessionCount}</strong>
          <p>{latestSession ? `最近进程号 ${latestSession.pid ?? '-'}` : '当前还没有运行时会话'}</p>
        </div>
        <div className="runtime-console__stat">
          <span>待处理任务</span>
          <strong>{openWorkItemCount}</strong>
          <p>尚未完成的工作项数量</p>
        </div>
        <div className="runtime-console__stat">
          <span>结果回流</span>
          <strong>{results.length}</strong>
          <p>{completedResultCount} 条已完成结果</p>
        </div>
        <div className="runtime-console__stat">
          <span>需关注</span>
          <strong>{unresolvedResultCount}</strong>
          <p>失败或阻塞的回流结果</p>
        </div>
      </div>
      <div className="ops-actions">
        <button onClick={() => void startRuntime()}>启动运行时</button>
        <button onClick={() => void stopRuntime()}>停止运行时</button>
      </div>
      <details className="ops-segment">
        <summary>派发运行时任务</summary>
        <div className="ops-form-grid">
          <select value={selectedWorkItemId} onChange={(event) => setSelectedWorkItemId(event.target.value)}>
            <option value="">不关联工作项</option>
            {workItems.map((workItem) => (
              <option key={workItem.workItemId} value={workItem.workItemId}>
                {workItem.title}
              </option>
            ))}
          </select>
          <input placeholder="运行时任务标题" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
          <textarea placeholder="运行时任务内容" value={taskBody} onChange={(event) => setTaskBody(event.target.value)} />
          <select value={taskType} onChange={(event) => setTaskType(event.target.value as typeof taskType)}>
            <option value="coding">{taskTypeOptionLabel('coding')}</option>
            <option value="coordination">{taskTypeOptionLabel('coordination')}</option>
            <option value="status">{taskTypeOptionLabel('status')}</option>
            <option value="reflection">{taskTypeOptionLabel('reflection')}</option>
            <option value="collaboration">{taskTypeOptionLabel('collaboration')}</option>
          </select>
          <div className="ops-actions">
            <button onClick={() => void submit()}>派发到运行时</button>
            <button onClick={() => void collect()}>收取运行时结果</button>
          </div>
        </div>
      </details>

      <div className="runtime-console__subgrid">
        <section className="runtime-console__section">
          <div className="ops-section__header">
            <div>
              <p className="eyebrow">派发</p>
              <h4>派发记录</h4>
            </div>
            <span className="inline-state inline-state--light">{dispatches.length} 条</span>
          </div>
          <ul className="ops-list ops-list--compact ops-scroll-list">
            {dispatches.map((dispatch) => (
              <li key={dispatch.dispatchId} className="ops-list-item">
                <div className="ops-list-item__header">
                  <strong>{dispatch.taskTitle}</strong>
                  <span className="ops-badge ops-badge--neutral">{formatTaskTypeLabel(dispatch.taskType)}</span>
                </div>
                <ExpandableText text={formatDisplayText(dispatch.taskBody)} maxLength={150} />
                <p>状态：{formatRuntimeStatusLabel(dispatch.status)} · 创建于 {formatRuntimeTime(dispatch.createdAt)}</p>
                <p>
                  任务文件：
                  <span className="reference-text">{formatDisplayReference(dispatch.runtimeReceipt?.taskFilePath ?? dispatch.workspaceTaskRef)}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="runtime-console__section">
          <div className="ops-section__header">
            <div>
              <p className="eyebrow">回流</p>
              <h4>结果回流</h4>
            </div>
            <span className="inline-state inline-state--light">{results.length} 条</span>
          </div>
          <ul className="ops-list ops-list--compact ops-scroll-list">
            {results.map((event) => (
              <li key={event.eventId} className="ops-list-item">
                <div className="ops-list-item__header">
                  <strong>{formatRuntimeStatusLabel(event.status)}</strong>
                  <span className={`ops-badge ops-badge--${event.status}`}>{formatRuntimeStatusLabel(event.status)}</span>
                </div>
                <ExpandableText text={formatDisplayText(event.summary)} maxLength={150} />
                {event.nextStepSummary ? <p>下一步：{formatDisplayText(event.nextStepSummary)}</p> : null}
                <p>
                  结果文件：
                  <span className="reference-text">{formatDisplayReference(event.processedFilePath)}</span>
                </p>
                <p>回流时间：{formatRuntimeTime(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="runtime-console__timeline">
        <div className="ops-section__header">
          <div>
            <p className="eyebrow">会话</p>
            <h4>会话时间线</h4>
          </div>
          <span className="inline-state inline-state--light">{sessions.length} 条</span>
        </div>
        <ul className="ops-list ops-list--compact ops-scroll-list">
          {sessions.map((session) => (
            <li key={session.sessionId} className="ops-list-item">
              <div className="ops-list-item__header">
                <strong>会话 {session.sessionId}</strong>
                <span className="ops-badge ops-badge--neutral">{formatRuntimeStatusLabel(session.status)}</span>
              </div>
              <p>进程号：{session.pid ?? '-'}</p>
              <p>启动：{formatRuntimeTime(session.startedAt)}</p>
              {session.stoppedAt ? <p>停止：{formatRuntimeTime(session.stoppedAt)}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
