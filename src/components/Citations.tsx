import { VETTED_TABLE, type Citation } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './Citations.module.css';

/**
 * Where each figure came from.
 *
 * `table` says whether a row is SCAI-vetted (`published_data_points`) or raw
 * working data (`indicator_values`). That distinction is deliberately honest on
 * the service's side, so it is on screen here rather than flattened into one
 * word — a reader should be able to tell approved data from working data at a
 * glance.
 *
 * `indicator` is null on catalog-level citations, which would otherwise render
 * as a literal "None".
 */
export function Citations({ items }: { items: Citation[] }) {
  const { t } = useI18n();
  if (items.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <h4 className={styles.title}>{t('citations.title')}</h4>
      <ul className={styles.list}>
        {items.map((item, index) => {
          const vetted = item.table === VETTED_TABLE;
          return (
            <li key={`${item.record_id}-${index}`} className={styles.item}>
              <span className={styles.indicator}>
                <LocalizedText text={item.indicator ?? t('citations.catalogEntry')} />
              </span>

              <span className={styles.meta}>
                <LocalizedText text={item.data_source} />
              </span>

              {item.period_label ? <span className={styles.period}>{item.period_label}</span> : null}
              {item.country ? (
                <span className={styles.meta}>
                  <LocalizedText text={item.country} />
                </span>
              ) : null}

              <span
                className={vetted ? `${styles.table} ${styles.vetted}` : `${styles.table} ${styles.raw}`}
                title={item.table}
              >
                {vetted ? t('citations.vetted') : t('citations.raw')}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
