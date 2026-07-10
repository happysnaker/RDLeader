import { useEffect, useState } from 'react';
import { getProjectOpsEvents, type ProjectOpsEvent } from '../lib/api';
import { ExpandableText } from './expandable-text';
import { formatDisplayReference, formatDisplayText } from '../lib/display';

function formatActionLabel(actionKey: string) {
  const labels: Record<string, string> = {
    send_group_message: '群内推进',
    send_manager_dm: '老板同步',
    send_feishu_group_result: '群内结果同步',
    meego_lookup: 'Meego 查询',
    meego_update: 'Meego 更新',
    meego_comment: 'Meego 评论',
    create_tech_review_doc: '评审文档',
    schedule_tech_review: '评审会议',
    find_project_chat: '项目群搜索',
    create_bot_project_group: '创建机器人测试群',
    enable_bot_project_group_route: '切换机器人直发',
  };

  return labels[actionKey] ?? actionKey;
}

function formatHistoryTime(createdAt?: string | null) {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function ProjectOpsHistoryPanel(props: { employeeId: string; refreshKey?: number }) {
  const [events, setEvents] = useState<ProjectOpsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEvents(showLoading: boolean = true) {
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const payload = await getProjectOpsEvents(props.employeeId);
        if (!active) return;
        setEvents(Array.isArray(payload) ? payload : []);
        setLastSyncedAt(new Date().toISOString());
      } catch {
        if (!active) return;
        setEvents([]);
      } finally {
        if (active && showLoading) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();
    const timer = window.setInterval(() => {
      void loadEvents(false);
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.employeeId, props.refreshKey]);

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">历史</p>
          <h3>项目推进历史</h3>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--ready">自动同步</span>
          <span className="inline-state inline-state--light">{lastSyncedAt ? `同步于 ${formatHistoryTime(lastSyncedAt)}` : `${events.length} 条`}</span>
        </div>
      </div>
      {isLoading ? <p className="ops-inline-note">正在同步推进历史...</p> : null}
      {!isLoading && events.length === 0 ? <p className="ops-inline-note">还没有项目推进动作记录。</p> : null}
      <ul className="ops-list ops-list--compact ops-scroll-list">
        {events.map((event) => (
          <li key={event.eventId} className="ops-list-item">
            <div className="ops-list-item__header">
              <strong>{formatActionLabel(event.actionKey)}</strong>
              <span className="ops-badge ops-badge--neutral">{formatHistoryTime(event.createdAt)}</span>
            </div>
            <ExpandableText text={formatDisplayText(event.summary)} previewClassName="chat-message-body" />
            {event.nextStepSummary ? <p>下一步：{formatDisplayText(event.nextStepSummary)}</p> : null}
            {event.targetRef ? <p>目标：{formatDisplayReference(event.targetRef)}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
