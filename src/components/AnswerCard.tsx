import { AlertTriangle, BookOpen } from 'lucide-react';
import {
  factsCandidates,
  factsIndicator,
  factsKind,
  factsNote,
  isFound,
  replyDir,
  splitApproximateMatch,
  splitSourcesFooter,
  type ChatResponse,
  type Facts,
} from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { useConversation, type Turn } from '../state/useConversation';
import { Chart } from './Chart/Chart';
import { Citations } from './Citations';
import { FactsPanel } from './FactsPanel';
import { ReadPanel } from './ReadPanel';
import styles from './AnswerCard.module.css';

interface Props {
  turn: Turn;
  response: ChatResponse;
  onAsk: (question: string) => void;
}

/**
 * One answer.
 *
 * `ok` is the test for success, not the status code: a "no data" answer arrives
 * as HTTP 200 with `ok: false` and an honest message, and must not be rendered
 * as a failure.
 */
export function AnswerCard({ turn, response, onAsk }: Props) {
  const { t } = useI18n();
  const { readTurn } = useConversation();

  const payload = response.facts_payload;
  const found = isFound(payload);

  // The approximate-match warning comes off first, because it can sit *after*
  // the `Sources:` footer — splitting the footer first would take the warning
  // with it. Then the footer, so the citations render once, properly.
  const { body: withoutWarning, warning } = splitApproximateMatch(response.answer);
  const { body, hasFooter } = splitSourcesFooter(withoutWarning);

  const citations = payload.citations ?? [];
  const showCitations = hasFooter && citations.length > 0;
  const chart = response.chart ?? payload.chart ?? null;

  const indicator = found ? factsIndicator(payload.facts) : null;

  // `note` is a caveat on the figures — but a greeting arrives as a facts
  // object holding *only* a note ("Greeting — no data needed."), which is the
  // service talking to itself. A note with no data beside it is not a caveat.
  const note = found && factsKind(payload.facts) !== 'none' ? factsNote(payload.facts) : null;

  // The service answers in the language of the question, which need not be the
  // language of the interface. Direction is decided per reply, from the reply.
  const dir = replyDir(body);

  return (
    <article className={styles.card} data-ok={found ? 'true' : 'false'}>
      {/* Named on every successful answer: an answer that describes an
          indicator without naming it hides a wrong match. */}
      {indicator ? (
        <p className={styles.indicator} dir={replyDir(indicator)}>
          <LocalizedText text={indicator} />
        </p>
      ) : null}

      {/* The verifier rejected the model's phrasing and fell back to a template.
          The data is still correct; the prose is just blunt. Said quietly. */}
      {!response.verified ? (
        <p className={styles.unverified}>
          <AlertTriangle size={13} strokeWidth={1.75} aria-hidden="true" />
          {t('answer.unverified')}
        </p>
      ) : null}

      {/* pre-wrap: refusals are multi-line with "• " bullets, in both
          languages, and the line breaks are the service's own. */}
      <div className={styles.prose} dir={dir}>
        <LocalizedText text={body} />
      </div>

      {/* "I matched your question to X (approximate match)" — low confidence,
          so it is stated as a warning rather than buried in the prose. */}
      {warning ? (
        <p className={styles.approximate} dir={replyDir(warning)}>
          <AlertTriangle size={13} strokeWidth={1.75} aria-hidden="true" />
          <LocalizedText text={warning} />
        </p>
      ) : null}

      {note ? (
        <p className={styles.note} dir={replyDir(note)}>
          <LocalizedText text={note} />
        </p>
      ) : null}

      {found ? <FactsPanel facts={payload.facts} /> : null}

      {/* Not found is a legitimate answer, so it gets no error styling — but an
          ambiguous match carries its candidates, and those become one click. */}
      {!found ? <Choices facts={payload.facts} onAsk={onAsk} /> : null}

      {chart ? <Chart spec={chart} /> : null}

      {/* The service decides what is readable — true only when the answer holds
          an actual reading. Never inferred from the shape of the answer. */}
      {response.readable === true ? (
        <div className={styles.readBlock}>
          {turn.readStatus === 'idle' ? (
            <button type="button" className={styles.readButton} onClick={() => readTurn(turn)}>
              <BookOpen size={14} strokeWidth={1.75} aria-hidden="true" />
              {t('read.action')}
            </button>
          ) : null}

          {turn.readStatus === 'loading' ? (
            <p className={styles.readLoading}>{t('read.loading')}</p>
          ) : null}

          {turn.readStatus === 'error' ? (
            <button type="button" className={styles.readButton} onClick={() => readTurn(turn)}>
              {t('read.retry')}
            </button>
          ) : null}

          {turn.readStatus === 'ready' && turn.read ? <ReadPanel read={turn.read} /> : null}
        </div>
      ) : null}

      {showCitations ? <Citations items={citations} /> : null}
    </article>
  );
}

/**
 * The indicators an ambiguous question could have meant.
 *
 * The service refuses to guess between them, which is right. Each name is sent
 * back **verbatim** as the next message on the same session: the service is
 * holding what it offered, and an altered string will not match it.
 */
function Choices({ facts, onAsk }: { facts: Facts | undefined; onAsk: (question: string) => void }) {
  const { t } = useI18n();
  const choices = factsCandidates(facts);
  if (choices.length === 0) return null;

  return (
    <div className={styles.choices}>
      <h4 className={styles.choicesTitle}>{t('answer.choose')}</h4>
      <ul className={styles.chips}>
        {choices.map((choice) => (
          <li key={choice}>
            <button
              type="button"
              className={styles.chip}
              dir={replyDir(choice)}
              onClick={() => onAsk(choice)}
            >
              <LocalizedText text={choice} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
