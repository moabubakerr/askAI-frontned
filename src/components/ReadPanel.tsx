import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  factsUnit,
  replyDir,
  sameProse,
  type CouncilAnalysis,
  type Figure,
  type ReadEvidence,
  type ReadResponse,
} from '../api/types';
import { formatFigure, formatWithUnit } from '../i18n/figures';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { CouncilProse, CouncilText } from './CouncilText';
import styles from './ReadPanel.module.css';

/**
 * The read-it-for-me view.
 *
 * Its one hard rule: **the Council's words and the generated prose are never in
 * the same block, and never look alike.** `council_analysis` is what SCAI
 * analysts wrote, quoted and attributed; `narration` is written by a model and
 * carries its disclaimer wherever it goes. Merging them would let generated
 * text borrow the Council's authority, which is a correctness failure and not a
 * styling choice.
 *
 * `evidence` is the raw readings, one disclosure away — available, but never in
 * front of the analysis.
 */
export function ReadPanel({ read }: { read: ReadResponse }) {
  const { t, lang } = useI18n();
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const headline = read.headline;
  const council = read.council_analysis ?? [];
  const evidence = read.evidence ?? [];

  // There is no `answer` field here: the generated prose is `narration`, and
  // `one_liner` sometimes repeats it word for word. Rendered once, at the
  // bottom, where its disclaimer travels with it.
  const oneLiner = sameProse(read.one_liner, read.narration) ? null : read.one_liner;

  return (
    <section className={styles.panel} aria-label={t('read.title')} data-read-panel>
      {/* Null for trends and rankings, which have no single figure. */}
      {headline ? (
        <header className={styles.headline} dir={replyDir(headline.indicator)}>
          <span className={styles.indicator}>
            <LocalizedText text={headline.indicator} />
          </span>
          <span className={styles.figure}>
            <span className={`${styles.value} num`}>{formatFigure(headline.value, lang)}</span>
            {headline.unit ? <span className={styles.unit}>{headline.unit}</span> : null}
          </span>
          <span className={styles.period}>
            {headline.period_human || headline.period_label}
          </span>
        </header>
      ) : null}

      {oneLiner ? (
        <p className={styles.oneLiner} dir={replyDir(oneLiner)}>
          <LocalizedText text={oneLiner} />
        </p>
      ) : null}

      {council.map((item, index) => (
        <CouncilBlock key={index} item={item} />
      ))}

      {read.narration ? (
        <div className={styles.narration}>
          <p className={styles.narrationText} dir={replyDir(read.narration)}>
            <LocalizedText text={read.narration} />
          </p>
          {/* Travels with the narration, always. */}
          <p className={styles.disclaimer} dir={replyDir(read.disclaimer)}>
            {read.disclaimer ?? t('read.disclaimerFallback')}
          </p>
        </div>
      ) : null}

      {evidence.length > 0 ? (
        <div className={styles.evidence}>
          <button
            type="button"
            className={styles.evidenceTrigger}
            aria-expanded={evidenceOpen}
            onClick={() => setEvidenceOpen((open) => !open)}
          >
            <ChevronRight
              size={13}
              strokeWidth={1.75}
              aria-hidden="true"
              className={evidenceOpen ? `${styles.chevron} ${styles.open}` : styles.chevron}
            />
            {t('read.evidence')}
          </button>
          {evidenceOpen ? <EvidenceTable rows={evidence} read={read} /> : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * SCAI analysts' own words, verbatim — the same shared block that analyst
 * commentary uses elsewhere, so Council writing looks identical wherever it
 * appears and never like the generated narration beside it.
 */
function CouncilBlock({ item }: { item: CouncilAnalysis }) {
  const { t } = useI18n();
  const period = item.period_human || item.period_label || '';
  const mismatched = item.period_mismatch === true;

  // When the text is about another period, the label must not put the Council's
  // name to a claim about this one. It says what is actually true — commentary
  // filed against this data point — and warns that the text refers elsewhere.
  const attribution = mismatched
    ? period
      ? t('read.councilAttached', { period })
      : t('read.council')
    : period
      ? t('read.councilWithPeriod', { period })
      : t('read.council');

  return (
    <CouncilText attribution={attribution}>
      {mismatched ? <p className={styles.mismatch}>{t('read.periodMismatch')}</p> : null}
      <CouncilProse text={item.summary} />
    </CouncilText>
  );
}

/**
 * The readings the retelling was built from.
 *
 * The rows carry no unit of their own, so it comes from the facts the answer
 * was composed from — otherwise every figure would read bare. The figures
 * themselves arrive display-rounded and are shown exactly as sent.
 */
function EvidenceTable({ rows, read }: { rows: ReadEvidence[]; read: ReadResponse }) {
  const { t, lang } = useI18n();

  const facts = read.facts_payload && read.facts_payload.ok ? read.facts_payload.facts : undefined;
  const unit = facts ? factsUnit(facts) : null;

  const hasTarget = rows.some((row) => row.target !== null && row.target !== undefined);

  const show = (figure: Figure | undefined): string => formatWithUnit(figure ?? null, unit, lang);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">{t('facts.period')}</th>
          <th scope="col">{t('facts.value')}</th>
          {hasTarget ? <th scope="col">{t('facts.target')}</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td className={styles.mono}>{row.period_human || row.period_label || ''}</td>
            {/* `/read` sends `value`; the /chat shapes send `actual`. */}
            <td className={`${styles.mono} num`}>{show(row.value ?? row.actual)}</td>
            {hasTarget ? <td className={`${styles.mono} num`}>{show(row.target)}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
