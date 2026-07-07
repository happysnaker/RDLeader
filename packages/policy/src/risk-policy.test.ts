import { describe, expect, it } from 'vitest';
import { classifyRisk, requiresApproval } from './index';

describe('risk policy', () => {
  it('treats read/search operations as low risk', () => {
    expect(classifyRisk({ kind: 'search', target: 'docs' })).toBe('low');
  });

  it('treats destructive shared operations as high risk', () => {
    expect(classifyRisk({ kind: 'delete', target: 'shared-repo' })).toBe('high');
    expect(requiresApproval({ kind: 'delete', target: 'shared-repo' })).toBe(true);
  });

  it('allows employee-owned local writes without manager approval', () => {
    expect(classifyRisk({ kind: 'write', target: 'employee-workspace' })).toBe('medium');
    expect(requiresApproval({ kind: 'write', target: 'employee-workspace' })).toBe(false);
  });
});
