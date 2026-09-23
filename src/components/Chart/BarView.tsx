import type { SeriesPoint } from '../../api/types';
import { formatAtPrecision } from '../../i18n/figures';
import { localizeNumerals } from '../../i18n/formatNumber';
import { useI18n } from '../../i18n/useI18n';
import { buildGeometry, VIEWBOX } from './geometry';
import styles from './Chart.module.css';

export function BarView({
  series,
  title,
  decimals,
}: {
  series: SeriesPoint[];
  title: string;
  decimals: number;
}) {
  const { lang } = useI18n();
  const geometry = buildGeometry(series, true);
  if (!geometry) return null;

  const { plot, ticks, bars } = geometry;

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      role="img"
      aria-label={title}
    >
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={plot.x}
            x2={plot.x + plot.width}
            y1={tick.y}
            y2={tick.y}
            className={styles.gridline}
          />
          <text x={plot.x - 10} y={tick.y + 4} className={styles.axisLabel} textAnchor="end">
            {formatAtPrecision(tick.value, decimals, lang)}
          </text>
        </g>
      ))}

      {bars.map((bar, index) => (
        <rect
          key={bar.label}
          x={bar.barX}
          y={bar.barY}
          width={bar.barWidth}
          height={bar.barHeight}
          rx={2}
          className={styles.bar}
          style={{
            transformOrigin: `0 ${(bar.barY + bar.barHeight).toFixed(2)}px`,
            animationDelay: `${index * 40}ms`,
          }}
        />
      ))}

      {bars.map((bar) =>
        bar.showLabel ? (
          <text
            key={bar.label}
            x={bar.x}
            y={plot.y + plot.height + 20}
            className={styles.axisLabel}
            textAnchor={bar.anchor}
          >
            {localizeNumerals(bar.label, lang)}
          </text>
        ) : null,
      )}
    </svg>
  );
}
