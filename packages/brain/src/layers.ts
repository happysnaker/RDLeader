export type BrainLayerName =
  | 'identity'
  | 'seed'
  | 'working'
  | 'episodic'
  | 'knowledge'
  | 'reflection';

export interface BrainLayer {
  layer: BrainLayerName;
  payload: unknown;
}

export interface AssembleTaskContextInput {
  employee: {
    employeeId: string;
    displayName: string;
    directionId: string;
    personaProfile: unknown;
    emotionState: unknown;
    performanceState: unknown;
  };
  taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  workingMemory: string[];
  episodicMemory: string[];
  knowledgeItems: string[];
}

export interface AssembledTaskContext {
  employeeId: string;
  taskType: AssembleTaskContextInput['taskType'];
  layers: BrainLayer[];
}
