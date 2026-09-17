import type { AnswerElement } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { CLASS_LABEL } from './elements';
import styles from './Headline.module.css';

/**
 * The answer, first. A value question leads with the value, a yes/no question
 * leads with the word.
 *
 * `text` is the composed sentence and is rendered as it arrived. `value` and
 * `unit` are an optional split of the same figure, for the large type — they
 * are never re-rounded, re-grouped or re-numeralled here.
 */
export function Headline({ element }: { element: AnswerElement }) {
  const { t } = useI18n();
  const numeric = element.value !== undefined && /[0-9٠-٩]/.test(element.value);

  return (
    <div className={styles.block} data-el-class={element.class}>
      <span className={styles.eyebrow}>{t(CLASS_LABEL[element.class])}</span>

      {element.value !== undefined ? (
        <p className={styles.figure}>
          <span className={numeric ? `${styles.value} num` : styles.value}>{element.value}</span>
          {element.unit ? (
            <span className={styles.unit}>
              <LocalizedText text={element.unit} />
            </span>
          ) : null}
        </p>
      ) : null}

      {element.text ? (
        <p className={styles.sentence}>
          <LocalizedText text={element.text} />
        </p>
      ) : null}
    </div>
  );
}

/** Delta sits directly under the headline, in both lenses. */
export function Delta({ element }: { element: AnswerElement }) {
  const { t } = useI18n();

  return (
    <p className={styles.delta} data-el-class={element.class}>
      <span className={styles.deltaLabel}>{t(CLASS_LABEL[element.class])}</span>
      {element.text ? (
        <LocalizedText text={element.text} />
      ) : (
        <span className="num">
          {element.value ?? ''}
          {element.unit ? ` ${element.unit}` : ''}
        </span>
      )}
    </p>
  );
}
