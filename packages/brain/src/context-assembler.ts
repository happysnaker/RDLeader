import type { AssembleTaskContextInput, AssembledTaskContext, BrainLayer } from './layers';
import { routeLayers } from './router';

export function assembleTaskContext(input: AssembleTaskContextInput): AssembledTaskContext {
  const layers: BrainLayer[] = routeLayers(input.taskType).map((layer) => {
    switch (layer) {
      case 'identity':
        return {
          layer,
          payload: {
            employeeId: input.employee.employeeId,
            displayName: input.employee.displayName,
            directionId: input.employee.directionId,
            personaProfile: input.employee.personaProfile,
            emotionState: input.employee.emotionState,
            performanceState: input.employee.performanceState,
          },
        };
      case 'seed':
        return { layer, payload: { seedEmployeeId: input.employee.employeeId } };
      case 'working':
        return { layer, payload: input.workingMemory };
      case 'episodic':
        return { layer, payload: input.episodicMemory };
      case 'knowledge':
        return { layer, payload: input.knowledgeItems };
      case 'reflection':
        return {
          layer,
          payload: {
            summarize: true,
            episodicInputs: input.episodicMemory,
          },
        };
    }
  });

  return {
    employeeId: input.employee.employeeId,
    taskType: input.taskType,
    layers,
  };
}
