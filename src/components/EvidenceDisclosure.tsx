import { ChevronRight } from 'lucide-react';
import { parseSourceRef, type AnswerElement } from '../api/types';
import { formatNumber } from '../i18n/formatNumber';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './EvidenceDisclosure.module.css';

interface Props {
  rows: AnswerElement[];
  open: boolean;
  onToggle: () => void;
  regionId: string;
}

/**
 * One interaction away from the figure, never in front of it. Rendered only
 * when the package actually carries rows — a package without evidence gets no
 * evidence affordance at all.
 */
export function EvidenceDisclosure({ rows, open, onToggle, regionId }: Props) {
  const { t, lang, dir } = useI18n();
  if (rows.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={regionId}
        onClick={onToggle}
      >
        <ChevronRight
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className={styles.chevron}
          style={{
            transform: open
              ? 'rotate(90deg)'
              : dir === 'rtl'
                ? 'rotate(180deg)'
                : undefined,
          }}
        />
        {open ? t('evidence.hide') : t('evidence.show')}
        <span className={styles.count}>{formatNumber(rows.length, lang)}</span>
      </button>

      <div id={regionId} className={open ? `${styles.region} ${styles.open}` : styles.region}>
        <div className={styles.regionInner}>
          <p className={styles.note}>{t('evidence.note')}</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('evidence.colIndicator')}</th>
                  <th scope="col">{t('evidence.colPeriod')}</th>
                  <th scope="col">{t('evidence.colValue')}</th>
                  <th scope="col">{t('evidence.colPublisher')}</th>
                  <th scope="col">{t('evidence.colRef')}</th>
                </tr>
              </thead>
              {/* Period, country and source come from `source_ref` when the row
                  does not spell them out: 'detail|period|country|source', split
                  but never reformatted. An empty country means national. */}
              <tbody>
                {rows.map((row, index) => {
                  const parts = parseSourceRef(row.source_ref);
                  const period = row.period ?? parts?.period ?? '';
                  const publisher = row.publisher ?? parts?.source ?? '';

                  return (
                    <tr key={index}>
                      <td>{row.text ? <LocalizedText text={row.text} /> : null}</td>
                      <td className={styles.mono}>{period}</td>
                      <td className={`${styles.mono} num`}>
                        {row.value ?? null}
                        {row.unit ? <span className={styles.unit}> {row.unit}</span> : null}
                      </td>
                      <td>{publisher ? <LocalizedText text={publisher} /> : null}</td>
                      <td>
                        {row.source_ref ? <span className="ref">{row.source_ref}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
