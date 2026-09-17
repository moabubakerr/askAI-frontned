import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ask as askApi, health as healthApi, AskRejectedError } from '../api/client';
import type {
  AskRequest,
  AskResponse,
  Candidate,
  Freshness,
  Inheritance,
  Lang,
  SourceSel,
} from '../api/types';

export type Lens = 'explore' | 'executive';
export type SourceChoice = 'approved' | 'external' | 'combined';

export const SOURCE_SELECTION: Record<SourceChoice, SourceSel[]> = {
  approved: ['approved'],
  external: ['external'],
  combined: ['approved', 'external'],
};

export interface Turn {
  index: number;
  question: string;
  lang: Lang;
  source: SourceChoice;
  request: AskRequest;
  response: AskResponse | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** 422: the request itself was rejected, so there are no packages at all. */
  rejected: boolean;
  inherited: Inheritance | null;
  /** Set when the reader picked a candidate to complete this same question. */
  resolvedWith: string | null;
}

/** UI state that must survive re-render, keyed by turn index then package index. */
interface TurnUi {
  evidenceOpen: Record<number, boolean>;
  chartView: Record<number, string>;
}

export interface ConversationStore {
  turns: Turn[];
  lens: Lens;
  setLens: (lens: Lens) => void;
  source: SourceChoice;
  setSource: (source: SourceChoice) => void;
  /**
   * Freshness of the most recent completed response, or of `GET /api/health`
   * before the first question.
   */
  freshness: Freshness | null;
  busy: boolean;
  ask: (question: string, lang: Lang) => void;
  /** Puts the cursor in the composer, for a clarification's follow-up. */
  focusComposer: () => void;
  resolveCandidate: (turn: Turn, candidate: Candidate, lang: Lang) => void;
  disambiguate: (turn: Turn, lang: Lang) => void;
  reset: () => void;
  isEvidenceOpen: (turnIndex: number, pkgIndex: number) => boolean;
  toggleEvidence: (turnIndex: number, pkgIndex: number) => void;
  chartView: (turnIndex: number, pkgIndex: number, fallback: string) => string;
  setChartView: (turnIndex: number, pkgIndex: number, view: string) => void;
}

const EMPTY_UI: TurnUi = { evidenceOpen: {}, chartView: {} };

function useConversationStore(): ConversationStore {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [lens, setLens] = useState<Lens>('explore');
  const [source, setSource] = useState<SourceChoice>('approved');
  const [ui, setUi] = useState<Record<number, TurnUi>>({});
  const [health, setHealth] = useState<Freshness | null>(null);
  const conversationId = useRef<string | null>(null);
  const nextIndex = useRef(0);

  /**
   * `GET /api/health` returns the same freshness block an answer carries, so
   * staleness is on screen before the first question rather than after it.
   */
  useEffect(() => {
    let live = true;
    healthApi().then(
      (res) => {
        if (live) setHealth(res.freshness);
      },
      () => {
        // A health check that fails says nothing about the data; the chip stays
        // absent until an answer reports its own freshness.
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const patchTurn = useCallback((index: number, patch: Partial<Turn>) => {
    setTurns((prev) => prev.map((turn) => (turn.index === index ? { ...turn, ...patch } : turn)));
  }, []);

  const send = useCallback(
    (index: number, request: AskRequest) => {
      askApi(request).then(
        (response) => {
          conversationId.current = response.conversation_id;
          patchTurn(index, {
            response,
            status: 'ready',
            error: null,
            rejected: false,
            inherited: response.inherited ?? null,
          });
        },
        (cause: unknown) => {
          patchTurn(index, {
            status: 'error',
            error: cause instanceof Error ? cause.message : String(cause),
            rejected: cause instanceof AskRejectedError,
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

      const request: AskRequest = {
        question: trimmed,
        lang,
        sources: SOURCE_SELECTION[source],
        conversation_id: conversationId.current,
        resolve_detail_id: null,
      };

      const turn: Turn = {
        index,
        question: trimmed,
        lang,
        source,
        request,
        response: null,
        status: 'loading',
        error: null,
        rejected: false,
        inherited: null,
        resolvedWith: null,
      };

      setTurns((prev) => [...prev, turn]);
      send(index, request);
    },
    [send, source],
  );

  /**
   * Picking a candidate completes the original question. It replaces this
   * turn's packages — it does not append a new question the reader never asked.
   */
  const resolveCandidate = useCallback(
    (turn: Turn, candidate: Candidate, lang: Lang) => {
      const request: AskRequest = {
        ...turn.request,
        lang,
        conversation_id: conversationId.current,
        resolve_detail_id: candidate.detail_id,
      };

      patchTurn(turn.index, {
        request,
        status: 'loading',
        error: null,
        rejected: false,
        resolvedWith: candidate.name,
      });
      send(turn.index, request);
    },
    [patchTurn, send],
  );

  /** A wrong inheritance must be recoverable in one control, not retyped. */
  const disambiguate = useCallback(
    (turn: Turn, lang: Lang) => {
      const request: AskRequest = {
        ...turn.request,
        lang,
        conversation_id: conversationId.current,
        resolve_detail_id: null,
        disambiguate: true,
      };

      patchTurn(turn.index, {
        request,
        status: 'loading',
        error: null,
        rejected: false,
        resolvedWith: null,
        inherited: null,
      });
      send(turn.index, request);
    },
    [patchTurn, send],
  );

  const reset = useCallback(() => {
    conversationId.current = null;
    nextIndex.current = 0;
    setTurns([]);
    setUi({});
  }, []);

  const isEvidenceOpen = useCallback(
    (turnIndex: number, pkgIndex: number) => ui[turnIndex]?.evidenceOpen[pkgIndex] ?? false,
    [ui],
  );

  const toggleEvidence = useCallback((turnIndex: number, pkgIndex: number) => {
    setUi((prev) => {
      const current = prev[turnIndex] ?? EMPTY_UI;
      return {
        ...prev,
        [turnIndex]: {
          ...current,
          evidenceOpen: {
            ...current.evidenceOpen,
            [pkgIndex]: !(current.evidenceOpen[pkgIndex] ?? false),
          },
        },
      };
    });
  }, []);

  const chartView = useCallback(
    (turnIndex: number, pkgIndex: number, fallback: string) =>
      ui[turnIndex]?.chartView[pkgIndex] ?? fallback,
    [ui],
  );

  const setChartView = useCallback((turnIndex: number, pkgIndex: number, view: string) => {
    setUi((prev) => {
      const current = prev[turnIndex] ?? EMPTY_UI;
      return {
        ...prev,
        [turnIndex]: { ...current, chartView: { ...current.chartView, [pkgIndex]: view } },
      };
    });
  }, []);

  /** A conversation continues on the same thread, so the composer is the reply box. */
  const focusComposer = useCallback(() => {
    const input = document.getElementById('composer-input');
    if (input instanceof HTMLInputElement) input.focus();
  }, []);

  const freshness = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const response = turns[i]?.response;
      if (response) return response.freshness;
    }
    return health;
  }, [turns, health]);

  const busy = turns.some((turn) => turn.status === 'loading');

  return {
    turns,
    lens,
    setLens,
    source,
    setSource,
    freshness,
    busy,
    ask,
    focusComposer,
    resolveCandidate,
    disambiguate,
    reset,
    isEvidenceOpen,
    toggleEvidence,
    chartView,
    setChartView,
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
