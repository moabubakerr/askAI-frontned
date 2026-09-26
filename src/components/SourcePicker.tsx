import { Globe, ShieldCheck } from 'lucide-react';
import { sendsQuestionOutside, type Source } from '../api/types';
import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import styles from './SourcePicker.module.css';

/**
 * Who answers the next question.
 *
 * This is a data-egress control, not a preference. Oxford and Combined send the
 * reader's question verbatim to Oxford Economics' cloud, while everything else
 * in this product stays on the premises — so the choice is visible, made each
 * session, and never remembered. The warning is shown while the choice is
 * active rather than once at the moment of clicking, because the consequence
 * applies to every question asked under it.
 */
export function SourcePicker() {
  const { t } = useI18n();
  const { source, setSource, oxfordAvailable } = useConversation();

  const options: { value: Source; label: string }[] = [
    { value: 'scai', label: t('source.scai') },
    ...(oxfordAvailable
      ? [
          { value: 'oxford' as const, label: t('source.oxford') },
          { value: 'combined' as const, label: t('source.combined') },
        ]
      : []),
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.row} role="radiogroup" aria-label={t('source.group')}>
        <span className={styles.label}>{t('source.group')}</span>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={source === option.value}
            className={styles.option}
            data-outside={sendsQuestionOutside(option.value) ? 'true' : undefined}
            onClick={() => setSource(option.value)}
          >
            {sendsQuestionOutside(option.value) ? (
              <Globe size={13} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
            )}
            {option.label}
          </button>
        ))}
      </div>

      {sendsQuestionOutside(source) ? (
        <p className={styles.egress} role="status">
          {t('source.egressWarning')}
        </p>
      ) : null}
    </div>
  );
}
