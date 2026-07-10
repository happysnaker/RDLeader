import { useEffect, useState } from 'react';
import { createManagerProxyReview, getManagerProxyReviews } from '../lib/api';

export function ManagerProxyReviewPanel(props: {
  employeeId: string;
  onWorkStateUpdate: (update: { recentDoneSummary: string; nextStepSummary: string }) => void;
  compact?: boolean;
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
    setReviewTopic('');
    setConclusion('');
    setNextSteps('');
    props.onWorkStateUpdate({
      recentDoneSummary: payload.conclusion,
      nextStepSummary: payload.nextSteps[0] ?? '',
    });
  }

  return (
    <section className="ops-section ops-section--compact">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">代理评审</p>
          <h3>老板代理评审</h3>
        </div>
        <span className="ops-badge ops-badge--neutral">{reviews.length} 条</span>
      </div>
      {props.compact ? (
        <details className="ops-segment">
          <summary>发起代理评审</summary>
          <div className="ops-form-grid">
            <input placeholder="代理评审主题" value={reviewTopic} onChange={(event) => setReviewTopic(event.target.value)} />
            <input placeholder="评审结论" value={conclusion} onChange={(event) => setConclusion(event.target.value)} />
            <textarea placeholder="会后下一步（每行一条）" value={nextSteps} onChange={(event) => setNextSteps(event.target.value)} />
            <div className="ops-actions">
              <button onClick={() => void recordReview()}>记录代理评审结论</button>
            </div>
          </div>
        </details>
      ) : (
        <div className="ops-form-grid">
          <input placeholder="代理评审主题" value={reviewTopic} onChange={(event) => setReviewTopic(event.target.value)} />
          <input placeholder="评审结论" value={conclusion} onChange={(event) => setConclusion(event.target.value)} />
          <textarea placeholder="会后下一步（每行一条）" value={nextSteps} onChange={(event) => setNextSteps(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void recordReview()}>记录代理评审结论</button>
          </div>
        </div>
      )}
      <ul className="ops-list ops-list--compact">
        {reviews.slice(0, 3).map((review) => (
          <li key={review.reviewId} className="ops-list-item">
            <strong>{review.reviewTopic}</strong>
            <p>{review.conclusion}</p>
            {review.nextSteps.map((step) => (
              <p key={`${review.reviewId}-${step}`}>{step}</p>
            ))}
          </li>
        ))}
        {reviews.length === 0 ? <li className="ops-list-item"><p className="ops-inline-note">还没有代理评审记录。</p></li> : null}
      </ul>
    </section>
  );
}
