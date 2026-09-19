import { useI18n } from '../i18n/useI18n';
import styles from './SubBar.module.css';

/**
 * The product name, and nothing else.
 *
 * No session control and no service-status chip: `GET /health` only proves the
 * process is up, never that the data behind it is reachable, and a green dot
 * saying "responding" next to an answer that failed is worse than silence. A
 * request that fails says so on the turn it belongs to.
 */
export function SubBar() {
  const { t } = useI18n();

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t('app.product')}</h1>
      </div>
    </div>
  );
}
