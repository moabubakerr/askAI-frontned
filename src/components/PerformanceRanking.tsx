import {
  notAssessable,
  rankedIndicators,
  type Facts,
  type NotAssessable,
  type RankedIndicator,
} from '../api/types';
import { formatFigure, formatWithUnit } from '../i18n/figures';
import { formatNumber } from '../i18n/formatNumber';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './PerformanceRanking.module.css';

/**
 * Indicators ranked by progress against their own targets.
 *
 * Two things here are easy to get wrong and are deliberately not done:
 *
 *  1. **No percentage is computed on the client.** `attainment_percent` already
 *     has polarity applied. A `Decrease` indicator that came in under target —
 *     Cost per Student at 84.055 against 88.6 — is *beating* it at 105.4%;
 *     `actual / target` would call it 95% and invert the ranking. The same
 *     mistake turns a PISA rank of 48 against a target of 35 into 137% instead
 *     of 72.9%.
 *  2. **The rows are not re-sorted.** They arrive in the order the service
 *     ranked them, and `order` says which way that runs.
 *
 * The banding — at or past target, close, far — is a product decision, not
 * something the API dictates.
 */
export function PerformanceRanking({ facts }: { facts: Facts }) {
  const { t, tOpen, lang } = useI18n();

  const rows = rankedIndicators(facts);
  const unranked = notAssessable(facts);

  const scope = typeof facts['scope'] === 'string' ? facts['scope'] : '';
  const scopeKind = typeof facts['scope_kind'] === 'string' ? facts['scope_kind'] : '';
  const order = typeof facts['order'] === 'string' ? facts['order'] : '';
  const basis = typeof facts['basis'] === 'string' ? facts['basis'] : '';
  const nRanked = typeof facts['n_ranked'] === 'number' ? facts['n_ranked'] : rows.length;
  const nTotal =
    typeof facts['n_total'] === 'number' ? facts['n_total'] : nRanked + unranked.length;

  const widest = Math.max(100, ...rows.map((row) => row.attainment_percent || 0));

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        {scope ? (
          <span className={styles.scope}>
            <LocalizedText text={scope} />
            {scopeKind ? <span className={styles.scopeKind}>{scopeKind}</span> : null}
          </span>
        ) : null}
        {order ? <span className={styles.order}>{tOpen(`ranking.order.${order}`, order)}</span> : null}
        <span className={styles.count}>
          {t('ranking.rankedOf', {
            n: formatNumber(nRanked, lang),
            total: formatNumber(nTotal, lang),
          })}
        </span>
      </div>

      {/* What "progress" is measured against, in the service's own words. */}
      {basis ? (
        <p className={styles.basis}>
          <LocalizedText text={basis} />
        </p>
      ) : null}

      <ol className={styles.list}>
        {rows.map((row, index) => (
          <Row key={`${row.indicator}-${index}`} row={row} rank={index + 1} widest={widest} />
        ))}
      </ol>

      {/* Never folded away and never mixed into the list above with a blank
          score: a leaderboard showing 10 of 13 is a more confident picture of
          the sector than the honest one. */}
      {unranked.length > 0 ? (
        <section className={styles.unranked}>
          <h4 className={styles.unrankedTitle}>
            {t('ranking.notAssessable', {
              n: formatNumber(unranked.length, lang),
              total: formatNumber(nTotal, lang),
            })}
          </h4>
          <ul className={styles.unrankedList}>
            {unranked.map((row, index) => (
              <UnrankedRow key={`${row.indicator}-${index}`} row={row} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** At or past target, close to it, or far from it. */
function band(attainment: number): 'met' | 'near' | 'far' {
  if (attainment >= 100) return 'met';
  if (attainment >= 80) return 'near';
  return 'far';
}

function Row({ row, rank, widest }: { row: RankedIndicator; rank: number; widest: number }) {
  const { t, tOpen, lang } = useI18n();
  const attainment = row.attainment_percent ?? 0;

  // A standing goal can be years out, so it is dated rather than passed off as
  // a target for this reading's period.
  const targetLabel =
    row.target_basis === 'indicator' && row.target_year
      ? t('ranking.targetFor', { year: String(row.target_year) })
      : t('facts.target');

  return (
    <li className={styles.row} data-band={band(attainment)}>
      <span className={styles.rank}>{formatNumber(rank, lang)}</span>

      <span className={styles.name}>
        <LocalizedText text={row.indicator} />
      </span>

      <span className={styles.score}>
        <span className="num">{formatNumber(attainment, lang, { decimals: 1 })}%</span>
      </span>

      <span className={styles.track} aria-hidden="true">
        <span className={styles.bar} style={{ inlineSize: `${(attainment / widest) * 100}%` }} />
      </span>

      <span className={styles.detail}>
        {/* The unit belongs to this row, not to a column header: every line is
            a different indicator, and the scale is already applied. */}
        <span className={styles.actual}>{formatWithUnit(asFigure(row.actual), row.unit, lang)}</span>
        <span className={styles.target}>
          {targetLabel} {formatFigure(asFigure(row.target), lang)}
        </span>
        <span className={styles.period}>{row.period_label}</span>
        <span className={styles.polarity}>
          {tOpen(`ranking.polarity.${row.polarity}`, row.polarity)}
        </span>
      </span>
    </li>
  );
}

function UnrankedRow({ row }: { row: NotAssessable }) {
  const { lang } = useI18n();

  return (
    <li className={styles.unrankedRow}>
      <span className={styles.name}>
        <LocalizedText text={row.indicator} />
      </span>
      <span className={styles.reason}>
        <LocalizedText text={row.reason} />
      </span>
      {row.actual !== null && row.actual !== undefined ? (
        <span className={styles.actual}>
          {formatWithUnit(asFigure(row.actual), row.unit ?? null, lang)}
        </span>
      ) : null}
    </li>
  );
}

/** Figures arrive as strings on most shapes and as numbers here. */
function asFigure(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}
