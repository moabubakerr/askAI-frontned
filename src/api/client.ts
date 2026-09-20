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

import { resolveFixture, resolveReadFixture, fixtureSession } from './fixtures';
import type { ChatRequest, ChatResponse, ReadResponse, SessionState } from './types';

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === 'true';

const FIXTURE_LATENCY_MS = 2500;

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
