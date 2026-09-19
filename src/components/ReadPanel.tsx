import { ChevronRight, Quote } from 'lucide-react';
import { useState } from 'react';
import {
  bulletLines,
  nonBulletText,
  replyDir,
  type CouncilAnalysis,
  type ReadEvidence,
  type ReadResponse,
} from '../api/types';
import { formatFigure, formatWithUnit } from '../i18n/figures';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
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

  return (
    <section className={styles.panel} aria-label={t('read.title')}>
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

      {read.one_liner ? (
        <p className={styles.oneLiner} dir={replyDir(read.one_liner)}>
          <LocalizedText text={read.one_liner} />
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
          {evidenceOpen ? <EvidenceTable rows={evidence} /> : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * SCAI analysts' own words, verbatim. Quoted and attributed, so it reads as a
 * citation rather than as the app's own voice. `summary` carries "• " bullet
 * lines, which become a list.
 */
function CouncilBlock({ item }: { item: CouncilAnalysis }) {
  const { t } = useI18n();
  const period = item.period_human || item.period_label || '';
  const bullets = bulletLines(item.summary);
  const lead = nonBulletText(item.summary);

  return (
    <figure className={styles.council} dir={replyDir(item.summary)}>
      <figcaption className={styles.attribution}>
        <Quote size={12} strokeWidth={2} aria-hidden="true" />
        {period ? t('read.councilWithPeriod', { period }) : t('read.council')}
      </figcaption>

      {lead ? (
        <p className={styles.councilLead}>
          <LocalizedText text={lead} />
        </p>
      ) : null}

      {bullets.length > 0 ? (
        <ul className={styles.bullets}>
          {bullets.map((line, index) => (
            <li key={index}>
              <LocalizedText text={line} />
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}

function EvidenceTable({ rows }: { rows: ReadEvidence[] }) {
  const { t, lang } = useI18n();

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">{t('facts.period')}</th>
          <th scope="col">{t('facts.value')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td className={styles.mono}>{row.period_label ?? ''}</td>
            <td className={`${styles.mono} num`}>
              {formatWithUnit(row.actual ?? null, row.unit ?? null, lang)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
