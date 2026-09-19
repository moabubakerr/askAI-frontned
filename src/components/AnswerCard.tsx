import { AlertTriangle } from 'lucide-react';
import { ambiguousChoices, isFound, splitSourcesFooter, type ChatResponse } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { Chart } from './Chart/Chart';
import { Citations } from './Citations';
import { FactsPanel } from './FactsPanel';
import styles from './AnswerCard.module.css';

interface Props {
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
export function AnswerCard({ response, onAsk }: Props) {
  const { t } = useI18n();
  const payload = response.facts_payload;
  const found = isFound(payload);

  // The prose already ends with its own `Sources:` footer. It is split off so
  // the citations can be rendered properly below instead of appearing twice.
  const { body, hasFooter } = splitSourcesFooter(response.answer);
  const citations = payload.citations ?? [];
  const showCitations = hasFooter && citations.length > 0;

  const chart = response.chart ?? payload.chart ?? null;

  return (
    <article className={styles.card} data-ok={found ? 'true' : 'false'}>
      {/* The verifier rejected the model's phrasing and fell back to a template.
          The data is still correct; the prose is just blunt. Said quietly. */}
      {!response.verified ? (
        <p className={styles.unverified}>
          <AlertTriangle size={13} strokeWidth={1.75} aria-hidden="true" />
          {t('answer.unverified')}
        </p>
      ) : null}

      <div className={styles.prose}>
        <LocalizedText text={body} />
      </div>

      {found ? <FactsPanel facts={payload.facts} /> : null}

      {/* Not found is a legitimate answer, so it gets no error styling — but an
          ambiguous match names its candidates, and those become one click. */}
      {!found ? <Choices message={payload.message} onAsk={onAsk} /> : null}

      {chart ? <Chart spec={chart} /> : null}

      {showCitations ? <Citations items={citations} /> : null}
    </article>
  );
}

/**
 * "GDP forecast" could match … "GDP", "GDP Growth Demo", "Real GDP".
 *
 * The service refuses to guess between them, which is right. Offering the names
 * back as buttons turns that refusal into a choice rather than a dead end.
 */
function Choices({ message, onAsk }: { message: string; onAsk: (question: string) => void }) {
  const { t } = useI18n();
  const choices = ambiguousChoices(message);
  if (choices.length === 0) return null;

  return (
    <div className={styles.choices}>
      <h4 className={styles.choicesTitle}>{t('answer.choose')}</h4>
      <ul className={styles.chips}>
        {choices.map((choice) => (
          <li key={choice}>
            <button type="button" className={styles.chip} onClick={() => onAsk(choice)}>
              <LocalizedText text={choice} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
