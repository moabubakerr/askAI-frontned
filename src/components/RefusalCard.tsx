import type { AnswerPackageRefusal, RefusalCode } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './RefusalCard.module.css';

/**
 * A refusal is terminal and its sentence is the whole answer: the service
 * composed it, in the reader's language, and it is rendered as it arrived.
 * There is no client-side table of refusal wordings — the code only picks the
 * visual treatment.
 *
 * Six reasons that must read differently, and none of them is an error.
 * Cross-country comparison is published for about 7% of indicators and
 * commentary for about 8% of datapoints, so a refusal is frequently the correct
 * answer — same card shell, same chip, same scope line, no red.
 */
export function RefusalBody({ pkg }: { pkg: AnswerPackageRefusal }) {
  return (
    <p className={styles.reason} data-refusal-code={pkg.refusal_code}>
      <LocalizedText text={pkg.reason} />
    </p>
  );
}

/** The state chip. It names the state, never the service's wording. */
export function RefusalChip({ code }: { code: RefusalCode }) {
  const { t } = useI18n();
  return (
    <span className={styles.chip} data-refusal-code={code}>
      {t('refusal.title')}
    </span>
  );
}
