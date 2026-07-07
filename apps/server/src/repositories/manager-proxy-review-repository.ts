import type Database from 'better-sqlite3';

export interface ManagerProxyReviewRow {
  reviewId: string;
  employeeId: string;
  reviewTopic: string;
  conclusion: string;
  nextSteps: string[];
  createdAt: string;
}

export class ManagerProxyReviewRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: {
    employeeId: string;
    reviewTopic: string;
    conclusion: string;
    nextSteps: string[];
  }): ManagerProxyReviewRow {
    const review: ManagerProxyReviewRow = {
      reviewId: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      reviewTopic: input.reviewTopic,
      conclusion: input.conclusion,
      nextSteps: input.nextSteps,
      createdAt: new Date().toISOString(),
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO manager_proxy_reviews (
            review_id,
            employee_id,
            review_topic,
            conclusion,
            next_steps,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        review.reviewId,
        review.employeeId,
        review.reviewTopic,
        review.conclusion,
        JSON.stringify(review.nextSteps),
        review.createdAt,
      );

    return review;
  }

  listForEmployee(employeeId: string): ManagerProxyReviewRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            review_id as reviewId,
            employee_id as employeeId,
            review_topic as reviewTopic,
            conclusion,
            next_steps as nextSteps,
            created_at as createdAt
          FROM manager_proxy_reviews
          WHERE employee_id = ?
          ORDER BY created_at DESC
        `,
      )
      .all(employeeId) as Array<{
      reviewId: string;
      employeeId: string;
      reviewTopic: string;
      conclusion: string;
      nextSteps: string;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      ...row,
      nextSteps: JSON.parse(row.nextSteps),
    }));
  }
}
