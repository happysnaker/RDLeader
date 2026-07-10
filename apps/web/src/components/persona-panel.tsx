export function PersonaPanel(props: {
  personaProfile: {
    communicationTone: string;
    ownershipBias: string;
    conflictTolerance: string;
    pressureResponse: string;
    confidenceBaseline: string;
    collaborationStyle: string;
    escalationPreference: string;
  };
  formatTrait?: (label: string, value: string) => string;
}) {
  const formatTrait = props.formatTrait ?? ((label: string, value: string) => `${label} ${value}`);
  const traits = [
    { label: '沟通', value: props.personaProfile.communicationTone },
    { label: '责任', value: props.personaProfile.ownershipBias },
    { label: '冲突', value: props.personaProfile.conflictTolerance },
    { label: '压力', value: props.personaProfile.pressureResponse },
    { label: '自信', value: props.personaProfile.confidenceBaseline },
    { label: '协作', value: props.personaProfile.collaborationStyle },
    { label: '升级', value: props.personaProfile.escalationPreference },
  ];

  return (
    <section className="panel-card overview-card persona-card">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">画像</p>
          <h3>协作画像</h3>
        </div>
        <span className="inline-state inline-state--light">7 项稳定特征</span>
      </div>
      <div className="persona-grid">
        {traits.map((trait) => (
          <article key={trait.label} className="persona-chip-card">
            <span>{trait.label}</span>
            <strong>{trait.value}</strong>
            <p>{formatTrait(trait.label, trait.value)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
