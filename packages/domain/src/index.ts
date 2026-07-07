export const employeeLevels = ['1-2', '2-1', '2-2'] as const;
export type EmployeeLevel = (typeof employeeLevels)[number];
