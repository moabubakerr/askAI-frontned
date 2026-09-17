import type { Candidate } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './CandidateList.module.css';

interface Props {
  candidates: Candidate[];
  onPick: (candidate: Candidate) => void;
}

/**
 * 257 of 320 indicator names are ambiguous, so this is a primary path, not an
 * exception. Picking completes the original question — it does not restart it.
 */
export function CandidateList({ candidates, onPick }: Props) {
  const { t } = useI18n();

  return (
    <div className={styles.wrap}>
      <p className={styles.lead}>{t('clarification.lead')}</p>
      <ul className={styles.list}>
        {candidates.map((candidate) => (
          <li key={candidate.detail_id}>
            <button
              type="button"
              className={styles.candidate}
              onClick={() => onPick(candidate)}
              aria-label={t('clarification.pick', { name: candidate.name })}
            >
              <span className={styles.name}>
                <LocalizedText text={candidate.name} />
              </span>
              <span className={styles.scope}>
                <LocalizedText text={candidate.scope} />
              </span>
              <span className={styles.preview}>
                {candidate.latest ? (
                  <>
                    <span className={styles.previewLabel}>{t('clarification.latest')}</span>
                    {/* The preview is the service's own figure, rendered as it
                        arrived — never re-rounded or re-numeralled here. */}
                    <span className={`${styles.previewValue} num`}>
                      {candidate.latest.value}
                    </span>
                    <span className={styles.previewUnit}>
                      <LocalizedText text={candidate.latest.unit} />
                    </span>
                    <span className={styles.previewPeriod}>{candidate.latest.period}</span>
                  </>
                ) : (
                  <span className={styles.previewLabel} data-el-class="absent">
                    {t('clarification.noLatest')}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
