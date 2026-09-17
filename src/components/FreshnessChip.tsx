import type { Freshness } from '../api/types';
import { useI18n } from '../i18n/useI18n';
import styles from './FreshnessChip.module.css';

/** Elapsed time, using the locale's own plural rules and numerals. */
function elapsedLabel(ageSeconds: number, lang: string): string {
  const hours = Math.max(1, Math.round(ageSeconds / 3600));
  const unit: 'day' | 'hour' = hours >= 48 ? 'day' : 'hour';
  const amount = unit === 'day' ? Math.round(hours / 24) : hours;
  return new Intl.NumberFormat(lang, { style: 'unit', unit, unitDisplay: 'long' }).format(amount);
}

function refreshedLabel(refreshedAt: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(refreshedAt));
}

/**
 * `age_seconds` is the service's own measure of how old the data is, so the
 * overdue reading comes from it rather than from this machine's clock. A null
 * `refreshed_at` means the service has never completed a refresh, which is a
 * state of its own and not an unknown.
 */
export function FreshnessChip({ freshness }: { freshness: Freshness }) {
  const { t, lang } = useI18n();
  const { refreshed_at: refreshedAt, stale, age_seconds: age } = freshness;

  const text =
    refreshedAt === null
      ? t('freshness.never')
      : stale
        ? t('freshness.stale', { duration: elapsedLabel(age, lang) })
        : t('freshness.fresh', { time: refreshedLabel(refreshedAt, lang) });

  return (
    <span
      className={stale ? `${styles.chip} ${styles.stale}` : styles.chip}
      role="status"
      aria-label={`${t('freshness.group')}: ${text}`}
    >
      <span className={styles.dot} aria-hidden="true" />
      {text}
    </span>
  );
}
