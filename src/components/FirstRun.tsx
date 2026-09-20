import { useI18n } from '../i18n/useI18n';
import type { MsgKey } from '../i18n/en';
import { useConversation } from '../state/useConversation';
import { LensCards } from './LensCards';
import styles from './FirstRun.module.css';

/** The questions offered before anything has been asked. */
const PRIORITY: MsgKey[] = [
  'firstrun.q1',
  'firstrun.q2',
  'firstrun.q3',
  'firstrun.q4',
  'firstrun.q5',
  'firstrun.q6',
];

export function FirstRun() {
  const { t, lang } = useI18n();
  const { ask } = useConversation();

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>{t('firstrun.welcome')}</h2>
      <p className={styles.intro}>{t('firstrun.intro')}</p>

      <LensCards />

      <section className={styles.section}>
        <h3 className={styles.label}>{t('firstrun.priority')}</h3>
        <ul className={styles.grid}>
          {PRIORITY.map((key) => (
            <li key={key}>
              <button type="button" className={styles.item} onClick={() => ask(t(key), lang)}>
                {t(key)}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className={styles.note}>{t('firstrun.note')}</p>

      {/* The one question that explains the rest, asked like any other. */}
      <button type="button" className={styles.help} onClick={() => ask(t('firstrun.q6'), lang)}>
        {t('firstrun.help')}
      </button>

      <p className={styles.footnote}>{t('firstrun.footnote')}</p>
    </div>
  );
}
