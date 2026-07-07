import { useEffect, useState } from 'react';
import { createPerformanceEvent, getPerformanceEvents } from '../lib/api';

export function PerformancePanel(props: { employeeId: string }) {
  const [events, setEvents] = useState<
    Array<{ eventId: string; eventType: string; nextRetentionRisk: string; summary: string }>
  >([]);

  useEffect(() => {
    void getPerformanceEvents(props.employeeId).then(setEvents);
  }, [props.employeeId]);

  async function recordNegativeFeedback() {
    const event = await createPerformanceEvent(props.employeeId, {
      eventType: 'negative_review',
      reliabilityDelta: -0.18,
      nextDeliveryTrend: 'down',
      nextPromotionReadiness: 'hold',
      nextRetentionRisk: 'high',
      summary: '评审质量不达预期，员工担心自己表现不佳',
    });
    setEvents((current) => [event, ...current]);
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>绩效事件</h3>
      <button onClick={() => void recordNegativeFeedback()}>记录负向绩效反馈</button>
      <ul>
        {events.map((event) => (
          <li key={event.eventId}>
            <strong>
              {event.eventType} → {event.nextRetentionRisk}
            </strong>
            <div>{event.summary}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
