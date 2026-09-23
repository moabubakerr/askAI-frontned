import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import {
  chatStream as chatStreamApi,
  endSession as endSessionApi,
  read as readApi,
  sendFeedback as sendFeedbackApi,
} from '../api/client';
import type { ChatRequest, ChatResponse, Lang, ReadResponse, StreamStage } from '../api/types';

/**
 * A rating, once given, is not taken back.
 *
 * `/feedback` is append-only by design — there is no update or delete — so
 * letting a reader change their mind would post a second row and leave the
 * dashboard holding both. The control retires itself instead.
 */
export interface FeedbackState {
  status: 'idle' | 'sending' | 'sent' | 'rejected' | 'failed';
  /** The score the reader chose, kept across a rejection. */
  rating: number | null;
  /** The service's own wording, shown verbatim. */
  message: string | null;
  /** The score was fine and the comment was missing. A different repair. */
  commentRequired: boolean;
}

const NO_FEEDBACK: FeedbackState = {
  status: 'idle',
  rating: null,
  message: null,
  commentRequired: false,
};

export interface Turn {
  index: number;
  question: string;
  lang: Lang;
  response: ChatResponse | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** The request timed out rather than failing outright. */
  timedOut: boolean;
  /**
   * Where the work has got to, while it is running.
   *
   * Not every stage fires for every question — a greeting or a refusal skips
   * most of them — so this is a caption on an indeterminate wait, never a
   * step counter.
   */
  stage: StreamStage | null;
  /**
   * The answer as it is released, before the final one lands.
   *
   * Fragments arrive at complete paragraph or sentence boundaries, never
   * mid-`**`, so this is always valid Markdown and is re-rendered as it stands.
   * It is provisional: the `answer` event is authoritative, and a `replace`
   * empties this because everything drawn so far turned out to be wrong.
   */
  streamedText: string;
  /** The read-it-for-me view of this same question, once asked for. */
  read: ReadResponse | null;
  readStatus: 'idle' | 'loading' | 'ready' | 'error';
  feedback: FeedbackState;
}

/**
 * The server holds the transcript now, keyed on this id, so the id *is* the
 * conversation: follow-ups like "and for Saudi Arabia?" inherit the previous
 * indicator and period from it. It must be stable per reader, and must not be
 * the service's "default" — that is one shared conversation for everybody.
 *
 * It lives in sessionStorage so a refresh keeps the thread and a new tab starts
 * its own.
 */
const SESSION_KEY = 'askai.session_id';

function newSessionId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function loadSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = newSessionId();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Private mode, blocked storage: the id still works, it just does not
    // survive a refresh.
    return newSessionId();
  }
}

/**
 * How much of an answer is on screen.
 *
 * Executive is the answer and its figures; Explore adds the chart and the
 * sources behind them. It changes what is shown, never what was asked: the
 * request and the response are identical either way, so switching costs no
 * round trip.
 */
export type Lens = 'executive' | 'explore';

export interface ConversationStore {
  turns: Turn[];
  lens: Lens;
  setLens: (lens: Lens) => void;
  busy: boolean;
  ask: (question: string, lang: Lang) => void;
  retry: (turn: Turn, lang: Lang) => void;
  /** Fetch the read-it-for-me view of a turn's question. */
  readTurn: (turn: Turn) => void;
  /** Rate an answer. A comment is required at 1 or 2. */
  rate: (turn: Turn, rating: number, comment?: string) => void;
  /** Ends the conversation here and on the server. */
  reset: () => void;
  focusComposer: () => void;
  sessionId: string;
}

