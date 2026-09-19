import { useState } from 'react';
import { chartPoints, type ChartSpec } from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import { Segmented } from '../Segmented';
import { BarView } from './BarView';
import { LineView } from './LineView';
import { TableView } from './TableView';
import styles from './Chart.module.css';

/**
 * A chart arrives as a spec, not as a decision this client makes: the service
 * sends one for trends automatically and whenever the reader asks for a chart,
 * and `chart_type` says which. The reader can switch to the table — the same
 * rows, no interpretation — but the declared type is always the default.
 *
 * `x_field` and `y_field` are read generically, so a spec over countries plots
 * exactly like one over periods without a special case here. `decimal_places`
 * and `unit` are honoured rather than guessed (QC finding F-004).
 */
export function Chart({ spec }: { spec: ChartSpec }) {
  const { t, tOpen } = useI18n();
  const declared = spec.chart_type === 'bar' ? 'bar' : 'line';
  const [view, setView] = useState<string>(declared);

  const points = chartPoints(spec);
  if (points.length === 0) return null;

  const views = [declared, 'table'];
  const active = views.includes(view) ? view : declared;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <span className={styles.title}>
          {spec.title}
          {spec.unit ? <span className={styles.unit}> · {spec.unit}</span> : null}
        </span>
        <Segmented<string>
          label={t('chart.group')}
          size="compact"
          value={active}
          onChange={setView}
          options={views.map((name) => ({ value: name, label: tOpen(`chart.view.${name}`, name) }))}
        />
      </figcaption>

      {/* A macro overview puts different units on different bars, so the
          service warns that they are not on a shared scale. Shown above the
          plot, where it can still change how the picture is read. */}
      {spec.note ? <p className={styles.note}>{spec.note}</p> : null}

      <div className={styles.plot}>
        {active === 'table' ? (
          <TableView series={points} unit={spec.unit} decimals={spec.decimal_places} />
        ) : active === 'bar' ? (
          <BarView series={points} title={spec.title} decimals={spec.decimal_places} />
        ) : (
          <LineView series={points} title={spec.title} decimals={spec.decimal_places} />
        )}
      </div>

      {spec.missing_countries && spec.missing_countries.length > 0 ? (
        <p className={styles.missing}>
          {t('chart.missingCountries', { countries: spec.missing_countries.join(', ') })}
        </p>
      ) : null}
    </figure>
  );
}
