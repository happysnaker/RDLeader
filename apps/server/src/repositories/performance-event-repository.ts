import type Database from 'better-sqlite3';

export interface PerformanceEventRow {
  eventId: string;
  employeeId: string;
  eventType: string;
  reliabilityDelta: number;
  nextDeliveryTrend: string;
  nextPromotionReadiness: string;
  nextRetentionRisk: string;
  summary: string;
  createdAt: string;
}

export class PerformanceEventRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: {
    employeeId: string;
    eventType: string;
    reliabilityDelta: number;
    nextDeliveryTrend: string;
    nextPromotionReadiness: string;
    nextRetentionRisk: string;
    summary: string;
  }): PerformanceEventRow {
    const event: PerformanceEventRow = {
      eventId: `performance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      eventType: input.eventType,
      reliabilityDelta: input.reliabilityDelta,
      nextDeliveryTrend: input.nextDeliveryTrend,
      nextPromotionReadiness: input.nextPromotionReadiness,
      nextRetentionRisk: input.nextRetentionRisk,
      summary: input.summary,
      createdAt: new Date().toISOString(),
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO performance_events (
            event_id,
            employee_id,
            event_type,
            reliability_delta,
            next_delivery_trend,
            next_promotion_readiness,
            next_retention_risk,
            summary,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        event.eventId,
        event.employeeId,
        event.eventType,
        event.reliabilityDelta,
        event.nextDeliveryTrend,
        event.nextPromotionReadiness,
        event.nextRetentionRisk,
        event.summary,
        event.createdAt,
      );

    return event;
  }

  listForEmployee(employeeId: string): PerformanceEventRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            event_id as eventId,
            employee_id as employeeId,
            event_type as eventType,
            reliability_delta as reliabilityDelta,
            next_delivery_trend as nextDeliveryTrend,
            next_promotion_readiness as nextPromotionReadiness,
            next_retention_risk as nextRetentionRisk,
            summary,
            created_at as createdAt
          FROM performance_events
          WHERE employee_id = ?
          ORDER BY created_at DESC
        `,
      )
      .all(employeeId) as PerformanceEventRow[];
  }
}
