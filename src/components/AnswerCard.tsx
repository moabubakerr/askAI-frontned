import { useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
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
import { Feedback } from './Feedback';
import { Loader } from './Loader';
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
  const { readTurn, lens } = useConversation();
  // Opening the retelling should be reversible: it is long, and a reader who
  // has finished with it should be able to put it away without losing it.
  const [readOpen, setReadOpen] = useState(true);
  // Executive is the answer and its figures; Explore adds the chart behind them
  // and the sources under them. Both are the same response — switching costs no
  // round trip, and nothing that changes the meaning of a figure is ever hidden.
  const explore = lens === 'explore';

  const payload = response.facts_payload;
  const found = isFound(payload);

  // The approximate-match warning comes off first, because it can sit *after*
  // the `Sources:` footer — splitting the footer first would take the warning
  // with it. Then the footer, so the citations render once, properly.
  const { body: withoutWarning, warning } = splitApproximateMatch(response.answer);
  const { body, hasFooter } = splitSourcesFooter(withoutWarning);

  const kind = found ? factsKind(payload.facts) : 'unknown';

  const citations = payload.citations ?? [];
  // For a catalogue listing the citations *are* the indicators — one per name —
  // so the sources block would print the same list a second time. The names are
  // the provenance; there is nothing else to attribute.
  const showCitations = hasFooter && citations.length > 0 && kind !== 'count';
  const chart = response.chart ?? payload.chart ?? null;

  const indicator = found ? factsIndicator(payload.facts) : null;

  // `note` is a caveat on the figures — but a greeting arrives as a facts
  // object holding *only* a note ("Greeting — no data needed."), which is the
  // service talking to itself. A note with no data beside it is not a caveat.
  const note = found && kind !== 'none' ? factsNote(payload.facts) : null;

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

      {/* `verified: false` is deliberately NOT shown to the reader. It means the
          numeric verifier rejected the model's wording and the service
          substituted a deterministic template — the data is correct either way,
          which is the point of the mechanism. Saying an answer was "replaced"
          only invites doubt about a figure that is right.

          It is not swallowed either: every occurrence is a payload that did not
          carry a number the model wanted, which is a backend gap worth closing.
          The store logs it and the Session panel counts it. */}

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

      {found ? <FactsPanel facts={payload.facts} hasChart={chart !== null} /> : null}

      {/* Not found is a legitimate answer, so it gets no error styling — but an
          ambiguous match carries its candidates, and those become one click. */}
      {!found ? <Choices facts={payload.facts} onAsk={onAsk} /> : null}

      {chart && explore ? <Chart spec={chart} /> : null}

      {/* The service decides what is readable — true only when the answer holds
          an actual reading. Never inferred from the shape of the answer. */}
      {/* One control, always visible, that says what it does and shows whether
          it is open — the same disclosure as Sources. A dismiss that only
          appeared on hover was a way out that most readers never found. */}
      {response.readable === true ? (
        <div className={styles.readBlock}>
          <button
            type="button"
            className={styles.readTrigger}
            aria-expanded={turn.readStatus === 'ready' ? readOpen : false}
            onClick={() => {
              if (turn.readStatus === 'ready') {
                setReadOpen((open) => !open);
                return;
              }
              setReadOpen(true);
              readTurn(turn);
            }}
          >
            <ChevronRight
              size={13}
              strokeWidth={2}
              aria-hidden="true"
              className={
                turn.readStatus === 'ready' && readOpen
                  ? `${styles.chevron} ${styles.chevronOpen}`
                  : styles.chevron
              }
            />
            {turn.readStatus === 'error' ? t('read.retry') : t('read.action')}
          </button>

          {turn.readStatus === 'loading' ? (
            <Loader label={t('read.loading')} size="small" />
          ) : null}

          {/* Already fetched, so closing and reopening costs nothing. */}
          {turn.readStatus === 'ready' && turn.read && readOpen ? (
            <ReadPanel read={turn.read} />
          ) : null}
        </div>
      ) : null}

      {showCitations && explore ? <Citations items={citations} /> : null}

      {/* Independent of `readable`: a refusal or a greeting is often the answer
          most worth flagging. */}
      {response.message_id ? <Feedback turn={turn} /> : null}
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
