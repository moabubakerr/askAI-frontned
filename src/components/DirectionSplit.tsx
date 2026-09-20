import {
  decliningRows,
  increasingRows,
  noComparisonRows,
  toNumber,
  unchangedRows,
  type DirectionRow,
  type Facts,
} from '../api/types';
import { formatPercent, formatWithUnit, NO_VALUE } from '../i18n/figures';
import { formatNumber } from '../i18n/formatNumber';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './DirectionSplit.module.css';

/**
 * A group of indicators split by direction of travel, year on year.
 *
 * Rose and fell are facts. Better and worse are not: `polarity` says which way
 * is welcome for each indicator, and for Inflation, Cost per Student and PISA
 * Rank a fall is the good news. So the colouring here marks **direction only**,
 * and each row states which way is welcome rather than the client deciding.
 *
 * Rows arrive sorted — largest rise first, largest fall first — and are never
 * reordered.
 */
export function DirectionSplit({ facts }: { facts: Facts }) {
  const { t, lang } = useI18n();

  const increasing = increasingRows(facts);
  const declining = decliningRows(facts);
  const unchanged = unchangedRows(facts);
  const noComparison = noComparisonRows(facts);

  const scope = typeof facts['scope'] === 'string' ? facts['scope'] : '';
  const scopeKind = typeof facts['scope_kind'] === 'string' ? facts['scope_kind'] : '';
  const comparison = typeof facts['comparison'] === 'string' ? facts['comparison'] : '';

  const count = (key: string, rows: DirectionRow[]) =>
    typeof facts[key] === 'number' ? (facts[key] as number) : rows.length;

  const nIncreasing = count('n_increasing', increasing);
  const nDeclining = count('n_declining', declining);
  const nTotal =
    typeof facts['n_total'] === 'number'
      ? (facts['n_total'] as number)
      : increasing.length + declining.length + unchanged.length + noComparison.length;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        {scope ? (
          <span className={styles.scope}>
            <LocalizedText text={scope} />
            {scopeKind ? <span className={styles.scopeKind}>{scopeKind}</span> : null}
          </span>
        ) : null}
        {/* What was compared, in the service's own words. */}
        {comparison ? (
          <span className={styles.comparison}>
            <LocalizedText text={comparison} />
          </span>
        ) : null}
      </div>

      <div className={styles.columns}>
        <Group
          title={t('direction.rose', { n: formatNumber(nIncreasing, lang) })}
          rows={increasing}
          direction="up"
        />
        <Group
          title={t('direction.fell', { n: formatNumber(nDeclining, lang) })}
          rows={declining}
          direction="down"
        />
      </div>

      {unchanged.length > 0 ? (
        <Group
          title={t('direction.unchanged', { n: formatNumber(unchanged.length, lang) })}
          rows={unchanged}
          direction="flat"
        />
      ) : null}

      {/* Not "unchanged", and never hidden: an answer that silently covers 6 of
          8 indicators is a false picture of the group. */}
      {noComparison.length > 0 ? (
        <section className={styles.noComparison}>
          <h4 className={styles.noComparisonTitle}>
            {t('direction.noComparison', {
              n: formatNumber(noComparison.length, lang),
              total: formatNumber(nTotal, lang),
            })}
          </h4>
          <ul className={styles.list}>
            {noComparison.map((row, index) => (
              <li key={`${row.indicator}-${index}`} className={styles.row}>
                <span className={styles.name}>
                  <LocalizedText text={row.indicator} />
                </span>
                <span className={styles.reason}>
                  <LocalizedText text={row.reason ?? ''} />
                </span>
                <Detail row={row} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Group({
  title,
  rows,
  direction,
}: {
  title: string;
  rows: DirectionRow[];
  direction: 'up' | 'down' | 'flat';
}) {
  const { lang } = useI18n();

  return (
    <section className={styles.group} data-direction={direction}>
      <h4 className={styles.groupTitle}>
        <span aria-hidden="true" className={styles.arrow}>
          {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'}
        </span>
        {title}
      </h4>

      <ul className={styles.list}>
        {rows.map((row, index) => {
          const change = toNumber(row.change_yoy_percent ?? null);
          return (
            <li key={`${row.indicator}-${index}`} className={styles.row}>
              <span className={styles.name}>
                <LocalizedText text={row.indicator} />
              </span>
              {/* Stored to four places; one or two is what reads. */}
              <span className={`${styles.change} num`}>
                {change === null ? NO_VALUE : formatPercent(change.toFixed(2), lang)}
              </span>
              <Detail row={row} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The reading itself, and which way is welcome for this indicator.
 *
 * The unit belongs to the row and already carries its scale, so nothing is
 * appended to it and it is never hoisted into a header. The period belongs to
 * the row too: 2025-Q4 beside 2026-Q1 is correct, because these indicators
 * report on different schedules.
 */
function Detail({ row }: { row: DirectionRow }) {
  const { tOpen, lang } = useI18n();
  const unit = typeof row.unit === 'string' && row.unit.length > 0 ? row.unit : null;
  const actual = row.actual;

  return (
    <span className={styles.detail}>
      {actual !== undefined && actual !== null ? (
        <span className={styles.actual}>
          {formatWithUnit(typeof actual === 'number' ? String(actual) : actual, unit, lang)}
        </span>
      ) : null}
      {row.period_label ? <span className={styles.period}>{row.period_label}</span> : null}
      {row.polarity ? (
        <span className={styles.polarity}>
          {tOpen(`ranking.polarity.${row.polarity}`, row.polarity)}
        </span>
      ) : null}
    </span>
  );
}
