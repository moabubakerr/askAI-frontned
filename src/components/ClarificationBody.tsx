import { CornerDownRight } from 'lucide-react';
import type { AnswerPackageClarification, Candidate } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { CandidateList } from './CandidateList';
import styles from './ClarificationBody.module.css';

interface Props {
  pkg: AnswerPackageClarification;
  onPickCandidate: (candidate: Candidate) => void;
  onFollowUp: () => void;
}

/**
 * A clarification is not a refusal: the question was well asked, it just has
 * not said enough yet. So this state ends in an invitation, and the follow-up
 * goes back on the same `conversation_id` rather than starting a new thread.
 *
 * Where the service lists the indicators it could have meant, picking one is
 * the fastest way to say it; where it does not, the reader answers in prose.
 */
export function ClarificationBody({ pkg, onPickCandidate, onFollowUp }: Props) {
  const { t, dir } = useI18n();
  const candidates = pkg.candidates ?? [];

  return (
    <div className={styles.wrap}>
      <p className={styles.reason}>
        <LocalizedText text={pkg.reason} />
      </p>

      {candidates.length > 0 ? (
        <CandidateList candidates={candidates} onPick={onPickCandidate} />
      ) : null}

      <div className={styles.followUp}>
        <CornerDownRight
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}
        />
        <span>{t('clarification.followUp')}</span>
        <button type="button" className={styles.cta} onClick={onFollowUp}>
          {t('clarification.followUpCta')}
        </button>
      </div>
    </div>
  );
}
