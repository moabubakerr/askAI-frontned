/**
 * Numerals for text the *client* composes: question numbers, row counts, chart
 * axis labels built from series points.
 *
 * Arabic renders Arabic-Indic numerals with ٫ as the decimal mark and ٬ as the
 * thousands mark.
 *
 * Backend prose never comes through here. Every figure in an element, a reason,
 * a caveat or an agent sentence is composed once by the service, already in the
 * requested language — re-formatting it would drift from the published unit and
 * from the Arabic rendering. `splitRuns` below is the backend-text path, and it
 * changes no characters.
 */

import type { Lang } from '../api/types';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const MINUS = '−';

/** Digit runs only, so sentence-final full stops survive. */
function arabize(src: string): string {
  return src.replace(/[0-9](?:[0-9.,]*[0-9])?/g, (run) =>
    run
      .replace(/\./g, '٫')
      .replace(/,/g, '٬')
      .replace(/[0-9]/g, (d) => AR_DIGITS.charAt(Number(d))),
  );
}

/** A hyphen that opens a number is a minus sign, and should look like one. */
function typographicMinus(src: string): string {
  return src.replace(/(^|[\s( ])-(?=[0-9])/g, `$1${MINUS}`);
}

export interface NumberOptions {
  /** Fixed number of fraction digits. Omitted: keep what the value has. */
  decimals?: number;
  /** Group thousands. Default: only when the value already has grouping. */
  group?: boolean;
}

/**
 * Format a value for display in `lang`.
 *
 * Strings pass through untouched apart from numeral, separator and minus-sign
 * conversion — backend values are authoritative and are never re-rounded here.
 */
export function formatNumber(
  value: number | string,
  lang: Lang,
  options: NumberOptions = {},
): string {
  let base: string;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    base = new Intl.NumberFormat('en-US', {
      useGrouping: options.group ?? true,
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals ?? 20,
    }).format(value);
  } else {
    base = value;
  }

  const withMinus = base.replace(/^-(?=[0-9])/, MINUS);
  return lang === 'ar' ? arabize(withMinus) : withMinus;
}

/**
 * Localize the numerals inside a string of backend prose or a scope line.
 * Row references are identifiers and must not be passed through here.
 */
export function localizeNumerals(text: string, lang: Lang): string {
  const withMinus = typographicMinus(text);
  return lang === 'ar' ? arabize(withMinus) : withMinus;
}

export interface TextRun {
  text: string;
  /** Latin-script run inside Arabic prose — isolate it or the line reorders. */
  ltr: boolean;
}

const RUN = /[A-Za-z0-9][A-Za-z0-9 ._/'’&()+-]*/g;

/**
 * Split backend text into runs so Latin-script fragments inside Arabic prose
 * can be bidi-isolated. English text is always a single run.
 *
 * This is presentation only: every run holds the service's own characters,
 * unchanged. Nothing here converts a numeral, a separator or a sign.
 */
export function splitRuns(text: string, lang: Lang): TextRun[] {
  if (lang !== 'ar') return [{ text, ltr: false }];

  const runs: TextRun[] = [];
  let cursor = 0;

  RUN.lastIndex = 0;
  let m = RUN.exec(text);
  while (m !== null) {
    const raw = m[0];
    const trimmed = raw.replace(/[\s.]+$/, '');
    const start = m.index;

    if (/[A-Za-z]/.test(trimmed) && trimmed.length > 0) {
      if (start > cursor) {
        runs.push({ text: text.slice(cursor, start), ltr: false });
      }
      runs.push({ text: trimmed, ltr: true });
      cursor = start + trimmed.length;
    }

    m = RUN.exec(text);
  }

  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor), ltr: false });
  }

  return runs.length > 0 ? runs : [{ text, ltr: false }];
}
