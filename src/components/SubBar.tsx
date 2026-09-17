import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import { FreshnessChip } from './FreshnessChip';
import { LensToggle } from './LensToggle';
import styles from './SubBar.module.css';

export function SubBar() {
  const { t } = useI18n();
  const { freshness } = useConversation();

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t('app.product')}</h1>
        <div className={styles.controls}>
          <LensToggle />
          {freshness ? <FreshnessChip freshness={freshness} /> : null}
        </div>
      </div>
    </div>
  );
}
