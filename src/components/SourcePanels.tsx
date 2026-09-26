import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { panelsOf, replyDir, type AskResponse, type SourceAnswer } from '../api/types';
import { ProseText } from '../i18n/ProseText';
import { useI18n } from '../i18n/useI18n';
import { useConversation, type Turn } from '../state/useConversation';
import { Feedback } from './Feedback';
import styles from './SourcePanels.module.css';

/**
 * Two houses answering the same question.
 *
 * They are rendered side by side and never merged. The response does carry a
 * pre-joined `answer` string, and it is deliberately unused: splitting it back
 * apart would be reassembling what the API took care to separate, and the
 * reader needs to see who said what. Expect the two to disagree — that is the
 * point of asking both.
 */
export function SourcePanels({ turn, response }: { turn: Turn; response: AskResponse }) {
  const panels = panelsOf(response);

  return (
    <div className={panels.length > 1 ? `${styles.panels} ${styles.pair}` : styles.panels}>
      {panels.map((panel) => (
        <SourcePanel key={panel.source} turn={turn} panel={panel} />
      ))}
    </div>
  );
}

function SourcePanel({ turn, panel }: { turn: Turn; panel: SourceAnswer }) {
  const { t, tOpen } = useI18n();
  const { lens } = useConversation();

  const isScai = panel.source === 'scai';
  const name = tOpen(`source.${panel.source}`, panel.source);

  return (
    <article className={styles.panel} data-source={panel.source} data-ok={panel.ok ? 'true' : 'false'}>
      <header className={styles.head}>
        <span className={styles.name}>{name}</span>

        {/* The difference the reader must be able to see: which answer carries
            the guarantee that its figures were checked. Oxford's never can —
            their prose is composed over data this service does not hold. */}
        {panel.verified === true ? (
          <span className={styles.verified}>
            <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
            {t('panel.verified')}
          </span>
        ) : null}

        {panel.latency_ms && lens === 'explore' ? (
          <span className={styles.latency}>{t('panel.latency', { s: latency(panel) })}</span>
        ) : null}
      </header>

      {!isScai ? (
        <p className={styles.unverifiedNote}>
          <AlertTriangle size={13} strokeWidth={1.75} aria-hidden="true" />
          {t('panel.oxfordNote')}
        </p>
      ) : null}

      {panel.ok ? (
        // Passed through byte for byte, including figures that look wrong:
        // nothing is filtered or corrected here.
        <div className={styles.prose} dir={replyDir(panel.answer)}>
          <ProseText text={panel.answer} />
        </div>
      ) : (
        // One half failing is never a reason to discard the other.
        <p className={styles.error}>{panel.error ?? t('panel.failed', { source: name })}</p>
      )}

      {panel.tools_used && panel.tools_used.length > 0 && lens === 'explore' ? (
        <p className={styles.tools}>{t('panel.tools', { tools: panel.tools_used.join(', ') })}</p>
      ) : null}

      {/* Each half is rated on its own id — comparing the two is the point of
          the trial, and per-source ratings are the signal it produces. */}
      {panel.ok && panel.message_id ? (
        <Feedback turn={turn} messageId={panel.message_id} />
      ) : null}
    </article>
  );
}

function latency(panel: SourceAnswer): string {
  return ((panel.latency_ms ?? 0) / 1000).toFixed(1);
}
