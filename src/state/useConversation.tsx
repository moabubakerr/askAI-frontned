import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { chat as chatApi, health as healthApi } from '../api/client';
import type { ChatRequest, ChatResponse, Lang } from '../api/types';

export interface Turn {
  index: number;
  question: string;
  lang: Lang;
  response: ChatResponse | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** The request timed out rather than failing outright. */
  timedOut: boolean;
}

/**
 * Follow-ups ("and last year?") resolve against server-side state keyed on the
 * session id, so it must be a real per-user value rather than the service's
 * "default" — which would put every reader in one conversation.
 *
 * That state is an in-memory dict on a single process: it is lost on restart
 * and nothing durable may depend on it. The id lives in sessionStorage so a
 * refresh keeps the thread and a new tab starts its own.
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

/** How many prior turns go in `conversation_context`. */
const CONTEXT_TURNS = 4;

export interface ConversationStore {
  turns: Turn[];
  busy: boolean;
  /** null until the first health check answers. */
  serviceUp: boolean | null;
  ask: (question: string, lang: Lang) => void;
  retry: (turn: Turn, lang: Lang) => void;
  reset: () => void;
  focusComposer: () => void;
}

function useConversationStore(): ConversationStore {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [serviceUp, setServiceUp] = useState<boolean | null>(null);
  const sessionId = useRef<string>(loadSessionId());
  const nextIndex = useRef(0);
  const history = useRef<{ question: string; answer: string }[]>([]);

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

  /** Prior turns as plain text. The service uses it only to spot a follow-up. */
  const contextText = useCallback(
    () =>
      history.current
        .slice(-CONTEXT_TURNS)
        .map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`)
        .join('\n\n'),
    [],
  );

  const send = useCallback(
    (index: number, question: string) => {
      const request: ChatRequest = {
        message: question,
        session_id: sessionId.current,
        conversation_context: contextText(),
      };

      chatApi(request).then(
        (response) => {
          history.current.push({ question, answer: response.answer });
          patchTurn(index, { response, status: 'ready', error: null, timedOut: false });
        },
        (cause: unknown) => {
          const message = cause instanceof Error ? cause.message : String(cause);
          patchTurn(index, { status: 'error', error: message, timedOut: message === 'timeout' });
        },
      );
    },
    [contextText, patchTurn],
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

  /** A new question is a new thread, so the service's state starts clean too. */
  const reset = useCallback(() => {
    const created = newSessionId();
    sessionId.current = created;
    try {
      sessionStorage.setItem(SESSION_KEY, created);
    } catch {
      // Nothing to do: the id is still used for this page's lifetime.
    }
    history.current = [];
    nextIndex.current = 0;
    setTurns([]);
  }, []);

  const focusComposer = useCallback(() => {
    const input = document.getElementById('composer-input');
    if (input instanceof HTMLInputElement) input.focus();
  }, []);

  const busy = turns.some((turn) => turn.status === 'loading');

  return { turns, busy, serviceUp, ask, retry, reset, focusComposer };
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
