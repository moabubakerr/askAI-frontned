import type { AnswerElement } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { CLASS_LABEL } from './elements';
import styles from './SeriesList.module.css';

/**
 * A series arrives as one element per row — "2019: -0.89001 %" — each composed
 * by the service, each with its own `source_ref`. They are the answer to a
 * series question, so they render in both lenses and never depend on a chart.
 *
 * The chart is a separate, optional view of the same rows: it needs numeric
 * points, and the service sends composed text. Parsing a figure back out of
 * these sentences to plot it would be reconstructing a number the service
 * already formatted — the one thing this client must never do. So when there
 * are no points, the rows are the whole answer rather than nothing at all.
 */
export function SeriesList({ elements }: { elements: AnswerElement[] }) {
  const { t } = useI18n();
  if (elements.length === 0) return null;

  const cls = elements[0]?.class;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h4 className={styles.title}>{t('series.title')}</h4>
        {cls ? <span className={styles.label}>{t(CLASS_LABEL[cls])}</span> : null}
      </div>
      <ol className={styles.list}>
        {elements.map((element, index) => (
          <li key={index} className={styles.row} data-el-class={element.class}>
            <LocalizedText text={element.text} />
          </li>
        ))}
      </ol>
    </div>
  );
}
