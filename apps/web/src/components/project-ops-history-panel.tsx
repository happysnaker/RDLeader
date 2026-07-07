import { useEffect, useState } from 'react';
import { getProjectOpsEvents, type ProjectOpsEvent } from '../lib/api';

export function ProjectOpsHistoryPanel(props: { employeeId: string; refreshKey?: number }) {
  const [events, setEvents] = useState<ProjectOpsEvent[]>([]);

  useEffect(() => {
    let active = true;

    void getProjectOpsEvents(props.employeeId).then((payload) => {
      if (!active) return;
      setEvents(Array.isArray(payload) ? payload : []);
    });

    return () => {
      active = false;
    };
  }, [props.employeeId, props.refreshKey]);

  return (
    <section style={{ marginTop: 24 }}>
      <h3>项目推进历史</h3>
      <ul>
        {events.map((event) => (
          <li key={event.eventId}>
            <strong>{event.summary}</strong>
            <div>下一步：{event.nextStepSummary ?? '-'}</div>
            <div>动作：{event.actionKey}</div>
            <div>时间：{event.createdAt}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
