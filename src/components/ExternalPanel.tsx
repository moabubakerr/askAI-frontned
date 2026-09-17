import { AlertTriangle, Globe } from 'lucide-react';
import type { ExternalBlock } from '../api/types';
import { formatNumber } from '../i18n/formatNumber';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { Degradations } from './Callouts';
import styles from './ExternalPanel.module.css';

/**
 * The single home for third-party prose, clearly separated from the approved
 * answer and never merged into it.
 *
 * Two rules shape this component. The caveat is unconditional and is rendered
 * above the prose — the API emits it in that order for exactly this reason. And
 * an agent that was asked and failed is a state with content of its own: it
 * says so here, rather than looking like an agent that was never asked (which
 * renders nothing at all, because the block is absent).
 */
export function ExternalPanel({ block }: { block: ExternalBlock }) {
  const { t, lang } = useI18n();
  const failed = block.outcome !== 'success';

  return (
    <aside className={styles.panel} data-provenance="external" data-outcome={block.outcome}>
      <header className={styles.head}>
        <span className={styles.chip}>
          <Globe size={13} strokeWidth={1.75} aria-hidden="true" />
          {t('external.title')}
        </span>
        <span className={styles.outcome} data-failed={failed ? 'true' : undefined}>
          {t(OUTCOME_LABEL[block.outcome])}
        </span>
        <span className={styles.elapsed}>
          {t('external.elapsed', { seconds: formatNumber(block.elapsed_seconds, lang) })}
        </span>
      </header>

      <p className={styles.agent}>
        <LocalizedText text={block.agent} />
      </p>

      {/* Above the prose, always, whatever the outcome. */}
      <p className={styles.caveat}>
        <span className={styles.caveatLabel}>{t('caveat.label')}</span>
        <LocalizedText text={block.caveat} />
      </p>

      {block.outcome === 'success' && block.prose ? (
        <p className={styles.prose}>
          <LocalizedText text={block.prose} />
        </p>
      ) : null}

      {block.reason ? (
        <p className={styles.reason}>
          <LocalizedText text={block.reason} />
        </p>
      ) : null}

      {block.check ? (
        <div className={styles.check} data-flagged={block.check.flagged ? 'true' : undefined}>
          <h4 className={styles.checkTitle}>
            {block.check.flagged ? (
              <AlertTriangle size={13} strokeWidth={1.75} aria-hidden="true" />
            ) : null}
            {t('external.checkTitle')}
          </h4>
          <dl className={styles.pairs}>
            <div className={styles.pair}>
              <dt>{t('external.band')}</dt>
              <dd>
                <LocalizedText text={block.check.band} />
              </dd>
            </div>
            <div className={styles.pair}>
              <dt>{t('external.limits')}</dt>
              <dd>
                <LocalizedText text={block.check.limits} />
              </dd>
            </div>
            {block.check.found.length > 0 ? (
              <div className={styles.pair}>
                <dt>{t('external.found')}</dt>
                <dd>
                  {block.check.found.map((item, index) => (
                    <span key={index} className={styles.item}>
                      <LocalizedText text={item} />
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            {block.check.beyond.length > 0 ? (
              <div className={styles.pair}>
                <dt>{t('external.beyond')}</dt>
                <dd>
                  {block.check.beyond.map((item, index) => (
                    <span key={index} className={styles.item}>
                      <LocalizedText text={item} />
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <Degradations items={block.degradations} />
    </aside>
  );
}

const OUTCOME_LABEL = {
  success: 'external.outcome.success',
  timeout: 'external.outcome.timeout',
  unavailable: 'external.outcome.unavailable',
  abandoned: 'external.outcome.abandoned',
} as const;
