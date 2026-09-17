import { useI18n } from '../i18n/useI18n';
import type { MsgKey } from '../i18n/en';
import { useConversation } from '../state/useConversation';
import styles from './FirstRun.module.css';

const SUGGESTED: MsgKey[] = [
  'firstrun.q1',
  'firstrun.q2',
  'firstrun.q3',
  'firstrun.q4',
  'firstrun.q5',
  'firstrun.q6',
];

/** A heading and six questions. Nothing else. */
export function FirstRun() {
  const { t, lang } = useI18n();
  const { ask } = useConversation();

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>{t('firstrun.heading')}</h2>
      <ul className={styles.list}>
        {SUGGESTED.map((key) => (
          <li key={key}>
            <button type="button" className={styles.item} onClick={() => ask(t(key), lang)}>
              {t(key)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
