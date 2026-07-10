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

export const corePlatformDirection: DirectionDefinition = {
  directionId: 'core-platform',
  displayName: '核心平台',
  defaultKnowledgeBaseIds: [
    'dir-core-platform',
    'repo-funshopping-core',
  ],
};
