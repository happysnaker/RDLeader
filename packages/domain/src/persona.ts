export interface PersonaProfile {
  communicationTone: 'direct' | 'warm' | 'structured';
  ownershipBias: 'low' | 'medium' | 'high';
  conflictTolerance: 'low' | 'medium' | 'high';
  pressureResponse: 'steady' | 'anxious-but-responsible' | 'defensive';
  confidenceBaseline: 'steady' | 'ambitious' | 'self-critical';
  collaborationStyle: 'reactive' | 'proactive';
  escalationPreference: 'late' | 'normal' | 'early';
}
