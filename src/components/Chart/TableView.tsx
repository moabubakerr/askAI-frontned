import type { SeriesPoint } from '../../api/types';
import { formatAtPrecision } from '../../i18n/figures';
import { localizeNumerals } from '../../i18n/formatNumber';
import { useI18n } from '../../i18n/useI18n';
import styles from './Chart.module.css';

export function TableView({
  series,
  unit,
  decimals,
}: {
  series: SeriesPoint[];
  unit: string | null;
  /** The spec's own `decimal_places`, never a guess. */
  decimals: number;
}) {
  const { t, lang } = useI18n();

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('chart.colPeriod')}</th>
            <th scope="col">
              {t('chart.colValue')}
              {unit ? ` · ${unit}` : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.label}>
              <td className={styles.mono}>{localizeNumerals(point.label, lang)}</td>
              <td className={`${styles.mono} num`}>{formatAtPrecision(point.value, decimals, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
