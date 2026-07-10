import { useEffect, useState } from 'react';
import { getReflections, refreshReflection } from '../lib/api';
import { ExpandableText } from './expandable-text';

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
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">反思</p>
          <h3>学习反思</h3>
          <p className="ops-section__summary-note">把最近一次可复用的观察先提炼出来，避免成长页被长段文字淹没。</p>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">{reflections.length} 条</span>
          <button onClick={() => void generateReflection()}>生成反思</button>
        </div>
      </div>
      {reflections.length ? (
        <ul className="ops-list ops-list--compact ops-scroll-list">
          {reflections.map((reflection, index) => (
            <li key={reflection.reflectionId} className="ops-list-item">
              <div className="ops-list-item__header">
                <strong>最近反思 #{index + 1}</strong>
                <span className="ops-badge ops-badge--neutral">反思</span>
              </div>
              <ExpandableText text={reflection.summary} maxLength={180} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ops-inline-note">最近还没有新的学习反思。</p>
      )}
    </section>
  );
}
