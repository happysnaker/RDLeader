import { useEffect, useState } from 'react';
import { acceptResignationAction, createResignationEvent, getResignationEvents } from '../lib/api';

export function ResignationPanel(props: {
  employeeId: string;
  onEmploymentStatusChange: (employmentStatus: string) => void;
  compact?: boolean;
}) {
  const [events, setEvents] = useState<Array<{ eventId: string; nextIntent: string; summary: string }>>([]);

  useEffect(() => {
    void getResignationEvents(props.employeeId).then(setEvents);
  }, [props.employeeId]);

  async function recordIntent() {
    const event = await createResignationEvent(props.employeeId, {
      nextIntent: 'submitted',
      summary: '员工在高压下明确表达离职意愿',
    });
    setEvents((current) => [event, ...current]);
  }

  async function accept() {
    const payload = await acceptResignationAction(props.employeeId);
    props.onEmploymentStatusChange(payload.employmentStatus);
  }

  return (
    <section className="ops-section ops-section--compact">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">离职流程</p>
          <h3>离职流程</h3>
        </div>
        <span className="ops-badge ops-badge--neutral">{events.length} 条</span>
      </div>
      {props.compact ? (
        <details className="ops-segment">
          <summary>离职操作</summary>
          <div className="ops-actions">
            <button onClick={() => void recordIntent()}>记录离职倾向</button>
            <button onClick={() => void accept()}>接受离职</button>
          </div>
        </details>
      ) : (
        <div className="ops-actions">
          <button onClick={() => void recordIntent()}>记录离职倾向</button>
          <button onClick={() => void accept()}>接受离职</button>
        </div>
      )}
      <ul className="ops-list ops-list--compact">
        {events.slice(0, 3).map((event) => (
          <li key={event.eventId} className="ops-list-item">
            <strong>{event.nextIntent}</strong>
            <p>{event.summary}</p>
          </li>
        ))}
        {events.length === 0 ? <li className="ops-list-item"><p className="ops-inline-note">当前没有离职流程记录。</p></li> : null}
      </ul>
    </section>
  );
}
