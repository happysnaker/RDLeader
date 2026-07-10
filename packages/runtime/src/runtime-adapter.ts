export interface RuntimeHeartbeat {
  employeeId: string;
  runtimeKind: 'trae_acp';
  status: 'idle' | 'starting' | 'running' | 'failed' | 'stopped';
  pid: number | null;
}

export interface RuntimeTaskEnvelope {
  dispatchId?: string;
  taskTitle: string;
  taskBody: string;
  taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  workItemId?: string;
  dispatchedAt?: string;
  brainContext?: unknown;
}

export interface RuntimeTaskReceipt {
  employeeId: string;
  runtimeKind: 'trae_acp';
  workspacePath: string;
  taskFilePath: string;
  dispatchedAt: string;
}

export interface RuntimeCollectedEvent {
  employeeId: string;
  runtimeKind: 'trae_acp';
  workItemId?: string;
  dispatchId?: string;
  status: 'completed' | 'blocked' | 'failed';
  summary: string;
  nextStepSummary?: string;
  artifactRefs: string[];
  sourceFilePath: string;
  processedFilePath: string;
  createdAt: string;
}

export interface RuntimeAdapter {
  start(employeeId: string): Promise<RuntimeHeartbeat>;
  stop(employeeId: string): Promise<void>;
  heartbeat(employeeId: string): Promise<RuntimeHeartbeat>;
  sendTask(employeeId: string, taskEnvelope: RuntimeTaskEnvelope): Promise<RuntimeTaskReceipt>;
  collectRuntimeEvents(employeeId: string): Promise<RuntimeCollectedEvent[]>;
}
