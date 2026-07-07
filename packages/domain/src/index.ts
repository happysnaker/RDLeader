export const employeeLevels = ['1-2', '2-1', '2-2'] as const;
export type EmployeeLevel = (typeof employeeLevels)[number];

export { emotionStates, type EmotionStateName, type EmotionStateSnapshot } from './emotion';
export { type PersonaProfile } from './persona';
export { type PerformanceSnapshot } from './performance';
export {
  type EmployeeRecord,
  type EmploymentStatus,
  type RuntimeKind,
  type FeishuProfile,
} from './employee';
export { type DirectionDefinition } from './direction';
export { type EmployeeMessage } from './message';
export { type ApprovalRequest } from './approval';
