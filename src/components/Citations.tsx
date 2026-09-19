import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { VETTED_TABLE, type Citation } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { formatNumber } from '../i18n/formatNumber';
import { useI18n } from '../i18n/useI18n';
import styles from './Citations.module.css';

/**
 * Where each figure came from — one hover away, not in front of the answer.
 *
 * The list opens on hover and on keyboard focus, and a click pins it open so it
 * survives the pointer leaving. Hover alone would strand touch and keyboard
 * readers, so it is never the only way in.
 *
 * Approved data is the norm and is left unlabelled. Raw working data
 * (`indicator_values` rather than `published_data_points`) is the exception and
 * keeps its badge: that is the distinction worth a reader's attention.
 *
 * `indicator` is null on catalog-level citations, which would otherwise render
 * as a literal "None".
 */
export function Citations({ items }: { items: Citation[] }) {
  const { t, lang } = useI18n();
  const [pinned, setPinned] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className={pinned ? `${styles.wrap} ${styles.pinned}` : styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={pinned}
        onClick={() => setPinned((open) => !open)}
      >
        <ChevronRight size={13} strokeWidth={1.75} aria-hidden="true" className={styles.chevron} />
        {t('citations.title')}
        <span className={styles.count}>{formatNumber(items.length, lang)}</span>
      </button>

      {/* The grid 0fr → 1fr collapse animates one child row, so the list is
          wrapped rather than collapsed item by item. */}
      <div className={styles.collapse}>
        <ul className={styles.list}>
          {items.map((item, index) => (
            <li key={`${item.record_id}-${index}`} className={styles.item}>
              <span className={styles.indicator}>
                <LocalizedText text={item.indicator ?? t('citations.catalogEntry')} />
              </span>

              <span className={styles.meta}>
                <LocalizedText text={item.data_source} />
              </span>

              {item.period_label ? (
                <span className={styles.period}>{item.period_label}</span>
              ) : null}

              {item.country ? (
                <span className={styles.meta}>
                  <LocalizedText text={item.country} />
                </span>
              ) : null}

              {item.table === VETTED_TABLE ? null : (
                <span className={styles.raw} title={item.table}>
                  {t('citations.raw')}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
