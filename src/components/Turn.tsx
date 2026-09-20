import { formatNumber } from '../i18n/formatNumber';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import { useConversation, type Turn as TurnModel } from '../state/useConversation';
import { AnswerCard } from './AnswerCard';
import { Loader } from './Loader';
import styles from './Turn.module.css';

export function Turn({ turn }: { turn: TurnModel }) {
  const { t, lang } = useI18n();
  const { ask, retry } = useConversation();

  return (
    <section className={styles.turn} aria-labelledby={`turn-${turn.index}-question`}>
      {/* The reader's own words, on their side of the conversation. */}
      <h2 className={styles.question} id={`turn-${turn.index}-question`}>
        <span className="visually-hidden">
          {t('turn.number', { n: formatNumber(turn.index + 1, lang) })}
        </span>
        <LocalizedText text={turn.question} />
      </h2>

      {/* There is no streaming: one JSON response, 2–12s, and ~10s on the first
          request after a restart while the catalog is embedded. So the waiting
          state has to be patient rather than apologetic. */}
      <div className={styles.answer}>
        {turn.status === 'loading' ? <Loader label={t('turn.loading')} /> : null}

        {turn.status === 'error' ? (
          <div className={styles.failure}>
            <p>
              {turn.timedOut ? t('turn.timeout') : t('turn.error', { message: turn.error ?? '' })}
            </p>
            <button type="button" className={styles.retry} onClick={() => retry(turn, lang)}>
              {t('turn.retry')}
            </button>
          </div>
        ) : null}

        {/* What answered, named before the answer rather than inside it: the
            reader knows where the figures came from before reading them. */}
        {turn.status === 'ready' && turn.response ? (
          <span className={styles.source}>{t('source.name')}</span>
        ) : null}

        {turn.status === 'ready' && turn.response ? (
          <AnswerCard
            turn={turn}
            response={turn.response}
            onAsk={(question) => ask(question, lang)}
          />
        ) : null}
      </div>
    </section>
  );
}
