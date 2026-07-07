export interface RuntimeHeartbeat {
  employeeId: string;
  runtimeKind: 'trae_acp';
  status: 'idle' | 'starting' | 'running' | 'failed' | 'stopped';
  pid: number | null;
}

export interface RuntimeAdapter {
  start(employeeId: string): Promise<RuntimeHeartbeat>;
  stop(employeeId: string): Promise<void>;
  heartbeat(employeeId: string): Promise<RuntimeHeartbeat>;
}
