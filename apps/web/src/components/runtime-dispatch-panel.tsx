import { useEffect, useState } from 'react';
import { createRuntimeDispatch, getRuntimeDispatches, getWorkItems, type RuntimeDispatch, type WorkItem } from '../lib/api';

export function RuntimeDispatchPanel(props: { employeeId: string }) {
  const [dispatches, setDispatches] = useState<RuntimeDispatch[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskBody, setTaskBody] = useState('');
  const [taskType, setTaskType] = useState<'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration'>('coding');

  useEffect(() => {
    let active = true;

    void Promise.all([getRuntimeDispatches(props.employeeId), getWorkItems(props.employeeId)]).then(([nextDispatches, nextWorkItems]) => {
      if (!active) return;
      setDispatches(Array.isArray(nextDispatches) ? nextDispatches : []);
      const normalizedWorkItems = Array.isArray(nextWorkItems) ? nextWorkItems : [];
      setWorkItems(normalizedWorkItems);
      setSelectedWorkItemId(normalizedWorkItems[0]?.workItemId ?? '');
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

  return (
    <section style={{ marginTop: 24 }}>
      <h3>Runtime 任务派发</h3>
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
        <button onClick={() => void submit()}>派发到 Runtime</button>
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
    </section>
  );
}
