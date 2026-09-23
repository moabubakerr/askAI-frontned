/**
 * The only door to the data.
 *
 * The API is always same-origin: the client calls `/api/chat` and `/api/health`
 * as relative paths, with no host and no port anywhere in client code. Whatever
 * serves this bundle also proxies `/api/` to the service — nginx in the
 * container, the Vite dev server in development — and strips the prefix, so
 * `/api/chat` arrives at the service as `/chat`.
 *
 * That is what makes the service's missing CORS middleware a non-issue: the
 * browser never makes a cross-origin request, so no preflight is ever sent.
 *
 * Set `VITE_USE_FIXTURES=true` to resolve from the sample fixtures instead.
 */

import {
  resolveFixture,
  resolveReadFixture,
  fixtureSession,
  resolveFeedbackFixture,
} from './fixtures';
import type {
  ChatRequest,
  ChatResponse,
  StreamStage,
  FeedbackRequest,
  FeedbackResponse,
  ReadResponse,
  SessionState,
} from './types';

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === 'true';

/**
 * How long a fixture answer pretends to take, so the loading states are real
 * while developing offline. `VITE_FIXTURE_LATENCY` overrides it — the test
 * suite sets 0, because a wait that makes the dev app feel like the service
 * only makes the suite slow.
 */
const FIXTURE_LATENCY_MS = Number(import.meta.env.VITE_FIXTURE_LATENCY ?? 2500);

/**
 * The first request after a service restart embeds the indicator catalog and
 * takes ~10s; later ones take 2–12s. A short timeout would cut off perfectly
 * good answers, so this is deliberately generous.
 */
const TIMEOUT_MS = 200_000;

export class ChatError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'ChatError';
    this.status = status;
  }
}

export function isFixtureMode(): boolean {
  return USE_FIXTURES;
}

async function post<T>(path: string, req: ChatRequest): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    // A handled request is always 200 — including "no data", which arrives as
    // `ok: false` in the body. Anything else here is a transport or server
    // failure, not an answer.
    if (!res.ok) throw new ChatError(`${res.status} ${res.statusText}`, res.status);

    return (await res.json()) as T;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ChatError('timeout');
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The same answer as `/chat`, preceded by events saying where the work has got
 * to.
 *
 * Streaming is the same URL as `/chat`, opted into with an `Accept` header: without
 * it the service returns the JSON body as before, so falling back costs nothing.
 *
 * Three things shape this. It is a POST with a body, so `EventSource` cannot be
 * used and the frames are read and parsed here. The answer text is **not**
 * streamed token by token and will not be — figures are checked against the
 * source data only once the whole answer exists, so nothing can be shown before
 * that without risking showing a number and then withdrawing it. And because a
 * stream commits to HTTP 200 before the work starts, a failure arrives as an
 * `error` event rather than a status code: a stream that ends with neither an
 * answer nor an error is a failure too, not an empty success.
 */
export async function chatStream(
  req: ChatRequest,
  onStage: (stage: StreamStage) => void,
): Promise<ChatResponse> {
  if (USE_FIXTURES) return streamFixture(req, onStage);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('/api/chat', streamInit(req, controller.signal));
    if (!res.ok) throw new ChatError(`${res.status} ${res.statusText}`, res.status);
    return await readEventStream(res, onStage);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ChatError('timeout');
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The same request as `/chat`, with the header that opts into the stream.
 * Without it the service answers with the JSON body exactly as before, so
 * falling back is a matter of dropping one header.
 */
export function streamInit(req: ChatRequest, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(req),
    ...(signal ? { signal } : {}),
  };
}

/**
 * Read the frames until the answer arrives.
 *
 * Separate from the request so it can be exercised on its own: the failure
 * paths are the interesting part, and a stream commits to HTTP 200 before the
 * work starts, so nothing can be learned from a status code afterwards.
 */
export async function readEventStream(
  res: Response,
  onStage: (stage: StreamStage) => void,
): Promise<ChatResponse> {
  if (!res.body) throw new ChatError('no stream');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer: ChatResponse | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Frames are separated by a blank line; a partial one waits in the buffer
    // until the rest of it arrives.
    let split = buffer.indexOf(FRAME_END);
    while (split !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + FRAME_END.length);

      const parsed = parseFrame(frame);
      if (parsed) {
        if (parsed.event === 'error') {
          throw new ChatError(
            typeof parsed.data['message'] === 'string'
              ? (parsed.data['message'] as string)
              : 'stream failed',
          );
        }
        if (parsed.event === 'answer') answer = parsed.data as unknown as ChatResponse;
        if (parsed.event === 'stage') onStage(parsed.data as StreamStage);
      }

      split = buffer.indexOf(FRAME_END);
    }
  }

  // Ended having said nothing: a failure, not an empty success.
  if (!answer) throw new ChatError('stream ended without an answer');
  return answer;
}

