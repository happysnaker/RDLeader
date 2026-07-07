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

export function RuntimeDispatchPanel(props: {
  employeeId: string;
  onAssignmentsChange?: (openTitles: string[]) => void;
  onRuntimeStateChange?: (runtime: { status: string; pid: number | null }) => void;
  onResultsCollected?: (payload: {
    recentDoneSummary: string;
    nextStepSummary?: string | null;
    currentAssignments: string[];
  }) => void;
}) {
  const [dispatches, setDispatches] = useState<RuntimeDispatch[]>([]);
  const [results, setResults] = useState<RuntimeResultEvent[]>([]);
  const [sessions, setSessions] = useState<RuntimeSession[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskBody, setTaskBody] = useState('');
  const [taskType, setTaskType] = useState<'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration'>('coding');

  useEffect(() => {
    let active = true;

    void Promise.all([
      getRuntimeDispatches(props.employeeId),
      getRuntimeResults(props.employeeId),
      getRuntimeSessions(props.employeeId),
      getWorkItems(props.employeeId),
    ]).then(([nextDispatches, nextResults, nextSessions, nextWorkItems]) => {
      if (!active) return;
      setDispatches(Array.isArray(nextDispatches) ? nextDispatches : []);
      setResults(Array.isArray(nextResults) ? nextResults : []);
      setSessions(Array.isArray(nextSessions) ? nextSessions : []);
      const normalizedWorkItems = Array.isArray(nextWorkItems) ? nextWorkItems : [];
      setWorkItems(normalizedWorkItems);
      setSelectedWorkItemId(normalizedWorkItems[0]?.workItemId ?? '');
      props.onAssignmentsChange?.(normalizedWorkItems.filter((item) => item.status !== 'completed').map((item) => item.title));
    });

    return () => {
      active = false;
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
    setTaskTitle('');
    setTaskBody('');
    setTaskType('coding');
  }

  async function collect() {
    const payload = await collectRuntimeEventsAction(props.employeeId);
    const events = Array.isArray(payload.events) ? payload.events : [];
    const nextResults = [...events, ...results];
    setResults(nextResults);

    if (events.length > 0) {
      const loadedWorkItems = workItems.length > 0 ? workItems : await getWorkItems(props.employeeId);
      const currentWorkItems = Array.isArray(loadedWorkItems) ? loadedWorkItems : [];
      const updatedWorkItems = currentWorkItems.map((item) => {
        const matched = events.find((event) => event.workItemId === item.workItemId);
        return matched ? { ...item, status: matched.status === 'completed' ? 'completed' : 'blocked' } : item;
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
  }

  async function startRuntime() {
    const payload = await startRuntimeAction(props.employeeId);
    props.onRuntimeStateChange?.({
      status: payload.runtime.status,
      pid: payload.runtime.pid,
    });
    if (payload.session) {
      setSessions((current) => [payload.session!, ...current]);
    }
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
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>Runtime 任务派发</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => void startRuntime()}>启动 Runtime</button>
        <button onClick={() => void stopRuntime()}>停止 Runtime</button>
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <select value={selectedWorkItemId} onChange={(event) => setSelectedWorkItemId(event.target.value)}>
          <option value="">不关联工作项</option>
          {workItems.map((workItem) => (
            <option key={workItem.workItemId} value={workItem.workItemId}>
              {workItem.title}
            </option>
          ))}
        </select>
        <input placeholder="Runtime 任务标题" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
        <textarea placeholder="Runtime 任务内容" value={taskBody} onChange={(event) => setTaskBody(event.target.value)} />
        <select value={taskType} onChange={(event) => setTaskType(event.target.value as typeof taskType)}>
          <option value="coding">coding</option>
          <option value="coordination">coordination</option>
          <option value="status">status</option>
          <option value="reflection">reflection</option>
          <option value="collaboration">collaboration</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void submit()}>派发到 Runtime</button>
          <button onClick={() => void collect()}>收取 Runtime 结果</button>
        </div>
      </div>
      <ul>
        {dispatches.map((dispatch) => (
          <li key={dispatch.dispatchId}>
            <strong>
              {dispatch.taskTitle} · {dispatch.taskType}
            </strong>
            <div>{dispatch.taskBody}</div>
            <div>状态：{dispatch.status}</div>
            <div>任务文件：{dispatch.runtimeReceipt?.taskFilePath ?? dispatch.workspaceTaskRef}</div>
          </li>
        ))}
      </ul>
      <h4>Runtime 结果</h4>
      <ul>
        {results.map((event) => (
          <li key={event.eventId}>
            <strong>
              {event.status} · {event.summary}
            </strong>
            {event.nextStepSummary ? <div>下一步：{event.nextStepSummary}</div> : null}
            <div>结果文件：{event.processedFilePath}</div>
          </li>
        ))}
      </ul>
      <h4>Runtime 会话</h4>
      <ul>
        {sessions.map((session) => (
          <li key={session.sessionId}>
            <strong>
              {session.status} · pid {session.pid ?? '-'}
            </strong>
            <div>启动：{session.startedAt}</div>
            {session.stoppedAt ? <div>停止：{session.stoppedAt}</div> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
