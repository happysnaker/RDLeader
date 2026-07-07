import type { AssembleTaskContextInput, BrainLayerName } from './layers';

const routeTable: Record<AssembleTaskContextInput['taskType'], BrainLayerName[]> = {
  coding: ['identity', 'seed', 'working', 'knowledge'],
  coordination: ['identity', 'working', 'episodic', 'knowledge'],
  status: ['identity', 'working'],
  reflection: ['identity', 'episodic', 'reflection'],
  collaboration: ['identity', 'working', 'knowledge'],
};

export function routeLayers(taskType: AssembleTaskContextInput['taskType']): BrainLayerName[] {
  return routeTable[taskType];
}