/** A blank line ends a frame. */
const FRAME_END = '\n\n';

/** One SSE frame: `event:` and `data:` lines, with a trailing CR tolerated. */
function parseFrame(frame: string): { event: string; data: Record<string, unknown> } | null {
  let event = 'message';
  const data: string[] = [];

  for (const raw of frame.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.startsWith(':')) continue; // a comment, often a keep-alive
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }

  if (data.length === 0) return null;
  try {
    return { event, data: JSON.parse(data.join('\n')) as Record<string, unknown> };
  } catch {
    return null;
  }
}

/** The fixtures walk the same stages so the caption is exercised offline. */
async function streamFixture(
  req: ChatRequest,
  onStage: (stage: StreamStage) => void,
): Promise<ChatResponse> {
  const answer = resolveFixture(req);
  const stages: StreamStage[] = [
    { stage: 'understanding' },
    { stage: 'resolved', indicator: 'Real GDP' },
    { stage: 'retrieving', indicator: 'Real GDP' },
    { stage: 'composing' },
  ];

  for (const stage of stages) {
    onStage(stage);
    await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS / stages.length));
  }

  return answer;
}

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  if (USE_FIXTURES) {
    await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS));
    return resolveFixture(req);
  }
  return post<ChatResponse>('/api/chat', req);
}

/** The read-it-for-me view of the same question. Same request shape. */
export async function read(req: ChatRequest): Promise<ReadResponse> {
  if (USE_FIXTURES) {
    await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS));
    return resolveReadFixture(req);
  }
  return post<ReadResponse>('/api/read', req);
}

/**
 * Ends the server-side conversation.
 *
 * Without this, a reused session id carries the previous indicator into an
 * unrelated topic — the reader asks about something new and silently gets the
 * old subject back.
 */
export async function endSession(sessionId: string): Promise<void> {
  if (USE_FIXTURES) return;

  try {
    await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  } catch {
    // A session the server never had, or a network blip. The client has already
    // moved to a new id either way, so there is nothing to recover.
  }
}

/** What the server remembers for a session. For the debug panel. */
export async function getSession(sessionId: string): Promise<SessionState | null> {
  if (USE_FIXTURES) return fixtureSession(sessionId);

  try {
    const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    return (await res.json()) as SessionState;
  } catch {
    return null;
  }
}

/**
 * A rating the reader gave an answer.
 *
 * `comment_required: true` on a rejection means the score was fine and the
 * comment was missing — a different repair from a rating that was itself
 * invalid, so the two are told apart here rather than merged into one error.
 */
export class FeedbackRejected extends ChatError {
  readonly commentRequired: boolean;

  constructor(message: string, commentRequired: boolean) {
    super(message, 422);
    this.name = 'FeedbackRejected';
    this.commentRequired = commentRequired;
  }
}

export async function sendFeedback(req: FeedbackRequest): Promise<FeedbackResponse> {
  if (USE_FIXTURES) {
    await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS));
    return resolveFeedbackFixture(req);
  }

  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (res.status === 422) {
    // `detail.message` is written for a reader, so it is shown verbatim rather
    // than replaced with wording invented here.
    const body = (await res.json().catch(() => null)) as
      | { detail?: { message?: string; comment_required?: boolean } }
      | null;
    throw new FeedbackRejected(
      body?.detail?.message ?? 'rejected',
      body?.detail?.comment_required === true,
    );
  }

  if (!res.ok) throw new ChatError(`${res.status} ${res.statusText}`, res.status);
  return (await res.json()) as FeedbackResponse;
}

/**
 * `GET /health` answers as soon as the process is up. It does **not** prove the
 * database or the models are reachable, so it is reported as "the service is
 * responding" and never as "the data is fine".
 */
export async function health(): Promise<boolean> {
  if (USE_FIXTURES) return true;

  try {
    const res = await fetch('/api/health');
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === 'ok';
  } catch {
    return false;
  }
}
