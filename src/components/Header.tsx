import { Sparkles, UserRound } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import { Logo } from './Logo';
import styles from './Header.module.css';

/**
 * No language toggle: the service answers in the language of the *question*, so
 * the reader picks by typing. A control here would only restate the interface
 * language while appearing to govern the reply.
 *
 * The lockup is a button — the one place people already click to get back to
 * the start — and it begins a new conversation, server-side session and all.
 */
export function Header() {
  const { t } = useI18n();
  const { reset } = useConversation();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.lockup}
          onClick={reset}
          aria-label={t('header.home')}
          title={t('header.home')}
        >
          <Logo title={t('app.brand')} />
        </button>

        <div className={styles.controls}>
          {/* Which app this is, inside the Council's suite. Not a control. */}
          <span className={styles.appPill}>
            <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
            {t('app.product')}
          </span>

          <button type="button" className={styles.avatar} aria-label={t('header.account')}>
            <UserRound size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
