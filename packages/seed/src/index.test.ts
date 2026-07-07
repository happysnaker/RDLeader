import { describe, expect, it } from 'vitest';
import {
  lushirongSeed,
  zhouyongkangSeed,
  independentGrowthDiversionDirection,
} from './index';

describe('seed employees', () => {
  it('keeps both initial employees in the independent growth diversion direction', () => {
    expect(lushirongSeed.directionId).toBe(independentGrowthDiversionDirection.directionId);
    expect(zhouyongkangSeed.directionId).toBe(independentGrowthDiversionDirection.directionId);
  });

  it('differentiates their next-step focus', () => {
    expect(lushirongSeed.nextStepSummary).not.toBe(zhouyongkangSeed.nextStepSummary);
  });
});
