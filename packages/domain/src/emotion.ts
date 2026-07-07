export const emotionStates = [
  'calm',
  'focused',
  'anxious',
  'frustrated',
  'proud',
  'discouraged',
  'considering_exit',
] as const;

export type EmotionStateName = (typeof emotionStates)[number];

export interface EmotionStateSnapshot {
  current: EmotionStateName;
  intensity: number;
  triggers: string[];
  summary: string;
}
