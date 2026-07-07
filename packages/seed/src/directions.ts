import type { DirectionDefinition } from '@rdleader/domain';

export const independentGrowthDiversionDirection: DirectionDefinition = {
  directionId: 'independent-growth-diversion',
  displayName: '独立端增长导流',
  defaultKnowledgeBaseIds: [
    'dir-independent-growth-diversion',
    'repo-funshopping-core',
    'repo-funshopping-user-growth-dispatch',
  ],
};
