/**
 * Figures arrive as strings — "185.17", "1102.400" — because they start life as
 * SQL NUMERIC, become a Python Decimal and serialize as text. So unlike the
 * prose, they *do* have to be formatted here.
 *
 * The rule: group the thousands and localize the numerals, but never change the
 * precision. "1102.400" is published to three decimals and renders as
 * 1,102.400 — rounding it to 1,102.40 would quietly restate the published
 * figure. Charts are the one exception: their spec carries `decimal_places`,
 * which the axis and the readout honour (QC finding F-004).
 */

import type { Figure, Lang } from '../api/types';
import { toNumber } from '../api/types';
import { formatNumber } from './formatNumber';

/** What is shown where the service holds no value. Never a zero. */
export const NO_VALUE = '—';

/** Decimals the string itself carries, so precision survives formatting. */
function precisionOf(raw: string): number {
  const dot = raw.indexOf('.');
  return dot === -1 ? 0 : raw.length - dot - 1;
}

/**
 * Format a published figure for display.
 *
 * A value that is not a number — the service sending something unexpected —
 * is rendered as it arrived rather than as NaN or a blank.
 */
export function formatFigure(value: Figure | undefined, lang: Lang): string {
  if (value === null || value === undefined || value === '') return NO_VALUE;

  const parsed = toNumber(value);
  if (parsed === null) return String(value);

  const decimals = typeof value === 'string' ? precisionOf(value.trim()) : undefined;
  return formatNumber(parsed, lang, { decimals, group: true });
}

/** A figure with its unit, where one is published. */
export function formatWithUnit(value: Figure | undefined, unit: string | null, lang: Lang): string {
  const figure = formatFigure(value, lang);
  if (figure === NO_VALUE || !unit) return figure;
  return `${figure} ${unit}`;
}

/** Chart readouts, which honour the spec's own `decimal_places`. */
export function formatAtPrecision(value: number, decimals: number, lang: Lang): string {
  return formatNumber(value, lang, { decimals, group: true });
}

/** A percentage, signed, so a fall reads as a fall. */
export function formatPercent(value: Figure | undefined, lang: Lang): string {
  if (value === null || value === undefined || value === '') return NO_VALUE;
  const parsed = toNumber(value);
  if (parsed === null) return String(value);

  const sign = parsed > 0 ? '+' : '';
  const decimals = typeof value === 'string' ? Math.min(precisionOf(value.trim()), 2) : 2;
  return `${sign}${formatNumber(parsed, lang, { decimals, group: true })}%`;
}

/** Signed absolute change, for the same reason. */
export function formatChange(value: Figure | undefined, unit: string | null, lang: Lang): string {
  if (value === null || value === undefined || value === '') return NO_VALUE;
  const parsed = toNumber(value);
  if (parsed === null) return String(value);

  const sign = parsed > 0 ? '+' : '';
  return `${sign}${formatWithUnit(value, unit, lang)}`;
}
