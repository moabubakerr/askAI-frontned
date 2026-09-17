import { approvedPackages, type Candidate } from '../api/types';
import { formatNumber } from '../i18n/formatNumber';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import {
  useConversation,
  type SourceChoice,
  type Turn as TurnModel,
} from '../state/useConversation';
import { ExternalPanel } from './ExternalPanel';
import { InheritanceBanner } from './InheritanceBanner';
import { PackageCard } from './PackageCard';
import styles from './Turn.module.css';

const SOURCE_LABEL = {
  approved: 'source.approved',
  external: 'source.external',
  combined: 'source.combined',
} as const satisfies Record<SourceChoice, string>;

export function Turn({ turn }: { turn: TurnModel }) {
  const { t, lang } = useI18n();
  const { ask, resolveCandidate, disambiguate, focusComposer } = useConversation();

  // An external entry inside `packages` is dropped: `external` is the single
  // home for third-party prose, and the backend sends both today.
  const packages = approvedPackages(turn.response?.packages ?? []);
  const external = turn.response?.external;
  const stale = turn.response?.freshness.stale ?? false;

  const onAsk = (question: string) => ask(question, lang);
  const onPick = (candidate: Candidate) => resolveCandidate(turn, candidate, lang);

  return (
    <section className={styles.turn} aria-labelledby={`turn-${turn.index}-question`}>
      <div className={styles.ask}>
        <span className={styles.number}>
          {t('turn.number', { n: formatNumber(turn.index + 1, lang) })}
        </span>
        <h2 className={styles.question} id={`turn-${turn.index}-question`}>
          <LocalizedText text={turn.question} />
        </h2>
        <span className={styles.against}>
          {t('turn.askedAgainst', { source: t(SOURCE_LABEL[turn.source]) })}
        </span>
      </div>

      {turn.inherited ? (
        <InheritanceBanner inherited={turn.inherited} onReject={() => disambiguate(turn, lang)} />
      ) : null}

      {turn.resolvedWith ? (
        <p className={styles.resolved}>{t('turn.resolved', { name: turn.resolvedWith })}</p>
      ) : null}

      {turn.status === 'loading' ? (
        <p className={styles.loading}>
          <span className={styles.spinner} aria-hidden="true" />
          {t('turn.loading')}
        </p>
      ) : null}

      {/* A rejected request is not a refusal: nothing was answered, and there
          are no packages to read. */}
      {turn.status === 'error' ? (
        <div className={styles.failure}>
          <p>
            {turn.rejected
              ? t('turn.rejected', { message: turn.error ?? '' })
              : t('turn.error', { message: turn.error ?? '' })}
          </p>
          <button type="button" className={styles.retry} onClick={() => onAsk(turn.question)}>
            {t('turn.retry')}
          </button>
        </div>
      ) : null}

      {turn.status === 'ready' ? (
        <div className={packages.length > 1 ? `${styles.packages} ${styles.pair}` : styles.packages}>
          {packages.map((pkg, index) => (
            <PackageCard
              key={`${pkg.provenance}-${index}`}
              pkg={pkg}
              turnIndex={turn.index}
              pkgIndex={index}
              stale={stale}
              onAsk={onAsk}
              onPickCandidate={onPick}
              onFollowUp={focusComposer}
            />
          ))}
        </div>
      ) : null}

      {/* Present only when an external agent was asked. An agent that was never
          admitted renders nothing here; one that failed says so itself. */}
      {turn.status === 'ready' && external ? <ExternalPanel block={external} /> : null}
    </section>
  );
}
