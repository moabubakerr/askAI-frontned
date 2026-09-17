import type { CSSProperties } from 'react';
import type { SeriesPoint } from '../../api/types';
import { formatNumber, localizeNumerals } from '../../i18n/formatNumber';
import { useI18n } from '../../i18n/useI18n';
import { buildGeometry, VIEWBOX } from './geometry';
import styles from './Chart.module.css';

export function LineView({ series, title }: { series: SeriesPoint[]; title: string }) {
  const { lang } = useI18n();
  const geometry = buildGeometry(series, false);
  if (!geometry) return null;

  const { plot, ticks, points, linePath, areaPath, lineLength } = geometry;

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
            {formatNumber(tick.value, lang)}
          </text>
        </g>
      ))}

      <path d={areaPath} className={styles.area} />
      <path
        d={linePath}
        className={styles.line}
        style={{ '--dash': lineLength } as CSSProperties}
        strokeDasharray={lineLength}
      />

      {points.map((point, index) => (
        <circle
          key={point.label}
          cx={point.x}
          cy={point.y}
          r={3.5}
          className={styles.point}
          style={{ animationDelay: `${120 + index * 45}ms` }}
        />
      ))}

      {points.map((point) =>
        point.showLabel ? (
          <text
            key={point.label}
            x={point.x}
            y={plot.y + plot.height + 20}
            className={styles.axisLabel}
            textAnchor="middle"
          >
            {localizeNumerals(point.label, lang)}
          </text>
        ) : null,
      )}
    </svg>
  );
}