function useConversationStore(): ConversationStore {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [lens, setLens] = useState<Lens>('explore');
  const sessionId = useRef<string>(loadSessionId());
  const nextIndex = useRef(0);

  const patchTurn = useCallback((index: number, patch: Partial<Turn>) => {
    setTurns((prev) => prev.map((turn) => (turn.index === index ? { ...turn, ...patch } : turn)));
  }, []);

  const send = useCallback(
    (index: number, question: string) => {
      const request: ChatRequest = { message: question, session_id: sessionId.current };

      chatStreamApi(
        request,
        (stage) => patchTurn(index, { stage }),
        (streamedText) => patchTurn(index, { streamedText }),
      ).then(
        (response) => {
          if (response.verified === false) {
            // Evidence of a payload that did not carry a number the model
            // wanted — a backend gap worth closing. Logged rather than shown:
            // the reader's figure is correct either way, and saying an answer
            // was "replaced" would only invite doubt about it.
            console.warn('[askai] answer returned verified:false', { question });
          }
          // The final text wins over whatever the fragments built.
          patchTurn(index, {
            response,
            status: 'ready',
            error: null,
            timedOut: false,
            stage: null,
            streamedText: '',
          });
        },
        (cause: unknown) => {
          const message = cause instanceof Error ? cause.message : String(cause);
          patchTurn(index, {
            status: 'error',
            error: message,
            timedOut: message === 'timeout',
            stage: null,
          });
        },
      );
    },
    [patchTurn],
  );

  const ask = useCallback(
    (question: string, lang: Lang) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const index = nextIndex.current;
      nextIndex.current += 1;

      setTurns((prev) => [
        ...prev,
        {
          index,
          question: trimmed,
          lang,
          response: null,
          status: 'loading',
          error: null,
          timedOut: false,
          stage: null,
          streamedText: '',
          read: null,
          readStatus: 'idle',
          feedback: NO_FEEDBACK,
        },
      ]);

      send(index, trimmed);
    },
    [send],
  );

  const retry = useCallback(
    (turn: Turn, lang: Lang) => {
      patchTurn(turn.index, {
        status: 'loading',
        error: null,
        timedOut: false,
        stage: null,
        streamedText: '',
        lang,
      });
      send(turn.index, turn.question);
    },
    [patchTurn, send],
  );

  const readTurn = useCallback(
    (turn: Turn) => {
      if (turn.readStatus === 'loading' || turn.readStatus === 'ready') return;
      patchTurn(turn.index, { readStatus: 'loading' });

      readApi({ message: turn.question, session_id: sessionId.current }).then(
        (response) => patchTurn(turn.index, { read: response, readStatus: 'ready' }),
        () => patchTurn(turn.index, { readStatus: 'error' }),
      );
    },
    [patchTurn],
  );

  const rate = useCallback(
    (turn: Turn, rating: number, comment?: string) => {
      const messageId = turn.response?.message_id;
      if (!messageId || turn.feedback.status === 'sending' || turn.feedback.status === 'sent') {
        return;
      }

      patchTurn(turn.index, {
        feedback: { status: 'sending', rating, message: null, commentRequired: false },
      });

      sendFeedbackApi({
        message_id: messageId,
        rating,
        ...(comment?.trim() ? { comment: comment.trim() } : {}),
        // The same id the question went out on, so the server can store the
        // exchange beside the rating.
        session_id: sessionId.current,
      }).then(
        () =>
          patchTurn(turn.index, {
            feedback: { status: 'sent', rating, message: null, commentRequired: false },
          }),
        (cause: unknown) => {
          const rejection = cause as { message?: string; commentRequired?: boolean };
          const commentRequired = rejection?.commentRequired === true;
          patchTurn(turn.index, {
            feedback: {
              // A missing comment is not a failure to retry: the score stands
              // and the reader is asked for the reason.
              status: commentRequired ? 'rejected' : 'failed',
              rating,
              message: rejection?.message ?? null,
              commentRequired,
            },
          });
        },
      );
    },
    [patchTurn],
  );

  /**
   * A new conversation has to be new on the server too. Without the DELETE, the
   * old session keeps its indicator and period, and the next unrelated question
   * silently inherits them.
   */
  const reset = useCallback(() => {
    const previous = sessionId.current;
    const created = newSessionId();
    sessionId.current = created;
    try {
      sessionStorage.setItem(SESSION_KEY, created);
    } catch {
      // Nothing to do: the id is still used for this page's lifetime.
    }
    nextIndex.current = 0;
    setTurns([]);
    void endSessionApi(previous);
  }, []);

  const focusComposer = useCallback(() => {
    const input = document.getElementById('composer-input');
    if (input instanceof HTMLInputElement) input.focus();
  }, []);

  const busy = turns.some((turn) => turn.status === 'loading');

  return {
    turns,
    lens,
    setLens,
    busy,
    ask,
    retry,
    readTurn,
    rate,
    reset,
    focusComposer,
    sessionId: sessionId.current,
  };
}

const ConversationContext = createContext<ConversationStore | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const store = useConversationStore();
  return <ConversationContext.Provider value={store}>{children}</ConversationContext.Provider>;
}

export function useConversation(): ConversationStore {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversation must be used inside ConversationProvider');
  return ctx;
}
