export interface ApprovalRequest {
  requestId: string;
  employeeId: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
}
