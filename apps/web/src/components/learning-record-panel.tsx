import { useEffect, useState } from 'react';
import { getLearningRecords, promoteLatestReflection } from '../lib/api';
import { ExpandableText } from './expandable-text';

export function LearningRecordPanel(props: {
  employeeId: string;
  onLatestRecordChange?: (record: { recordId: string; title: string; summary: string }) => void;
}) {
  const [records, setRecords] = useState<Array<{ recordId: string; title: string; summary: string }>>([]);

  useEffect(() => {
    void getLearningRecords(props.employeeId).then(setRecords);
  }, [props.employeeId]);

  async function promoteLatest() {
    const record = await promoteLatestReflection(props.employeeId, 'direction');
    setRecords((current) => [record, ...current]);
    props.onLatestRecordChange?.(record);
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">经验</p>
          <h3>经验沉淀</h3>
          <p className="ops-section__summary-note">把可复用经验抽成更稳定的记录，方便后续继续提升到方向知识。</p>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">{records.length} 条</span>
          <button onClick={() => void promoteLatest()}>沉淀为经验</button>
        </div>
      </div>
      {records.length ? (
        <ul className="ops-list ops-list--compact ops-scroll-list">
          {records.map((record) => (
            <li key={record.recordId} className="ops-list-item">
              <div className="ops-list-item__header">
                <strong>{record.title}</strong>
                <span className="ops-badge ops-badge--neutral">经验</span>
              </div>
              <ExpandableText text={record.summary} maxLength={180} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ops-inline-note">最近还没有新的经验沉淀。</p>
      )}
    </section>
  );
}
