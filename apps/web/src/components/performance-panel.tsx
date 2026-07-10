import { useEffect, useState } from 'react';
import { createPerformanceEvent, getPerformanceEvents } from '../lib/api';
import { ExpandableText } from './expandable-text';

function formatPerformanceEventType(eventType: string) {
  if (eventType === 'negative_review') return '负向评审';
  return eventType;
}

function formatRiskLevel(label: string) {
  if (label === 'high') return '高';
  if (label === 'medium') return '中';
  if (label === 'low') return '低';
  return label;
}

export function PerformancePanel(props: {
  employeeId: string;
  onPerformanceStateChange?: (payload: { retentionRisk: string }) => void;
}) {
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
    props.onPerformanceStateChange?.({
      retentionRisk: event.nextRetentionRisk,
    });
  }

  return (
    <section className="ops-section ops-section--compact">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">绩效</p>
          <h3>绩效事件</h3>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">{events.length} 条</span>
          <button onClick={() => void recordNegativeFeedback()}>记录负向绩效反馈</button>
        </div>
      </div>
      <ul className="ops-list ops-list--compact ops-scroll-list">
        {events.map((event) => (
          <li key={event.eventId} className="ops-list-item">
            <strong>
              {formatPerformanceEventType(event.eventType)} → {formatRiskLevel(event.nextRetentionRisk)}
            </strong>
            <ExpandableText text={event.summary} maxLength={120} />
          </li>
        ))}
      </ul>
    </section>
  );
}
