import { useEffect, useMemo, useState } from 'react';
import { createWorkItem, getWorkItems, updateWorkItemStatus, type WorkItem } from '../lib/api';
import { formatDisplayText } from '../lib/display';

function formatWorkItemStatusLabel(status: WorkItem['status']) {
  if (status === 'active') return '进行中';
  if (status === 'blocked') return '阻塞';
  return '已完成';
}

function normalizeWorkItems(items: WorkItem[] | null | undefined) {
  return Array.isArray(items) ? items : [];
}

export function WorkItemPanel(props: {
  employeeId: string;
  onAssignmentsChange?: (openTitles: string[]) => void;
}) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    let active = true;

    void getWorkItems(props.employeeId).then((payload) => {
      if (!active) return;
      const normalized = normalizeWorkItems(payload);
      setWorkItems(normalized);
      props.onAssignmentsChange?.(normalized.filter((item) => item.status !== 'completed').map((item) => item.title));
    });

    return () => {
      active = false;
    };
  }, [props.employeeId]);

  const openTitles = useMemo(
    () => workItems.filter((item) => item.status !== 'completed').map((item) => item.title),
    [workItems],
  );

  async function submit() {
    if (!title.trim() || !summary.trim()) return;

    const created = await createWorkItem(props.employeeId, {
      title,
      summary,
      status: 'active',
    });
    const next = [created, ...workItems];
    setWorkItems(next);
    props.onAssignmentsChange?.(next.filter((item) => item.status !== 'completed').map((item) => item.title));
    setTitle('');
    setSummary('');
  }

  async function changeStatus(workItemId: string, status: 'active' | 'blocked' | 'completed') {
    const updated = await updateWorkItemStatus(workItemId, status);
    const next = workItems.map((item) => (item.workItemId === workItemId ? updated : item));
    setWorkItems(next);
    props.onAssignmentsChange?.(next.filter((item) => item.status !== 'completed').map((item) => item.title));
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">任务</p>
          <h3>任务看板</h3>
        </div>
        <span className="inline-state inline-state--light">{openTitles.length} 个进行中</span>
      </div>
      <p>当前活跃任务数：{openTitles.length}</p>

      <details className="ops-segment">
        <summary>新建任务</summary>
        <div className="ops-form-grid">
          <input placeholder="任务标题" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea placeholder="任务摘要" value={summary} onChange={(event) => setSummary(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void submit()}>添加任务</button>
          </div>
        </div>
      </details>

      <ul className="ops-list ops-list--compact ops-scroll-list">
        {workItems.map((item) => (
          <li key={item.workItemId} className="ops-list-item">
            <div className="ops-list-item__header">
              <strong>{item.title}</strong>
              <span className={`ops-badge ops-badge--${item.status}`}>{formatWorkItemStatusLabel(item.status)}</span>
            </div>
            <p>{formatDisplayText(item.summary)}</p>
            <div className="ops-actions">
              {item.status !== 'active' ? (
                <button onClick={() => void changeStatus(item.workItemId, 'active')}>标记活跃</button>
              ) : null}
              {item.status !== 'blocked' ? (
                <button onClick={() => void changeStatus(item.workItemId, 'blocked')}>标记阻塞</button>
              ) : null}
              {item.status !== 'completed' ? (
                <button onClick={() => void changeStatus(item.workItemId, 'completed')}>标记完成</button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
