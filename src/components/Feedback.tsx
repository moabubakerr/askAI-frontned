import { useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import { commentRequiredFor } from '../api/types';
import { useI18n } from '../i18n/useI18n';
import { useConversation, type Turn } from '../state/useConversation';
import styles from './Feedback.module.css';

const SCORES = [1, 2, 3, 4, 5];

/**
 * Rating an answer.
 *
 * A score of 1 or 2 must say what was wrong, so those open the comment box
 * before anything is sent: posting on the click would take a guaranteed 422 and
 * then have to recover from it. The server's own validation is still the
 * backstop, not the path.
 *
 * Shown on every answer, including refusals and greetings — those are often the
 * ones most worth flagging.
 */
export function Feedback({ turn, messageId }: { turn: Turn; messageId: string }) {
  const { t } = useI18n();
  const { rate } = useConversation();

  const [pending, setPending] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  // Keyed by the answer it is about: a comparison has two, rated separately.
  const { status, rating, message, commentRequired } = turn.feedback[messageId] ?? {
    status: "idle" as const,
    rating: null,
    message: null,
    commentRequired: false,
  };
  const sent = status === 'sent';
  const sending = status === 'sending';

  // Open either because the reader picked a low score, or because the service
  // asked for the reason. Either way the score they chose is kept.
  const awaitingComment = pending !== null || (status === 'rejected' && commentRequired);
  const score = pending ?? rating;

  function choose(value: number) {
    if (sent || sending) return;
    if (commentRequiredFor(value)) {
      setPending(value);
      return;
    }
    setPending(null);
    rate(turn, messageId, value);
  }

  function submitComment(event: FormEvent) {
    event.preventDefault();
    if (score === null || !comment.trim()) return;
    rate(turn, messageId, score, comment);
    setPending(null);
  }

  // Ratings are append-only on the service, so the control retires itself
  // rather than posting a second row for the same answer.
  if (sent) {
    return (
      <p className={styles.thanks} role="status">
        {t('feedback.thanks')}
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.label}>{t('feedback.question')}</span>

        <div className={styles.stars} role="radiogroup" aria-label={t('feedback.question')}>
          {SCORES.map((value) => {
            const filled = score !== null && value <= score;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={score === value}
                aria-label={t('feedback.rate', { n: String(value) })}
                className={filled ? `${styles.star} ${styles.filled}` : styles.star}
                disabled={sending}
                onClick={() => choose(value)}
              >
                <Star size={17} strokeWidth={1.75} fill={filled ? 'currentColor' : 'none'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* The service's own wording, shown as written. */}
      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}

      {awaitingComment ? (
        <form className={styles.commentForm} onSubmit={submitComment}>
          <label className={styles.commentLabel} htmlFor={`feedback-${turn.index}-${messageId}`}>
            {t('feedback.commentLabel')}
          </label>
          <textarea
            id={`feedback-${turn.index}-${messageId}`}
            className={styles.comment}
            rows={2}
            value={comment}
            placeholder={t('feedback.commentPlaceholder')}
            onChange={(event) => setComment(event.target.value)}
          />
          <button
            type="submit"
            className={styles.submit}
            disabled={sending || comment.trim().length === 0}
          >
            {t('feedback.submit')}
          </button>
        </form>
      ) : null}

      {status === 'failed' && !message ? (
        <p className={styles.message} role="status">
          {t('feedback.failed')}
        </p>
      ) : null}
    </div>
  );
}
