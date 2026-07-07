export interface PerformanceSnapshot {
  deliveryTrend: 'down' | 'flat' | 'up';
  communicationQuality: 'weak' | 'ok' | 'good';
  blockerHandling: 'weak' | 'ok' | 'good';
  reviewQuality: 'weak' | 'ok' | 'good';
  reliabilityScore: number;
  promotionReadiness: 'hold' | 'watch' | 'ready';
  retentionRisk: 'low' | 'medium' | 'high';
}
