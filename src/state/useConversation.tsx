import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  chat as chatApi,
  endSession as endSessionApi,
  health as healthApi,
  read as readApi,
} from '../api/client';
import type { ChatRequest, ChatResponse, Lang, ReadResponse } from '../api/types';

export interface Turn {
  index: number;
  question: string;
  lang: Lang;
  response: ChatResponse | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** The request timed out rather than failing outright. */
  timedOut: boolean;
  /** The read-it-for-me view of this same question, once asked for. */
  read: ReadResponse | null;
  readStatus: 'idle' | 'loading' | 'ready' | 'error';
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

/** One answer whose wording the numeric verifier rejected. */
export interface VerificationMiss {
  question: string;
  at: string;
}

export interface ConversationStore {
  turns: Turn[];
  /**
   * Answers that came back `verified: false`. Not shown to the reader — the
   * data is correct — but kept so the gap is visible to whoever is looking for
   * it, in the Session panel and in the console.
   */
  verificationMisses: VerificationMiss[];
  busy: boolean;
  /** null until the first health check answers. */
  serviceUp: boolean | null;
  ask: (question: string, lang: Lang) => void;
  retry: (turn: Turn, lang: Lang) => void;
  /** Fetch the read-it-for-me view of a turn's question. */
  readTurn: (turn: Turn) => void;
  /** Ends the conversation here and on the server. */
  reset: () => void;
  focusComposer: () => void;
  sessionId: string;
}

function useConversationStore(): ConversationStore {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [serviceUp, setServiceUp] = useState<boolean | null>(null);
  const [verificationMisses, setVerificationMisses] = useState<VerificationMiss[]>([]);
  const sessionId = useRef<string>(loadSessionId());
  const nextIndex = useRef(0);

  useEffect(() => {
    let live = true;
    healthApi().then((up) => {
      if (live) setServiceUp(up);
    });
    return () => {
      live = false;
    };
  }, []);

  const patchTurn = useCallback((index: number, patch: Partial<Turn>) => {
    setTurns((prev) => prev.map((turn) => (turn.index === index ? { ...turn, ...patch } : turn)));
  }, []);

  const send = useCallback(
    (index: number, question: string) => {
      const request: ChatRequest = { message: question, session_id: sessionId.current };

      chatApi(request).then(
        (response) => {
          if (response.verified === false) {
            // Evidence of a payload that did not carry a number the model
            // wanted. Logged rather than shown: the reader's figure is right.
            console.warn('[askai] answer returned verified:false', { question });
            setVerificationMisses((prev) => [
              ...prev,
              { question, at: new Date().toISOString() },
            ]);
          }
          patchTurn(index, { response, status: 'ready', error: null, timedOut: false });
        },
        (cause: unknown) => {
          const message = cause instanceof Error ? cause.message : String(cause);
          patchTurn(index, { status: 'error', error: message, timedOut: message === 'timeout' });
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
          read: null,
          readStatus: 'idle',
        },
      ]);

      send(index, trimmed);
    },
    [send],
  );

  const retry = useCallback(
    (turn: Turn, lang: Lang) => {
      patchTurn(turn.index, { status: 'loading', error: null, timedOut: false, lang });
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
    verificationMisses,
    busy,
    serviceUp,
    ask,
    retry,
    readTurn,
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
