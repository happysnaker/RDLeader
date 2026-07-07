export interface RuntimeHeartbeat {
  employeeId: string;
  runtimeKind: 'trae_acp';
  status: 'idle' | 'starting' | 'running' | 'failed' | 'stopped';
  pid: number | null;
}

export interface RuntimeTaskEnvelope {
  taskTitle: string;
  taskBody: string;
  taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  workItemId?: string;
  dispatchedAt?: string;
}

export interface RuntimeTaskReceipt {
  employeeId: string;
  runtimeKind: 'trae_acp';
  workspacePath: string;
  taskFilePath: string;
  dispatchedAt: string;
 }

export interface RuntimeAdapter {
  start(employeeId: string): Promise<RuntimeHeartbeat>;
  stop(employeeId: string): Promise<void>;
  heartbeat(employeeId: string): Promise<RuntimeHeartbeat>;
  sendTask(employeeId: string, taskEnvelope: RuntimeTaskEnvelope): Promise<RuntimeTaskReceipt>;
}
