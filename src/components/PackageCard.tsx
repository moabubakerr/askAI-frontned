import { ArrowUpRight } from 'lucide-react';
import { assertNever, type AnswerPackage, type Candidate } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import { AnalysisBlock } from './AnalysisBlock';
import { BasisList } from './BasisList';
import { Caveat, Degradations, Suggestions } from './Callouts';
import { Chart } from './Chart/Chart';
import { ClarificationBody } from './ClarificationBody';
import { byRole, firstByRole } from './elements';
import { Delta, Headline } from './Headline';
import { EvidenceDisclosure } from './EvidenceDisclosure';
import { ProvenanceChip } from './ProvenanceChip';
import { RefusalBody, RefusalChip } from './RefusalCard';
import { ScopeLine } from './ScopeLine';
import styles from './PackageCard.module.css';

interface Props {
  pkg: AnswerPackage;
  turnIndex: number;
  pkgIndex: number;
  stale: boolean;
  onAsk: (question: string) => void;
  onPickCandidate: (candidate: Candidate) => void;
  onFollowUp: () => void;
}

export function PackageCard({
  pkg,
  turnIndex,
  pkgIndex,
  stale,
  onAsk,
  onPickCandidate,
  onFollowUp,
}: Props) {
  const { t } = useI18n();
  const { lens, setLens, isEvidenceOpen, toggleEvidence, chartView, setChartView } =
    useConversation();
  const explore = lens === 'explore';

  // Role picks the slot. Nothing below reads `class` to decide placement.
  const scope = firstByRole(pkg.elements, 'scope');
  const headline = firstByRole(pkg.elements, 'headline');
  const delta = firstByRole(pkg.elements, 'delta');
  const series = firstByRole(pkg.elements, 'series');
  const notes = byRole(pkg.elements, 'note');
  const analysis = [...byRole(pkg.elements, 'analysis'), ...byRole(pkg.elements, 'commentary')];
  const evidence = byRole(pkg.elements, 'evidence');

  const regionId = `evidence-${turnIndex}-${pkgIndex}`;

  return (
    <article
      className={styles.card}
      data-provenance={pkg.provenance}
      data-kind={pkg.kind}
      data-stale={stale ? 'true' : undefined}
    >
      <header className={styles.head}>
        <ProvenanceChip provenance={pkg.provenance} />
        {pkg.kind === 'refusal' ? <RefusalChip code={pkg.refusal_code} /> : null}
        {pkg.kind === 'clarification' ? (
          <span className={styles.kindLabel}>{t('clarification.title')}</span>
        ) : null}
        {stale ? <span className={styles.stale}>{t('freshness.staleBadge')}</span> : null}
      </header>

      {/* The service's own sentence about where the answer came from. */}
      <p className={styles.agent}>
        <LocalizedText text={pkg.agent} />
      </p>

      <ScopeLine scope={scope} spec={pkg.spec} />

      <div className={styles.body}>
        {headline ? <Headline element={headline} /> : null}
        {delta ? <Delta element={delta} /> : null}

        {/* A property of the content, not a footnote: it survives Executive. */}
        {pkg.caveat ? <Caveat text={pkg.caveat} /> : null}

        <KindBlock
          pkg={pkg}
          explore={explore}
          seriesElement={series}
          view={chartView(turnIndex, pkgIndex, chartableDefault(pkg))}
          onViewChange={(view) => setChartView(turnIndex, pkgIndex, view)}
          onPickCandidate={onPickCandidate}
          onFollowUp={onFollowUp}
        />

        {explore ? <AnalysisBlock elements={analysis} /> : null}

        <BasisList elements={notes} />

        {!explore && hasExploreOnlyContent(analysis.length, evidence.length, series) ? (
          <button type="button" className={styles.exploreLink} onClick={() => setLens('explore')}>
            {t('lens.openExplore')}
            <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}

        <Suggestions items={pkg.suggestions} onAsk={onAsk} />

        {explore ? <Degradations items={pkg.degradations} /> : null}
      </div>

      {explore ? (
        <EvidenceDisclosure
          rows={evidence}
          open={isEvidenceOpen(turnIndex, pkgIndex)}
          onToggle={() => toggleEvidence(turnIndex, pkgIndex)}
          regionId={regionId}
        />
      ) : null}
    </article>
  );
}

/** `default_view` is null when nothing is chartable; the chart renders nothing. */
function chartableDefault(pkg: AnswerPackage): string {
  return pkg.chartable.default_view ?? pkg.chartable.alternate_views[0] ?? 'line';
}

function hasExploreOnlyContent(
  analysisCount: number,
  evidenceCount: number,
  series: ReturnType<typeof firstByRole>,
): boolean {
  return analysisCount > 0 || evidenceCount > 0 || series !== undefined;
}

interface KindBlockProps {
  pkg: AnswerPackage;
  explore: boolean;
  seriesElement: ReturnType<typeof firstByRole>;
  view: string;
  onViewChange: (view: string) => void;
  onPickCandidate: (candidate: Candidate) => void;
  onFollowUp: () => void;
}

/**
 * The only place that branches on `kind`, and it handles all three. A refusal
 * is terminal; a clarification is an invitation to say more on the same
 * conversation. They are never collapsed into one "error" state — a new
 * backend variant is a compile error here, not a blank card.
 */
function KindBlock({
  pkg,
  explore,
  seriesElement,
  view,
  onViewChange,
  onPickCandidate,
  onFollowUp,
}: KindBlockProps) {
  switch (pkg.kind) {
    case 'answer':
      return explore ? (
        <Chart
          chartable={pkg.chartable}
          series={seriesElement}
          view={view}
          onViewChange={onViewChange}
        />
      ) : null;
    case 'refusal':
      return <RefusalBody pkg={pkg} />;
    case 'clarification':
      return (
        <ClarificationBody pkg={pkg} onPickCandidate={onPickCandidate} onFollowUp={onFollowUp} />
      );
    default:
      return assertNever(pkg);
  }
}
