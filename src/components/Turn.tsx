import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { formatNumber } from '../i18n/formatNumber';
import { LocalizedText } from '../i18n/LocalizedText';
import { ProseText } from '../i18n/ProseText';
import type { MsgKey } from '../i18n/en';
import { useI18n } from '../i18n/useI18n';
import { replyDir } from '../api/types';
import { useConversation, type Turn as TurnModel } from '../state/useConversation';
import { AnswerCard } from './AnswerCard';
import { SourcePanels } from './SourcePanels';
import { Loader } from './Loader';
import styles from './Turn.module.css';

/**
 * Not every environment implements it — jsdom does not, and an unguarded call
 * throws inside the effect and takes the answer down with it.
 */
function scrollTo(element: HTMLElement, block: ScrollLogicalPosition) {
  if (typeof element.scrollIntoView !== 'function') return;
  element.scrollIntoView({ behavior: 'smooth', block });
}

/**
 * The stage, in words. An unknown stage name is shown as the service sent it
 * rather than dropped — a new step in the pipeline should read oddly, not
 * vanish.
 */
function stageCaption(
  stage: TurnModel['stage'],
  t: (key: MsgKey, vars?: Record<string, string>) => string,
): string | undefined {
  if (!stage) return undefined;
  if ((stage.stage === 'resolved' || stage.stage === 'retrieving') && stage.indicator) {
    return t('stage.resolvedWith', { indicator: stage.indicator });
  }
  const key = `stage.${stage.stage}` as MsgKey;
  return t(key) === key ? stage.stage : t(key);
}

export function Turn({ turn }: { turn: TurnModel }) {
  const { t, lang } = useI18n();
  const { ask, retry } = useConversation();

  const answerRef = useRef<HTMLDivElement>(null);
  const [jumpVisible, setJumpVisible] = useState(false);

  const ready = turn.status === 'ready';
  const readReady = turn.readStatus === 'ready';

  /**
   * Bring the reader to the answer when it arrives.
   *
   * To its top edge, not the bottom of the page: a reply can carry prose, a tile
   * grid, a chart and a sources list, and landing at the bottom shows the
   * sources while hiding the answer. `scroll-margin` on the container leaves the
   * question partly visible above it, for context.
   *
   * After layout and after a frame, because the chart and the tiles measure
   * themselves — scrolling before that lands in the wrong place.
   *
   * And never against the reader: if they scrolled away while waiting, the
   * answer offers itself rather than seizing the viewport.
   */
  useLayoutEffect(() => {
    if (!ready) return;
    const element = answerRef.current;
    if (!element) return;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        const inView = box.top < window.innerHeight && box.bottom > 0;

        if (!inView) {
          setJumpVisible(true);
          return;
        }

        scrollTo(element, 'start');
        // The viewport is only half of it: scrolling alone leaves a screen
        // reader and the keyboard back at the composer.
        element.focus({ preventScroll: true });
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [ready]);

  /** The retelling replaces a block in place, which otherwise says nothing. */
  useEffect(() => {
    if (!readReady) return;
    const panel = answerRef.current?.querySelector<HTMLElement>('[data-read-panel]');
    if (panel) scrollTo(panel, 'nearest');
  }, [readReady]);

  function jump() {
    setJumpVisible(false);
    const element = answerRef.current;
    if (!element) return;
    scrollTo(element, 'start');
    element.focus({ preventScroll: true });
  }

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
      <div
        className={styles.answer}
        ref={answerRef}
        tabIndex={-1}
        aria-labelledby={`turn-${turn.index}-question`}
      >
        {turn.status === 'loading' && turn.source !== 'scai' ? (
          <div className={styles.waiting}>
            <p className={styles.waitingWho}>
              {t('panel.waiting', {
                source: turn.source === 'combined' ? t('source.combined') : t('source.oxford'),
              })}
            </p>
            {/* No streaming on this endpoint, so the wait is carried by saying
                how long it is rather than by a bar that cannot be honest. */}
            <p className={styles.waitingNote}>{t('panel.waitingNote')}</p>
            <Loader label={t('turn.loading')} />
          </div>
        ) : null}

        {turn.status === 'loading' && turn.source === 'scai' ? (
          <div className={styles.composing}>
            {/* Provisional, and replaced wholesale by the final answer. Shown
                because watching an answer arrive beats watching a spinner. */}
            {turn.streamedText ? (
              <div className={styles.draft} dir={replyDir(turn.streamedText)}>
                <ProseText text={turn.streamedText} />
              </div>
            ) : null}
            <Loader label={t('turn.loading')} caption={stageCaption(turn.stage, t)} />
          </div>
        ) : null}

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
          <span className={styles.source}>{t('source.scai')}</span>
        ) : null}

        {/* Two houses, two panels, never merged. */}
        {turn.status === 'ready' && turn.ask ? (
          <SourcePanels turn={turn} response={turn.ask} />
        ) : null}

        {turn.status === 'ready' && turn.response ? (
          <AnswerCard
            turn={turn}
            response={turn.response}
            onAsk={(question) => ask(question, lang)}
          />
        ) : null}
      </div>

      {jumpVisible ? (
        <button type="button" className={styles.jump} onClick={jump}>
          <ArrowDown size={15} strokeWidth={2} aria-hidden="true" />
          {t('turn.jump')}
        </button>
      ) : null}
    </section>
  );
}
