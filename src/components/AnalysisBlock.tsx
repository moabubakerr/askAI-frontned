import type { AnswerElement } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { CLASS_LABEL } from './elements';
import styles from './AnalysisBlock.module.css';

/**
 * `analysis` and `commentary` arrive with different classes: an analyst note is
 * `attributed`, the same role from a dated opinion piece is `article`. The role
 * puts them in the same slot; the class makes sure they do not look identical.
 */
export function AnalysisBlock({ elements }: { elements: AnswerElement[] }) {
  const { t } = useI18n();
  if (elements.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <h4 className={styles.title}>{t('analysis.title')}</h4>
      {elements.map((element, index) => (
        <figure key={index} className={styles.block} data-el-class={element.class}>
          <span className={styles.label}>{t(CLASS_LABEL[element.class])}</span>
          <blockquote className={styles.text}>
            {element.text ? <LocalizedText text={element.text} /> : null}
          </blockquote>
          <figcaption className={styles.meta}>
            {element.article ? (
              <>
                <span className={styles.metaTitle}>
                  <LocalizedText text={element.article.title} />
                </span>
                <span className="ref">{element.article.date}</span>
              </>
            ) : null}
            {element.publisher ? (
              <span className={styles.metaTitle}>
                <LocalizedText text={element.publisher} />
              </span>
            ) : null}
            {element.source_ref ? <span className="ref">{element.source_ref}</span> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
