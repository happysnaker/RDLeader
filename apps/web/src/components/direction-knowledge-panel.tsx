import { useEffect, useState } from 'react';
import { getDirectionKnowledgeRecords, promoteLearningRecordToDirectionKnowledge } from '../lib/api';
import { ExpandableText } from './expandable-text';

export function DirectionKnowledgePanel(props: {
  employeeId: string;
  directionId: string;
  latestLearningRecordId?: string;
}) {
  const [records, setRecords] = useState<Array<{ recordId: string; title: string; summary: string }>>([]);

  useEffect(() => {
    void getDirectionKnowledgeRecords(props.directionId).then(setRecords);
  }, [props.directionId]);

  async function promote() {
    if (!props.latestLearningRecordId) return;
    const record = await promoteLearningRecordToDirectionKnowledge(props.employeeId, props.latestLearningRecordId);
    setRecords((current) => [record, ...current]);
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">知识</p>
          <h3>方向知识库</h3>
          <p className="ops-section__summary-note">把已经稳定的经验提升成方向知识，给后续同方向员工复用。</p>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">{records.length} 条</span>
          <button onClick={() => void promote()}>提升为方向知识</button>
        </div>
      </div>
      {records.length ? (
        <ul className="ops-list ops-list--compact ops-scroll-list">
          {records.map((record) => (
            <li key={record.recordId} className="ops-list-item">
              <div className="ops-list-item__header">
                <strong>{record.title}</strong>
                <span className="ops-badge ops-badge--neutral">方向知识</span>
              </div>
              <ExpandableText text={record.summary} maxLength={180} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ops-inline-note">当前方向还没有沉淀知识卡片。</p>
      )}
    </section>
  );
}
