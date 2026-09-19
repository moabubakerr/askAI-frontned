import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import styles from './SubBar.module.css';

/**
 * `GET /health` answers as soon as the process is up. It does not prove the
 * database or the models are reachable, so this says the service is responding
 * and claims nothing about the data behind it. Overstating it would be worse
 * than showing nothing.
 */
export function SubBar() {
  const { t } = useI18n();
  const { serviceUp } = useConversation();

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t('app.product')}</h1>
        {serviceUp === null ? null : (
          <span
            className={serviceUp ? styles.status : `${styles.status} ${styles.down}`}
            role="status"
            title={t('health.caveat')}
          >
            <span className={styles.dot} aria-hidden="true" />
            {serviceUp ? t('health.up') : t('health.down')}
          </span>
        )}
      </div>
    </div>
  );
}
