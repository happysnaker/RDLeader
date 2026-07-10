import { useEffect, useState } from 'react';
import { createEmotionEvent, getEmotionEvents } from '../lib/api';
import { ExpandableText } from './expandable-text';

function formatEmotionEventType(eventType: string) {
  if (eventType === 'positive_feedback') return '正向反馈';
  if (eventType === 'blocked_in_review') return '评审受阻';
  return eventType;
}

function formatEmotionLabel(label: string) {
  if (label === 'proud') return '自信';
  if (label === 'anxious') return '紧张';
  if (label === 'focused') return '专注';
  return label;
}

export function EmotionPanel(props: {
  employeeId: string;
  onEmotionStateChange?: (payload: { current: string; summary: string }) => void;
}) {
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
    props.onEmotionStateChange?.({
      current: event.nextEmotion,
      summary: event.summary,
    });
  }

  return (
    <section className="ops-section ops-section--compact">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">情绪</p>
          <h3>情绪事件</h3>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">{events.length} 条</span>
          <button onClick={() => void recordPositiveFeedback()}>记录正向反馈</button>
        </div>
      </div>
      <ul className="ops-list ops-list--compact ops-scroll-list">
        {events.map((event) => (
          <li key={event.eventId} className="ops-list-item">
            <strong>
              {formatEmotionEventType(event.eventType)} → {formatEmotionLabel(event.nextEmotion)}
            </strong>
            <ExpandableText text={event.summary} maxLength={120} />
          </li>
        ))}
      </ul>
    </section>
  );
}
