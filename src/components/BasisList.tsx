import type { AnswerElement } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { CLASS_LABEL } from './elements';
import styles from './BasisList.module.css';

/**
 * Basis lines. Present in both lenses: brevity may remove detail, it may never
 * remove what makes the figure defensible.
 *
 * An `absent` line — "no analyst commentary is published for this period" — is
 * content, not an empty slot, and is styled as quiet information.
 */
export function BasisList({ elements }: { elements: AnswerElement[] }) {
  const { t } = useI18n();
  if (elements.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <h4 className={styles.title}>{t('basis.title')}</h4>
      <ul className={styles.list}>
        {elements.map((element, index) => (
          <li key={index} className={styles.item} data-el-class={element.class}>
            <span className={styles.label}>{t(CLASS_LABEL[element.class])}</span>
            <span className={styles.text}>
              {element.text ? <LocalizedText text={element.text} /> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
