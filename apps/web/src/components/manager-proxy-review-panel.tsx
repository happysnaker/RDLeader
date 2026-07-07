import { useEffect, useState } from 'react';
import { createManagerProxyReview, getManagerProxyReviews } from '../lib/api';

export function ManagerProxyReviewPanel(props: {
  employeeId: string;
  onWorkStateUpdate: (update: { recentDoneSummary: string; nextStepSummary: string }) => void;
}) {
  const [reviewTopic, setReviewTopic] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [reviews, setReviews] = useState<
    Array<{ reviewId: string; reviewTopic: string; conclusion: string; nextSteps: string[] }>
  >([]);

  useEffect(() => {
    void getManagerProxyReviews(props.employeeId).then((payload) => {
      setReviews(Array.isArray(payload) ? payload : []);
    });
  }, [props.employeeId]);

  async function recordReview() {
    const payload = await createManagerProxyReview(props.employeeId, {
      reviewTopic,
      conclusion,
      nextSteps: nextSteps.split('\n').map((item) => item.trim()).filter(Boolean),
    });
    setReviews((current) => [payload, ...current]);
    props.onWorkStateUpdate({
      recentDoneSummary: payload.conclusion,
      nextStepSummary: payload.nextSteps[0] ?? '',
    });
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>老板代理评审</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="代理评审主题" value={reviewTopic} onChange={(event) => setReviewTopic(event.target.value)} />
        <input placeholder="评审结论" value={conclusion} onChange={(event) => setConclusion(event.target.value)} />
        <textarea
          placeholder="会后下一步（每行一条）"
          value={nextSteps}
          onChange={(event) => setNextSteps(event.target.value)}
        />
        <button onClick={() => void recordReview()}>记录代理评审结论</button>
      </div>
      <ul>
        {reviews.map((review) => (
          <li key={review.reviewId}>
            <strong>{review.reviewTopic}</strong>
            <div>{review.conclusion}</div>
            {review.nextSteps.map((step) => (
              <div key={`${review.reviewId}-${step}`}>{step}</div>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
