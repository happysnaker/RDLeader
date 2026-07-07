import { useEffect, useState } from 'react';
import { getLearningRecords, promoteLatestReflection } from '../lib/api';

export function LearningRecordPanel(props: { employeeId: string }) {
  const [records, setRecords] = useState<Array<{ recordId: string; title: string; summary: string }>>([]);

  useEffect(() => {
    void getLearningRecords(props.employeeId).then(setRecords);
  }, [props.employeeId]);

  async function promoteLatest() {
    const record = await promoteLatestReflection(props.employeeId, 'direction');
    setRecords((current) => [record, ...current]);
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>经验沉淀</h3>
      <button onClick={() => void promoteLatest()}>沉淀为经验</button>
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
