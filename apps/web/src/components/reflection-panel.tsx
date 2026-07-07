import { useEffect, useState } from 'react';
import { getReflections, refreshReflection } from '../lib/api';

export function ReflectionPanel(props: { employeeId: string }) {
  const [reflections, setReflections] = useState<Array<{ reflectionId: string; summary: string }>>([]);

  useEffect(() => {
    void getReflections(props.employeeId).then(setReflections);
  }, [props.employeeId]);

  async function generateReflection() {
    const reflection = await refreshReflection(props.employeeId);
    setReflections((current) => [reflection, ...current]);
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>学习反思</h3>
      <button onClick={() => void generateReflection()}>生成反思</button>
      <ul>
        {reflections.map((reflection) => (
          <li key={reflection.reflectionId}>{reflection.summary}</li>
        ))}
      </ul>
    </section>
  );
}
