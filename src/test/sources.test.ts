import { describe, expect, it } from 'vitest';
import { splitSourcesFooter } from '../api/types';

/**
 * The service gives provenance twice on purpose: as prose at the end of
 * `answer`, and as the machine-readable `citations` array. The array is what is
 * rendered, so the prose footer has to come off — reliably, or the reader sees
 * the same sources listed twice.
 */
describe('the sources footer', () => {
  it.each([
    ['plain', 'The latest Real GDP is 185.17.\n\nSources:\n- Real GDP — SCAI'],
    ['italic Markdown', 'The latest Real GDP is 185.17.\n\n*Sources:*\n- Real GDP — SCAI'],
    ['bold Markdown', 'The latest Real GDP is 185.17.\n\n**Sources**\n- Real GDP — SCAI'],
    ['Arabic', 'أحدث قيمة 185.17.\n\nالمصادر:\n- الناتج المحلي — بيانات معتمدة'],
    ['no colon', 'The latest Real GDP is 185.17.\n\nSources\n- Real GDP — SCAI'],
  ])('strips a %s heading', (_name, answer) => {
    const { body, hasFooter } = splitSourcesFooter(answer);

    expect(hasFooter).toBe(true);
    expect(body).not.toMatch(/Sources|المصادر/);
    expect(body).not.toContain('SCAI');
    expect(body.length).toBeGreaterThan(0);
  });

  it('removes both copies when the service repeats the footer', () => {
    const answer = [
      'The latest Real GDP is 185.17.',
      '',
      'Sources:',
      '- Real GDP — SCAI Approved/Published Data — 2025-Q4',
      '',
      'Sources:',
      '- Real GDP — SCAI Approved/Published Data — Haver Analytics — 2025-Q4',
    ].join('\n');

    const { body } = splitSourcesFooter(answer);

    // Slicing at the first heading takes everything after it, second copy
    // included — which is what a follow-up turn actually sends.
    expect(body).toBe('The latest Real GDP is 185.17.');
  });

  it('leaves an answer that has no footer alone', () => {
    const answer = 'You are welcome — ask me anything else about the published indicators.';
    const { body, hasFooter } = splitSourcesFooter(answer);

    expect(hasFooter).toBe(false);
    expect(body).toBe(answer);
  });

  it('does not mistake a sentence about sources for the heading', () => {
    const answer = 'The Sources: listed below are approved.\n\nStill prose.';
    const { hasFooter } = splitSourcesFooter(answer);

    // The heading is a line of its own; this is a line of prose.
    expect(hasFooter).toBe(false);
  });
});
