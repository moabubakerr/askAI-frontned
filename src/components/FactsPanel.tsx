import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  assertNever,
  countriesWithNoData,
  factsAnalysis,
  factsKind,
  factsPassages,
  factsTopic,
  factsUnit,
  type CountryRow,
  type Facts,
  type Figure,
  type SeriesRow,
} from '../api/types';
import { formatChange, formatFigure, formatPercent, formatWithUnit, NO_VALUE } from '../i18n/figures';
import { CouncilProse, CouncilText } from './CouncilText';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './FactsPanel.module.css';

/**
 * The structured half of an answer.
 *
 * `facts` carries no type discriminator, so the shape is read from which keys
 * are present — see `factsKind`. An unrecognised shape is not dropped: it falls
 * through to a plain key/value list, so a new question type the service learns
 * still shows its data instead of vanishing.
 */
export function FactsPanel({ facts }: { facts: Facts }) {
  const kind = factsKind(facts);
  const unit = factsUnit(facts);

  switch (kind) {
    case 'none':
      return null;
    case 'latest-value':
      return <LatestValue facts={facts} unit={unit} />;
    case 'definition':
      return <Definition facts={facts} unit={unit} />;
    case 'trend':
      return <Trend facts={facts} unit={unit} />;
    case 'extremes':
      return <Extremes facts={facts} unit={unit} />;
    case 'comparison':
      return <Comparison facts={facts} unit={unit} />;
    case 'growth':
      return <Growth facts={facts} unit={unit} />;
    case 'country-comparison':
      return <CountryTable facts={facts} unit={unit} rowsKey="rows" />;
    case 'country-ranking':
      return <CountryTable facts={facts} unit={unit} rowsKey="ranked" ranked />;
    case 'period-ranking':
      return <PeriodRanking facts={facts} unit={unit} />;
    case 'analysis':
      return <AnalysisList facts={facts} unit={unit} />;
    case 'passages':
      return <Passages facts={facts} />;
    case 'overview':
      return <Overview facts={facts} />;
    case 'capability':
      return <Capability facts={facts} />;
    case 'count':
      return <CountList facts={facts} />;
    case 'unknown':
      return <UnknownShape facts={facts} />;
    default:
      return assertNever(kind);
  }
}

/* ------------------------------------------------------------------ */
/* shared pieces                                                        */
/* ------------------------------------------------------------------ */

const str = (facts: Facts, key: string): string =>
  typeof facts[key] === 'string' ? (facts[key] as string) : '';

const fig = (facts: Facts, key: string): Figure => {
  const value = facts[key];
  return typeof value === 'string' || value === null ? (value as Figure) : null;
};

