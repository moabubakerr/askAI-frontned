import { Info } from 'lucide-react';
import type { Degradation, Suggestion } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './Callouts.module.css';

/**
 * The caveat is a property of the content, not a footnote, so it survives the
 * Executive lens.
 */
export function Caveat({ text }: { text: string }) {
  const { t } = useI18n();

  return (
    <p className={styles.caveat}>
      <span className={styles.caveatLabel}>{t('caveat.label')}</span>
      <LocalizedText text={text} />
    </p>
  );
}

/** What the service had to change to answer at all. */
export function Degradations({ items }: { items: Degradation[] }) {
  const { t, tOpen } = useI18n();
  if (items.length === 0) return null;

  return (
    <div className={styles.degradations}>
      <h4 className={styles.degradationsTitle}>
        <Info size={13} strokeWidth={1.75} aria-hidden="true" />
        {t('degradations.title')}
      </h4>
      <ul className={styles.degradationsList}>
        {items.map((item, index) => (
          <li key={index}>
            <span className={styles.degradationKind}>
              {tOpen(`degradation.${item.kind}`, item.kind)}
            </span>
            <span className="ref">{item.where}</span>
            {/* The service's own sentence about what it had to change. */}
            {item.detail ? (
              <span className={styles.degradationDetail}>
                <LocalizedText text={item.detail} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Next steps the service returned. Never invented on the client. */
export function Suggestions({
  items,
  onAsk,
}: {
  items: Suggestion[] | undefined;
  onAsk: (question: string) => void;
}) {
  const { t } = useI18n();
  if (!items || items.length === 0) return null;

  return (
    <div className={styles.suggestions}>
      <h4 className={styles.suggestionsTitle}>{t('suggestions.title')}</h4>
      <ul className={styles.chips}>
        {items.map((item, index) => (
          <li key={index}>
            <button type="button" className={styles.chip} onClick={() => onAsk(item.question)}>
              <LocalizedText text={item.label} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
