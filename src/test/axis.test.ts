import { describe, expect, it } from 'vitest';
import { buildGeometry } from '../components/Chart/geometry';
import type { SeriesPoint } from '../api/types';

/** Monthly readings, which is where the axis gets crowded. */
function months(count: number): SeriesPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `2025-${String((i % 12) + 1).padStart(2, '0')}`,
    value: 100 + i,
  }));
}

/** Roughly what a period label occupies, in viewBox units. */
const LABEL_WIDTH = 62;

describe('the x axis', () => {
  it.each([6, 8, 12, 14, 18, 24, 36])('never overlaps two labels (%i points)', (count) => {
    const geometry = buildGeometry(months(count), false);
    const shown = (geometry?.points ?? []).filter((p) => p.showLabel);

    for (let i = 1; i < shown.length; i += 1) {
      const gap = (shown[i]?.x ?? 0) - (shown[i - 1]?.x ?? 0);
      // Thinning by index used to force the last label in wherever it fell,
      // which could leave it a few units from its neighbour — the two then
      // printed on top of each other.
      expect(gap).toBeGreaterThanOrEqual(LABEL_WIDTH);
    }
  });

  it('always labels the most recent period', () => {
    const geometry = buildGeometry(months(14), false);
    const points = geometry?.points ?? [];

    expect(points[points.length - 1]?.showLabel).toBe(true);
  });

  it('leans the end labels inward so they stay inside the plot', () => {
    const geometry = buildGeometry(months(10), false);
    const points = geometry?.points ?? [];

    expect(points[0]?.anchor).toBe('start');
    expect(points[points.length - 1]?.anchor).toBe('end');
    expect(points[4]?.anchor).toBe('middle');
  });

  it('applies the same spacing to bars', () => {
    const geometry = buildGeometry(months(20), true);
    const shown = (geometry?.bars ?? []).filter((b) => b.showLabel);

    for (let i = 1; i < shown.length; i += 1) {
      expect((shown[i]?.x ?? 0) - (shown[i - 1]?.x ?? 0)).toBeGreaterThanOrEqual(LABEL_WIDTH);
    }
  });

  it('labels a single reading', () => {
    const geometry = buildGeometry(months(1), false);
    expect(geometry?.points[0]?.showLabel).toBe(true);
  });
});
