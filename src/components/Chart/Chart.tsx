import type { AnswerElement, Chartable } from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import { Segmented } from '../Segmented';
import { BarView } from './BarView';
import { LineView } from './LineView';
import { TableView } from './TableView';
import styles from './Chart.module.css';

interface Props {
  chartable: Chartable | undefined;
  series: AnswerElement | undefined;
  view: string;
  onViewChange: (view: string) => void;
}

/**
 * Renders only where the backend declared a chart, and only the views it
 * declared. There is no client-side list of "views we support" — the buttons
 * are `default_view` followed by `alternate_views`, and nothing else.
 */
export function Chart({ chartable, series, view, onViewChange }: Props) {
  const { t, tOpen } = useI18n();

  if (!chartable?.available) return null;
  const points = series?.series;
  if (!points || points.length === 0) return null;

  // `default_view` is null when the service declares no preferred view.
  const views = [
    ...(chartable.default_view ? [chartable.default_view] : []),
    ...chartable.alternate_views,
  ];
  if (views.length === 0) return null;

  const fallback = views[0] as string;
  const active = views.includes(view) ? view : fallback;
  const title = series.text ?? t('chart.group');

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <span className={styles.title}>
          {title}
          {series.unit ? <span className={styles.unit}> · {series.unit}</span> : null}
        </span>
        {views.length > 1 ? (
          <Segmented<string>
            label={t('chart.group')}
            size="compact"
            value={active}
            onChange={onViewChange}
            options={views.map((name) => ({
              value: name,
              label: tOpen(`chart.view.${name}`, name),
            }))}
          />
        ) : null}
      </figcaption>

      {/* A declared view this client has no renderer for falls back to the line
          view; it is never dropped from the control. */}
      <div className={styles.plot}>
        {active === 'table' ? (
          <TableView series={points} unit={series.unit} />
        ) : active === 'bar' ? (
          <BarView series={points} title={title} />
        ) : (
          <LineView series={points} title={title} />
        )}
      </div>
    </figure>
  );
}
