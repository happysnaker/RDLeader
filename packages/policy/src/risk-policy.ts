export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskInput {
  kind: 'search' | 'read' | 'write' | 'delete' | 'mutate-external';
  target: 'docs' | 'employee-workspace' | 'shared-repo' | 'external-system';
}

export function classifyRisk(input: RiskInput): RiskLevel {
  if (input.kind === 'search' || input.kind === 'read') {
    return 'low';
  }

  if (input.target === 'employee-workspace' && input.kind === 'write') {
    return 'medium';
  }

  return 'high';
}

export function requiresApproval(input: RiskInput): boolean {
  return classifyRisk(input) === 'high';
}
