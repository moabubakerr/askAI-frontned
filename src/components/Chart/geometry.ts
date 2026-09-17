import type { SeriesPoint } from '../../api/types';

export const VIEWBOX = { width: 720, height: 260 };
const PAD = { top: 16, right: 16, bottom: 30, left: 56 };

export interface Tick {
  value: number;
  y: number;
}

export interface PlottedPoint {
  x: number;
  y: number;
  label: string;
  value: number;
  /** x labels are thinned when the axis is crowded. */
  showLabel: boolean;
}

export interface Bar extends PlottedPoint {
  barX: number;
  barY: number;
  barWidth: number;
  barHeight: number;
}

export interface Geometry {
  plot: { x: number; y: number; width: number; height: number };
  ticks: Tick[];
  points: PlottedPoint[];
  bars: Bar[];
  linePath: string;
  areaPath: string;
  /** Path length estimate, for the left-to-right draw. */
  lineLength: number;
}

/** A round step close to `raw`, so axis labels read as numbers a person wrote. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function domain(values: number[], zeroBased: boolean): [number, number] {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const min = zeroBased ? Math.min(0, rawMin) : rawMin;
  const max = zeroBased ? Math.max(0, rawMax) : rawMax;

  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  if (zeroBased) return [min, max];

  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

/**
 * `zeroBased` for bars, which must grow from the axis; false for lines, where a
 * forced zero flattens a percentage series into a straight edge.
 */
export function buildGeometry(series: SeriesPoint[], zeroBased: boolean): Geometry | null {
  if (series.length === 0) return null;

  const plot = {
    x: PAD.left,
    y: PAD.top,
    width: VIEWBOX.width - PAD.left - PAD.right,
    height: VIEWBOX.height - PAD.top - PAD.bottom,
  };

  const values = series.map((point) => point.value);
  const [min, max] = domain(values, zeroBased);
  const span = max - min || 1;

  const y = (value: number) => plot.y + plot.height - ((value - min) / span) * plot.height;

  const step = niceStep(span / 4);
  const ticks: Tick[] = [];
  const first = Math.ceil(min / step) * step;
  for (let value = first; value <= max + step * 0.001; value += step) {
    const rounded = Number(value.toFixed(10));
    ticks.push({ value: rounded, y: y(rounded) });
  }

  const count = series.length;
  const slot = plot.width / count;
  const everyNth = Math.ceil(count / 8);

  const points: PlottedPoint[] = series.map((point, index) => ({
    x: count === 1 ? plot.x + plot.width / 2 : plot.x + (index / (count - 1)) * plot.width,
    y: y(point.value),
    label: point.label,
    value: point.value,
    showLabel: index % everyNth === 0 || index === count - 1,
  }));

  const barWidth = Math.min(slot * 0.56, 64);
  const baseline = y(zeroBased ? Math.max(0, min) : min);

  const bars: Bar[] = series.map((point, index) => {
    const centre = plot.x + slot * (index + 0.5);
    const top = y(point.value);
    return {
      x: centre,
      y: top,
      label: point.label,
      value: point.value,
      showLabel: index % everyNth === 0 || index === count - 1,
      barX: centre - barWidth / 2,
      barY: Math.min(top, baseline),
      barWidth,
      barHeight: Math.max(1, Math.abs(baseline - top)),
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath =
    firstPoint && lastPoint
      ? `${linePath} L${lastPoint.x.toFixed(2)},${(plot.y + plot.height).toFixed(2)} L${firstPoint.x.toFixed(2)},${(plot.y + plot.height).toFixed(2)} Z`
      : '';

  let lineLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    lineLength += Math.hypot(b.x - a.x, b.y - a.y);
  }

  return { plot, ticks, points, bars, linePath, areaPath, lineLength };
}
