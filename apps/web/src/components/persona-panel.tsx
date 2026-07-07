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
}) {
  return (
    <section style={{ marginTop: 24 }}>
      <h3>人格画像</h3>
      <p>沟通风格：{props.personaProfile.communicationTone}</p>
      <p>责任偏好：{props.personaProfile.ownershipBias}</p>
      <p>冲突容忍：{props.personaProfile.conflictTolerance}</p>
      <p>压力反应：{props.personaProfile.pressureResponse}</p>
      <p>自信基线：{props.personaProfile.confidenceBaseline}</p>
      <p>协作风格：{props.personaProfile.collaborationStyle}</p>
      <p>升级偏好：{props.personaProfile.escalationPreference}</p>
    </section>
  );
}
