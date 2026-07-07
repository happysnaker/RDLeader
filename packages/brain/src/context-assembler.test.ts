import { describe, expect, it } from 'vitest';
import { assembleTaskContext } from './context-assembler';
import { lushirongSeed } from '@rdleader/seed';

describe('assembleTaskContext', () => {
  it('routes coding tasks through identity, seed, working, and knowledge layers', () => {
    const context = assembleTaskContext({
      employee: lushirongSeed,
      taskType: 'coding',
      workingMemory: ['推进提单页导流'],
      episodicMemory: ['上次自然渠道承接讨论'],
      knowledgeItems: ['repo-funshopping-core'],
    });

    expect(context.layers.map((item) => item.layer)).toEqual([
      'identity',
      'seed',
      'working',
      'knowledge',
    ]);
  });

  it('routes reflection tasks through identity, episodic, and reflection layers', () => {
    const context = assembleTaskContext({
      employee: lushirongSeed,
      taskType: 'reflection',
      workingMemory: [],
      episodicMemory: ['评审被 challenge'],
      knowledgeItems: [],
    });

    expect(context.layers.map((item) => item.layer)).toEqual([
      'identity',
      'episodic',
      'reflection',
    ]);
  });
});
