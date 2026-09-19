import { UserRound } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import styles from './Header.module.css';

/**
 * No language toggle.
 *
 * The service answers in the language of the *question*, so the reader picks by
 * typing: an Arabic question gets an Arabic answer, rendered RTL, whatever the
 * chrome around it says. A toggle here would only restate the interface
 * language, and would suggest it controls the reply — which it does not.
 */
export function Header() {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.lockup}>
          <span className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M12 2.5 3.5 6.2v6.1c0 5 3.6 8.4 8.5 9.2 4.9-.8 8.5-4.2 8.5-9.2V6.2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8.5 12.4h2.2V16m2.6-6.2h2.2V16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className={styles.names}>
            <span className={styles.brand}>{t('app.brand')}</span>
            <span className={styles.product}>{t('app.product')}</span>
          </span>
        </div>

        <div className={styles.controls}>
          <button type="button" className={styles.avatar} aria-label={t('header.account')}>
            <UserRound size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
