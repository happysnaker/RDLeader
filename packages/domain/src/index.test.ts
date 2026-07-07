import { describe, expect, it } from 'vitest';
import { employeeLevels } from './index';

describe('domain workspace bootstrap', () => {
  it('exports the supported employee levels', () => {
    expect(employeeLevels).toEqual(['1-2', '2-1', '2-2']);
  });
});
