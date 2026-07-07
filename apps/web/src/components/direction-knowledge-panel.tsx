import { useEffect, useState } from 'react';
import { getDirectionKnowledgeRecords, promoteLearningRecordToDirectionKnowledge } from '../lib/api';

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
    <section style={{ marginTop: 24 }}>
      <h3>方向知识库</h3>
      <button onClick={() => void promote()}>提升为方向知识</button>
      <ul>
        {records.map((record) => (
          <li key={record.recordId}>
            <strong>{record.title}</strong>
            <div>{record.summary}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
