import type { SeriesPoint } from '../../api/types';
import { formatNumber, localizeNumerals } from '../../i18n/formatNumber';
import { useI18n } from '../../i18n/useI18n';
import styles from './Chart.module.css';

export function TableView({ series, unit }: { series: SeriesPoint[]; unit?: string }) {
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
              <td className={`${styles.mono} num`}>{formatNumber(point.value, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
