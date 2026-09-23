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
  /** The first and last labels are anchored inward, to stay inside the plot. */
  anchor: 'start' | 'middle' | 'end';
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

/**
 * Roughly the width of a period label — "2026-04", "2025-Q4" — in viewBox
 * units, plus the gap that keeps two of them apart.
 */
const MIN_LABEL_GAP = 78;

/**
 * Which labels to draw.
 *
 * Thinning by index — every nth, plus always the last — puts the final label
 * wherever the arithmetic leaves it, which can be a few pixels from its
 * neighbour: the two then overlap and read as one smear. Walking back from the
 * end instead keeps the most recent period, which is the one that matters, and
 * drops anything that would collide with a label already kept.
 */
function labelled(xs: number[]): Set<number> {
  const keep = new Set<number>();
  let lastKept: number | null = null;

  for (let index = xs.length - 1; index >= 0; index -= 1) {
    const x = xs[index];
    if (x === undefined) continue;
    if (lastKept === null || lastKept - x >= MIN_LABEL_GAP) {
      keep.add(index);
      lastKept = x;
    }
  }

  return keep;
}

/** The end labels lean inward so they do not run off the plot. */
function anchorFor(index: number, count: number): 'start' | 'middle' | 'end' {
  if (index === 0) return 'start';
  if (index === count - 1) return 'end';
  return 'middle';
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

  const pointXs = series.map((_, index) =>
    count === 1 ? plot.x + plot.width / 2 : plot.x + (index / (count - 1)) * plot.width,
  );
  const pointLabels = labelled(pointXs);

  const points: PlottedPoint[] = series.map((point, index) => ({
    x: pointXs[index] ?? plot.x,
    y: y(point.value),
    label: point.label,
    value: point.value,
    showLabel: pointLabels.has(index),
    anchor: anchorFor(index, count),
  }));

  const barWidth = Math.min(slot * 0.56, 64);
  const baseline = y(zeroBased ? Math.max(0, min) : min);

  const barXs = series.map((_, index) => plot.x + slot * (index + 0.5));
  const barLabels = labelled(barXs);

  const bars: Bar[] = series.map((point, index) => {
    const centre = barXs[index] ?? plot.x;
    const top = y(point.value);
    return {
      x: centre,
      y: top,
      label: point.label,
      value: point.value,
      showLabel: barLabels.has(index),
      anchor: anchorFor(index, count),
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
