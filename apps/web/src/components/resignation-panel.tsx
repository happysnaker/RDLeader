import { useEffect, useState } from 'react';
import { acceptResignationAction, createResignationEvent, getResignationEvents } from '../lib/api';

export function ResignationPanel(props: {
  employeeId: string;
  onEmploymentStatusChange: (employmentStatus: string) => void;
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
    <section style={{ marginTop: 24 }}>
      <h3>离职流程</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => void recordIntent()}>记录离职倾向</button>
        <button onClick={() => void accept()}>接受离职</button>
      </div>
      <ul>
        {events.map((event) => (
          <li key={event.eventId}>
            <strong>{event.nextIntent}</strong>
            <div>{event.summary}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
