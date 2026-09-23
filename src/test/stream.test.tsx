import { describe, expect, it } from 'vitest';
import { readEventStream, streamInit, ChatError } from '../api/client';
import type { StreamStage } from '../api/types';

/**
 * The SSE reader, exercised on its own.
 *
 * Streaming is the same URL as `/chat`, opted into with an `Accept` header, and
 * the answer still arrives in one piece at the end — only the stages are
 * incremental. The failure paths matter as much as the happy one: a stream
 * commits to HTTP 200 before the work starts, so nothing can be learned from a
 * status code afterwards.
 */
function streamOf(...frames: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });

  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const ANSWER = {
  message_id: 'm1',
  answer: 'Real GDP was 185.17 Bn QAR in 2025-Q4.',
  facts_payload: { ok: true, facts: {}, citations: [] },
  chart: null,
  verified: true,
  readable: true,
};

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe('the answer stream', () => {
  it('opts in with a header rather than a different endpoint', () => {
    const init = streamInit({ message: 'x', session_id: 's1' });

    // Same URL, same body: dropping this header is the whole fallback.
    expect((init.headers as Record<string, string>)['Accept']).toBe('text/event-stream');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ message: 'x', session_id: 's1' });
  });

  it('reports the stages and returns the answer', async () => {
    const stages: StreamStage[] = [];
    const answer = await readEventStream(
      streamOf(frame('stage', { stage: 'understanding' }), frame('answer', ANSWER)),
      (s) => stages.push(s),
    );

    expect(stages.map((s) => s.stage)).toEqual(['understanding']);
    expect(answer.answer).toContain('185.17');
  });

  it('carries the indicator, which is the point of streaming at all', async () => {
    const stages: StreamStage[] = [];
    await readEventStream(
      streamOf(
        frame('stage', { stage: 'resolved', indicator: 'Real GDP' }),
        frame('stage', { stage: 'retrieving', indicator: 'Real GDP' }),
        frame('answer', ANSWER),
      ),
      (s) => stages.push(s),
    );

    // Naming the match before the answer lands is what makes a wrong match
    // obvious immediately, rather than after reading the wrong answer.
    expect(stages[0]?.indicator).toBe('Real GDP');
    expect(stages[1]?.stage).toBe('retrieving');
  });

  it('reads a frame that arrives split across chunks', async () => {
    const stages: StreamStage[] = [];
    await readEventStream(
      streamOf('event: stage\ndata: {"stage": "com', 'posing"}\n\n', frame('answer', ANSWER)),
      (s) => stages.push(s),
    );

    expect(stages.map((s) => s.stage)).toEqual(['composing']);
  });

  it('treats an error event as the failure it is', async () => {
    await expect(
      readEventStream(
        streamOf(
          frame('stage', { stage: 'understanding' }),
          frame('error', { message: 'upstream down' }),
        ),
        () => {},
      ),
    ).rejects.toThrow('upstream down');
  });

  it('treats a stream that ends saying nothing as a failure, not an empty answer', async () => {
    await expect(
      readEventStream(streamOf(frame('stage', { stage: 'understanding' })), () => {}),
    ).rejects.toBeInstanceOf(ChatError);
  });

  it('ignores keep-alive comments', async () => {
    const answer = await readEventStream(streamOf(': keep-alive\n\n', frame('answer', ANSWER)), () => {});
    expect(answer.message_id).toBe('m1');
  });
});