function Stat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={strong ? `${styles.statValue} ${styles.strong} num` : `${styles.statValue} num`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Countries the service was asked about and holds no approved data for.
 *
 * Always rendered. Hiding them would make a partial answer look complete, which
 * is the failure QC finding F-001 was raised for.
 */
function NoDataCountries({ countries }: { countries: string[] }) {
  const { t } = useI18n();
  if (countries.length === 0) return null;

  return (
    <p className={styles.noData}>
      <span className={styles.noDataLabel}>{t('facts.noDataFor')}</span>
      {countries.map((country) => (
        <span key={country} className={styles.noDataChip}>
          <LocalizedText text={country} />
        </span>
      ))}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* one renderer per shape                                               */
/* ------------------------------------------------------------------ */

function LatestValue({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t, lang } = useI18n();
  const target = fig(facts, 'target');

  return (
    <div className={styles.panel}>
      <div className={styles.headline}>
        <span className={`${styles.headlineValue} num`}>{formatFigure(fig(facts, 'actual'), lang)}</span>
        {unit ? <span className={styles.headlineUnit}>{unit}</span> : null}
      </div>
      <div className={styles.row}>
        <Stat label={t('facts.period')} value={str(facts, 'period_label')} />
        {target !== null ? <Stat label={t('facts.target')} value={formatFigure(target, lang)} /> : null}
      </div>
    </div>
  );
}

function Definition({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t } = useI18n();

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <Stat label={t('facts.indicator')} value={str(facts, 'indicator')} />
        {unit ? <Stat label={t('facts.unit')} value={unit} /> : null}
      </div>
      <p className={styles.definition}>
        <LocalizedText text={str(facts, 'definition')} />
      </p>
    </div>
  );
}

function Trend({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t, lang } = useI18n();
  const series = Array.isArray(facts['series']) ? (facts['series'] as SeriesRow[]) : [];
  const points = typeof facts['n_points'] === 'number' ? (facts['n_points'] as number) : series.length;

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <Stat label={t('facts.points')} value={String(points)} />
        {unit ? <Stat label={t('facts.unit')} value={unit} /> : null}
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('facts.period')}</th>
            <th scope="col">{t('facts.value')}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((row, index) => (
            <tr key={`${row.period_label}-${index}`}>
              <td className={styles.mono}>{row.period_label}</td>
              <td className={`${styles.mono} num`}>{formatFigure(row.actual, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Extremes({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t, lang } = useI18n();

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <Stat
          label={t('facts.high', { period: str(facts, 'high_period') })}
          value={formatWithUnit(fig(facts, 'high_value'), unit, lang)}
          strong
        />
        <Stat
          label={t('facts.low', { period: str(facts, 'low_period') })}
          value={formatWithUnit(fig(facts, 'low_value'), unit, lang)}
          strong
        />
        <Stat
          label={t('facts.difference')}
          value={formatWithUnit(fig(facts, 'absolute_difference'), unit, lang)}
        />
      </div>
    </div>
  );
}

function Comparison({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t, lang } = useI18n();

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <Stat
          label={str(facts, 'period_a')}
          value={formatWithUnit(fig(facts, 'value_a'), unit, lang)}
          strong
        />
        <Stat
          label={str(facts, 'period_b')}
          value={formatWithUnit(fig(facts, 'value_b'), unit, lang)}
          strong
        />
        <Stat label={t('facts.change')} value={formatChange(fig(facts, 'absolute_change'), unit, lang)} />
        <Stat label={t('facts.percentChange')} value={formatPercent(fig(facts, 'percent_change'), lang)} />
      </div>
    </div>
  );
}

function Growth({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t, lang } = useI18n();

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <Stat
          label={str(facts, 'period_start')}
          value={formatWithUnit(fig(facts, 'value_start'), unit, lang)}
        />
        <Stat
          label={str(facts, 'period_end')}
          value={formatWithUnit(fig(facts, 'value_end'), unit, lang)}
        />
        <Stat
          label={t('facts.growthRate')}
          value={formatPercent(fig(facts, 'growth_rate_percent'), lang)}
          strong
        />
      </div>
      {/* How it was measured is part of the number, not a footnote. */}
      <p className={styles.method}>
        {t('facts.method')}: <LocalizedText text={str(facts, 'method')} />
      </p>
    </div>
  );
}

function CountryTable({
  facts,
  unit,
  rowsKey,
  ranked = false,
}: {
  facts: Facts;
  unit: string | null;
  rowsKey: 'rows' | 'ranked';
  ranked?: boolean;
}) {
  const { t, lang } = useI18n();
  const rows = Array.isArray(facts[rowsKey]) ? (facts[rowsKey] as CountryRow[]) : [];
  const periodUsed = str(facts, 'period_used');

  return (
    <div className={styles.panel}>
      {periodUsed ? (
        <div className={styles.row}>
          <Stat label={t('facts.periodUsed')} value={periodUsed} />
          {unit ? <Stat label={t('facts.unit')} value={unit} /> : null}
        </div>
      ) : null}

      <table className={styles.table}>
        <thead>
          <tr>
            {ranked ? <th scope="col">{t('facts.rank')}</th> : null}
            <th scope="col">{t('facts.country')}</th>
            <th scope="col">{t('facts.period')}</th>
            <th scope="col">{t('facts.value')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.country}-${index}`}>
              {ranked ? <td className={styles.mono}>{index + 1}</td> : null}
              <td>
                <LocalizedText text={row.country} />
              </td>
              <td className={styles.mono}>{row.period_label}</td>
              <td className={`${styles.mono} num`}>{formatWithUnit(row.actual, unit, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <NoDataCountries countries={countriesWithNoData(facts)} />
    </div>
  );
}

/** Periods ranked against each other — highest or lowest years, say. */
function PeriodRanking({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t, lang } = useI18n();
  const rows = Array.isArray(facts['ranked_periods'])
    ? (facts['ranked_periods'] as SeriesRow[])
    : [];
  const order = str(facts, 'order');
  const points = typeof facts['n_points'] === 'number' ? (facts['n_points'] as number) : rows.length;

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        {/* The service's own word for the direction — ascending, descending —
            rather than one inferred from the row order. */}
        {order ? <Stat label={t('facts.order')} value={order} /> : null}
        <Stat label={t('facts.points')} value={String(points)} />
        {unit ? <Stat label={t('facts.unit')} value={unit} /> : null}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('facts.rank')}</th>
            <th scope="col">{t('facts.period')}</th>
            <th scope="col">{t('facts.value')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.period_label}-${index}`}>
              <td className={styles.mono}>{index + 1}</td>
              <td className={styles.mono}>{row.period_label}</td>
              <td className={`${styles.mono} num`}>{formatWithUnit(row.actual, unit, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * SCAI's analyst commentary, verbatim.
 *
 * The Council's own writing, so it renders in the shared quoted-and-attributed
 * block rather than as the app's prose — and each field it carries keeps its own
 * heading instead of being flattened into one summary.
 */
function AnalysisList({ facts, unit }: { facts: Facts; unit: string | null }) {
  const { t, lang } = useI18n();
  const entries = factsAnalysis(facts);
  if (entries.length === 0) return null;

  return (
    <div className={styles.panel}>
      {entries.map((entry, index) => {
        const period = entry.period_label ?? '';
        const value = entry.value ?? null;

        return (
          <CouncilText
            key={index}
            attribution={t('analysis.attribution')}
            meta={
              <>
                {period}
                {value !== null ? ` · ${formatWithUnit(value, unit, lang)}` : ''}
              </>
            }
          >
            {entry.summary ? <CouncilProse text={entry.summary} /> : null}
            {entry.detailed ? (
              <CouncilProse text={entry.detailed} label={t('analysis.detailed')} />
            ) : null}
            {entry.npc_analysis ? (
              <CouncilProse text={entry.npc_analysis} label={t('analysis.npc')} />
            ) : null}
            {entry.benchmark ? (
              <CouncilProse text={entry.benchmark} label={t('analysis.benchmark')} />
            ) : null}
          </CouncilText>
        );
      })}
    </div>
  );
}

/**
 * Excerpts from SCAI articles — also the Council's published writing, so the
 * article each one came from is named with it. Collapsed by default: these are
 * sources for the answer above, not the answer itself.
 */
function Passages({ facts }: { facts: Facts }) {
  const { t } = useI18n();
  const passages = factsPassages(facts);
  const topic = factsTopic(facts);
  const [open, setOpen] = useState(false);
  if (passages.length === 0) return null;

  return (
    <div className={styles.panel}>
      {topic ? <Stat label={t('passages.topic')} value={topic} /> : null}

      <button
        type="button"
        className={styles.disclosure}
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <ChevronRight
          size={13}
          strokeWidth={1.75}
          aria-hidden="true"
          className={open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
        />
        {t('passages.show', { n: String(passages.length) })}
      </button>

      {open
        ? passages.map((passage, index) => (
            <CouncilText
              key={index}
              attribution={t('passages.attribution')}
              meta={passage.article_title ?? passage.article_id ?? ''}
            >
              <CouncilProse text={passage.excerpt} />
            </CouncilText>
          ))
        : null}
    </div>
  );
}

function Overview({ facts }: { facts: Facts }) {
  const { t, lang } = useI18n();
  const rows = Array.isArray(facts['overview']) ? (facts['overview'] as Record<string, unknown>[]) : [];

  return (
    <div className={styles.panel}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('facts.indicator')}</th>
            <th scope="col">{t('facts.period')}</th>
            <th scope="col">{t('facts.value')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const unit = typeof row['unit'] === 'string' ? (row['unit'] as string) : null;
            const value = typeof row['actual'] === 'string' ? (row['actual'] as string) : null;
            return (
              <tr key={index}>
                <td>
                  <LocalizedText text={String(row['indicator'] ?? '')} />
                </td>
                <td className={styles.mono}>{String(row['period_label'] ?? '')}</td>
                {/* Each row carries its own unit — they are not comparable. */}
                <td className={`${styles.mono} num`}>{formatWithUnit(value, unit, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Capability({ facts }: { facts: Facts }) {
  const { t, lang } = useI18n();
  const count = typeof facts['published_indicator_count'] === 'number'
    ? (facts['published_indicator_count'] as number)
    : null;
  const sectors = Array.isArray(facts['sectors_covered'])
    ? (facts['sectors_covered'] as string[])
    : [];

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        {count !== null ? (
          <Stat label={t('facts.indicatorCount')} value={formatFigure(String(count), lang)} strong />
        ) : null}
      </div>
      {sectors.length > 0 ? (
        <ul className={styles.chips}>
          {sectors.map((sector) => (
            <li key={sector} className={styles.chip}>
              <LocalizedText text={sector} />
            </li>
          ))}
        </ul>
      ) : null}
      <p className={styles.method}>
        <LocalizedText text={str(facts, 'capability_note')} />
      </p>
    </div>
  );
}

function CountList({ facts }: { facts: Facts }) {
  const { t, lang } = useI18n();
  const count = typeof facts['count'] === 'number' ? (facts['count'] as number) : null;
  const names = Array.isArray(facts['names']) ? (facts['names'] as string[]) : [];

  return (
    <div className={styles.panel}>
      {count !== null ? (
        <div className={styles.row}>
          <Stat label={t('facts.count')} value={formatFigure(String(count), lang)} strong />
        </div>
      ) : null}
      <ul className={styles.chips}>
        {names.map((name) => (
          <li key={name} className={styles.chip}>
            <LocalizedText text={name} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A shape this client has not been taught yet. Rendering the keys plainly is
 * better than rendering nothing: the reader still sees what the service
 * answered, and the gap is obvious rather than silent.
 */
function UnknownShape({ facts }: { facts: Facts }) {
  const { lang } = useI18n();
  const entries = Object.entries(facts).filter(([, value]) => typeof value !== 'object');
  if (entries.length === 0) return null;

  return (
    <div className={styles.panel}>
      <dl className={styles.pairs}>
        {entries.map(([key, value]) => (
          <div key={key} className={styles.pair}>
            <dt>{key}</dt>
            <dd className={styles.mono}>
              {typeof value === 'string' ? formatFigure(value, lang) : String(value ?? NO_VALUE)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
