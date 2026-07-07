import { useEffect, useState } from 'react';
import { createEmotionEvent, getEmotionEvents } from '../lib/api';

export function EmotionPanel(props: { employeeId: string }) {
  const [events, setEvents] = useState<
    Array<{ eventId: string; eventType: string; nextEmotion: string; summary: string }>
  >([]);

  useEffect(() => {
    void getEmotionEvents(props.employeeId).then(setEvents);
  }, [props.employeeId]);

  async function recordPositiveFeedback() {
    const event = await createEmotionEvent(props.employeeId, {
      eventType: 'positive_feedback',
      intensityDelta: -0.15,
      nextEmotion: 'proud',
      summary: '老板认可推进质量，员工情绪转为自豪',
    });
    setEvents((current) => [event, ...current]);
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>情绪事件</h3>
      <button onClick={() => void recordPositiveFeedback()}>记录正向反馈</button>
      <ul>
        {events.map((event) => (
          <li key={event.eventId}>
            <strong>
              {event.eventType} → {event.nextEmotion}
            </strong>
            <div>{event.summary}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
