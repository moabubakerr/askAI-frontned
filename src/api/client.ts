/**
 * The only door to the data.
 *
 * The API is always same-origin: `/api/ask` and `/api/health`, relative, with
 * no host and no port anywhere in client code. In production the server that
 * ships this bundle also proxies `/api` to the service; in development the Vite
 * dev server proxies it the same way. That is what keeps the browser from ever
 * making a cross-origin request, so CORS never arises.
 *
 * Set `VITE_USE_FIXTURES=true` to resolve from the sample fixtures instead,
 * after a short delay so loading states are real. Nothing outside this
 * directory knows which mode is active.
 */

import { resolveFixture, fixtureFreshness } from './fixtures';
import {
  WIRE_REQUEST_KEYS,
  type AskRequest,
  type AskResponse,
  type HealthResponse,
} from './types';

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === 'true';

const FIXTURE_LATENCY_MS = 400;

export class AskError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'AskError';
    this.status = status;
  }
}

/**
 * 422 has no `packages` key: the request itself was rejected. It is a separate
 * failure from a refusal, which is a complete, well-formed answer.
 */
export class AskRejectedError extends AskError {
  readonly detail: string;

  constructor(detail: string) {
    super(detail, 422);
    this.name = 'AskRejectedError';
    this.detail = detail;
  }
}

export function isFixtureMode(): boolean {
  return USE_FIXTURES;
}

/**
 * `X-Caller-Id` is deliberately absent. Caller identity is asserted by the
 * proxy in front of the service, server-side: a client that can set it can
 * forge it, so the browser never gets to.
 */
function headers(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

/** Client-side extensions never reach the service, which would reject them. */
function wireBody(req: AskRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of WIRE_REQUEST_KEYS) {
    const value = req[key];
    // conversation_id is omitted rather than sent null on a first question.
    if (key === 'conversation_id' && value === null) continue;
    body[key] = value;
  }
  return body;
}

/** 422 bodies carry a `detail`, which may be FastAPI's array-of-errors form. */
async function rejection(res: Response): Promise<AskRejectedError> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    const detail = body.detail;
    if (typeof detail === 'string') return new AskRejectedError(detail);
    if (Array.isArray(detail)) {
      const lines = detail
        .map((item) => {
          const entry = item as { loc?: unknown[]; msg?: string };
          const where = Array.isArray(entry.loc) ? entry.loc.join('.') : '';
          return where ? `${where}: ${entry.msg ?? ''}` : (entry.msg ?? '');
        })
        .filter(Boolean);
      if (lines.length > 0) return new AskRejectedError(lines.join('; '));
    }
  } catch {
    // Fall through to the status line.
  }
  return new AskRejectedError(`${res.status} ${res.statusText}`);
}

export async function ask(req: AskRequest): Promise<AskResponse> {
  if (USE_FIXTURES) {
    await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS));
    return resolveFixture(req);
  }

  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(wireBody(req)),
  });

  // Checked before `packages` is read: a rejected request has no packages key.
  if (res.status === 422) throw await rejection(res);
  if (!res.ok) throw new AskError(`${res.status} ${res.statusText}`, res.status);

  return (await res.json()) as AskResponse;
}

/** The same freshness block an answer carries, without asking a question. */
export async function health(): Promise<HealthResponse> {
  if (USE_FIXTURES) {
    await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS));
    return { freshness: fixtureFreshness() };
  }

  const res = await fetch('/api/health', { headers: headers() });
  if (!res.ok) throw new AskError(`${res.status} ${res.statusText}`, res.status);
  return (await res.json()) as HealthResponse;
}
