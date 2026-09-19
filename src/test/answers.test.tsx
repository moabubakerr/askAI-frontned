import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import * as client from '../api/client';
import type { ChatResponse } from '../api/types';
import { renderApp } from './render';

/**
 * The prose and the facts panel deliberately carry the same figures — the
 * service composes a sentence, and the panel shows the structure behind it. So
 * assertions here target strings only the panel produces (its labels and column
 * headers), which is what proves the structured half rendered at all.
 */
async function ask(question: string) {
  const { user } = renderApp();
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

async function askAgain(user: UserEvent, question: string) {
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('every facts shape renders its own structure', () => {
  it.each([
    ['What is the latest value of Real GDP?', 'Target'],
    ['Show the Real GDP trend over time', 'Published points'],
    ['What does inflation mean?', 'Indicator'],
    ['Compare Real GDP across Qatar and Saudi Arabia', 'Country'],
    ['Rank the countries by Real GDP', 'Period used'],
    ['What was the growth rate of Real GDP?', 'Growth rate'],
    ['Give me a macro overview', 'Indicator'],
    ['What can you do?', 'Published indicators'],
    ['How many indicators are there?', 'Count'],
    ['What are the highest and lowest values?', 'Difference'],
    ['Compare 2025-Q1 against 2025-Q4', 'Percent change'],
  ])('%s', async (question, panelLabel) => {
    await ask(question);
    const card = await screen.findByRole('article');
    expect(within(card).getByText(panelLabel)).toBeInTheDocument();
  });
});

describe('the contract’s three traps', () => {
  it('treats ok:false as an answer, not a failure — it arrives as HTTP 200', async () => {
    await ask('Tell me about GDP Growth Demo');

    const card = await screen.findByRole('article');
    expect(card).toHaveAttribute('data-ok', 'false');
    expect(within(card).getByText(/has no data points in the approved dataset/i)).toBeInTheDocument();
    // Not an error state: no retry affordance, nothing red.
    expect(screen.queryByRole('button', { name: 'Ask again' })).toBeNull();
  });

  it('parses string figures before formatting them', async () => {
    await ask('Compare Real GDP across Qatar and Saudi Arabia');
    const card = await screen.findByRole('article');

    // "1102.400" arrives as a string; unparsed it would render ungrouped, and
    // rounded it would restate a figure published to three decimals.
    expect(within(card).getByText(/1,102\.400/)).toBeInTheDocument();
  });

  it('does not render the sources twice', async () => {
    await ask('What is the latest value of Real GDP?');
    await screen.findByRole('article');

    // The prose footer is split off, and the citations render once instead.
    expect(screen.getAllByText(/National Planning Council/)).toHaveLength(1);
    expect(screen.queryByText(/SCAI Approved\/Published Data/)).toBeNull();
  });
});

describe('what the reader must not be allowed to miss', () => {
  it('shows countries the service holds no approved data for', async () => {
    await ask('Compare Real GDP across Qatar and Saudi Arabia');
    const card = await screen.findByRole('article');

    // Hiding these makes a partial answer look complete — QC finding F-001.
    expect(within(card).getByText('No approved data for')).toBeInTheDocument();
    expect(within(card).getByText('Kuwait')).toBeInTheDocument();
    expect(within(card).getByText('Oman')).toBeInTheDocument();
  });

  it('marks an answer whose wording the verifier rejected', async () => {
    await ask('Give me the blunt version');
    expect(await screen.findByText(/replaced with a plain template/i)).toBeInTheDocument();
  });

  it('turns an ambiguous match into clickable choices', async () => {
    const user = await ask('What is the GDP forecast?');
    await screen.findByText(/could match more than one indicator/i);

    // The service refuses to guess (F-003/F-012); the reader picks instead.
    expect(screen.getByRole('button', { name: 'GDP Growth Demo' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Real GDP' }));

    // The pick is asked as its own turn, and answers with a value.
    expect(await screen.findByText('Target')).toBeInTheDocument();
  });

  it('flags raw working data, and leaves approved rows unlabelled', async () => {
    await ask('Give me a macro overview');
    const card = await screen.findByRole('article');

    // Approved is the norm and carries no badge; the exception is what is named.
    expect(within(card).getByText('Working data')).toBeInTheDocument();
    expect(within(card).queryByText('Approved')).toBeNull();
  });

  it('keeps the sources behind a disclosure rather than under the answer', async () => {
    await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    // Collapsed by default: the trigger is what shows, opened by hover, focus
    // or a click. (The hover itself is CSS, so only the control is asserted.)
    const trigger = within(card).getByRole('button', { name: /Sources/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders a catalog citation with no indicator as a fallback, never "None"', async () => {
    await ask('What does inflation mean?');
    await screen.findByRole('article');

    expect(screen.getByText('Catalog entry')).toBeInTheDocument();
    expect(screen.queryByText('None')).toBeNull();
  });
});

describe('charts', () => {
  it('plots a trend without being asked', async () => {
    await ask('Show the Real GDP trend over time');
    const chart = await screen.findByRole('figure');

    expect(within(chart).getByRole('img', { name: 'Real GDP' })).toBeInTheDocument();
  });

  it('honours decimal_places rather than the published precision', async () => {
    const user = await ask('Show the Real GDP trend over time');
    await screen.findByRole('figure');

    await user.click(screen.getByRole('radio', { name: 'Table' }));
    const chart = screen.getByRole('figure');

    // The row is published as 185.170; the spec says 2 decimal places (F-004).
    expect(within(chart).getByRole('cell', { name: '185.17' })).toBeInTheDocument();
    expect(within(chart).getByRole('cell', { name: '2025-Q4' })).toBeInTheDocument();
  });

  it('carries the service’s warning that overview units are not comparable', async () => {
    await ask('Give me a macro overview');
    await screen.findByRole('figure');

    expect(screen.getByText(/not on a shared scale/i)).toBeInTheDocument();
  });

  it('names the countries a comparison chart could not include', async () => {
    await ask('Compare Real GDP across Qatar and Saudi Arabia');
    await screen.findByRole('figure');

    expect(screen.getByText(/Not shown, no approved data: Kuwait, Oman/)).toBeInTheDocument();
  });

  it('shows no chart for a single value', async () => {
    await ask('What is the latest value of Real GDP?');
    await screen.findByRole('article');

    expect(screen.queryByRole('figure')).toBeNull();
  });
});

describe('failures that are actually failures', () => {
  it('offers a retry when the request times out, and says why it was slow', async () => {
    vi.spyOn(client, 'chat').mockRejectedValue(new client.ChatError('timeout'));
    await ask('What is the latest value of Real GDP?');

    expect(await screen.findByText(/did not answer in time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask again' })).toBeInTheDocument();
  });

  it('renders nothing structured for a greeting', async () => {
    const response: ChatResponse = {
      answer: 'Hello. Ask me about a published indicator.',
      facts_payload: { ok: true, facts: { note: 'Greeting — no data needed.' }, citations: [] },
      chart: null,
      verified: true,
    };
    vi.spyOn(client, 'chat').mockResolvedValue(response);

    await ask('hello');
    await screen.findByText(/Ask me about a published indicator/);

    // That note is the service talking to itself, not an answer to show.
    expect(screen.queryByText(/Greeting — no data needed/)).toBeNull();
    expect(screen.queryByText('note')).toBeNull();
  });

  it('renders an unknown facts shape rather than dropping it', async () => {
    const response: ChatResponse = {
      answer: 'Something new.',
      facts_payload: { ok: true, facts: { future_field: '12.5', another: 'value' }, citations: [] },
      chart: null,
      verified: true,
    };
    vi.spyOn(client, 'chat').mockResolvedValue(response);

    await ask('something this client has never seen');

    expect(await screen.findByText('future_field')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
  });
});

describe('the session', () => {
  it('sends a stable session id, and no transcript — the server holds that', async () => {
    const spy = vi.spyOn(client, 'chat');
    const user = await ask('What is the latest value of Real GDP?');
    await screen.findByRole('article');

    await askAgain(user, 'and for Saudi Arabia?');

    const first = spy.mock.calls[0]?.[0];
    const second = spy.mock.calls[1]?.[0];

    expect(first?.session_id).toBeTruthy();
    // 'default' would put every reader in one server-side conversation.
    expect(first?.session_id).not.toBe('default');
    // The follow-up inherits on the server, keyed on this id.
    expect(second?.session_id).toBe(first?.session_id);
    // The client no longer sends the transcript back.
    expect(second).not.toHaveProperty('conversation_context');
  });

  it('ends the server-side conversation when a new one is started', async () => {
    const endSpy = vi.spyOn(client, 'endSession').mockResolvedValue();
    const chatSpy = vi.spyOn(client, 'chat');

    const user = await ask('What is the latest value of Real GDP?');
    await screen.findByRole('article');
    const firstSession = chatSpy.mock.calls[0]?.[0]?.session_id;

    await user.click(screen.getByRole('button', { name: /New conversation/ }));

    // Without the DELETE the old session keeps its indicator and period, and
    // the next unrelated question silently inherits them.
    expect(endSpy).toHaveBeenCalledWith(firstSession);

    await askAgain(user, 'What is the latest value of Real GDP?');
    const secondSession = chatSpy.mock.calls[1]?.[0]?.session_id;
    expect(secondSession).not.toBe(firstSession);
  });
});

describe('the read-it-for-me view', () => {
  async function openRead(question = 'What is the latest value of Real GDP?') {
    const user = await ask(question);
    await screen.findByRole('article');
    await user.click(screen.getByRole('button', { name: /Read this for me/ }));
    return user;
  }

  it('keeps the Council’s words and the generated prose in separate blocks', async () => {
    await openRead();

    const council = await screen.findByText(/Non-hydrocarbon activity carried most/);
    const narration = screen.getByText(/gradual upward path/);

    // The separation is a correctness requirement: generated text must never
    // appear to carry the Council's authority.
    const councilBlock = council.closest('figure');
    expect(councilBlock).not.toBeNull();
    expect(councilBlock?.contains(narration)).toBe(false);
    expect(screen.getByText(/According to SCAI/)).toBeInTheDocument();
  });

  it('shows the disclaimer with the narration', async () => {
    await openRead();
    await screen.findByText(/gradual upward path/);

    expect(
      screen.getByText('Generated from the readings above — not Council analysis.'),
    ).toBeInTheDocument();
  });

  it('renders the summary bullets as a list', async () => {
    await openRead();
    await screen.findByText(/Non-hydrocarbon activity carried most/);

    const items = screen.getAllByRole('listitem').map((node) => node.textContent);
    expect(items).toContain('The hydrocarbon component was broadly flat.');
    // The bullet character itself is the list's job, not the text's.
    expect(items.some((text) => text?.startsWith('•'))).toBe(false);
  });

  it('puts the raw readings behind a disclosure', async () => {
    const user = await openRead();
    await screen.findByText(/According to SCAI/);

    expect(screen.queryByText('184.905 QAR')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Data evidence/ }));
    expect(screen.getByText('184.905 QAR')).toBeInTheDocument();
  });

  it('handles a null headline, which trends and rankings have', async () => {
    await openRead('Show the Real GDP trend over time');

    expect(await screen.findByText(/rose across the eight published quarters/)).toBeInTheDocument();
  });
});

describe('the v2 answer additions', () => {
  it('names the indicator it matched on every successful answer', async () => {
    await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    // An answer that describes an indicator without naming it hides a wrong match.
    expect(within(card).getAllByText('Real GDP').length).toBeGreaterThan(0);
  });

  it('shows the caveat in facts.note', async () => {
    await ask('Compare Real GDP across Qatar and Saudi Arabia');
    await screen.findByRole('article');

    expect(
      screen.getByText(/the most recent period all of these countries report/),
    ).toBeInTheDocument();
  });

  it('separates a low-confidence approximate match from the answer', async () => {
    await ask('What is labor productivity?');
    await screen.findByRole('article');

    const warning = screen.getByText(/\(approximate match\)/);
    expect(warning).toBeInTheDocument();
    // Not left trailing off the end of the prose.
    expect(warning.closest('p')).not.toBeNull();
  });

  it('renders a period ranking', async () => {
    await ask('What were the strongest quarters?');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('Order')).toBeInTheDocument();
    expect(within(card).getByText('descending')).toBeInTheDocument();
    expect(within(card).getByRole('cell', { name: '2025-Q3' })).toBeInTheDocument();
  });

  it('sets direction from the reply, not from the interface language', async () => {
    // UI in English, question in Arabic — the reply comes back Arabic.
    await ask('ما الناتج المحلي الإجمالي الحقيقي؟');
    const card = await screen.findByRole('article');

    const prose = within(card).getByText(/بلغ الناتج المحلي/);
    expect(prose.closest('[dir="rtl"]')).not.toBeNull();
  });
});
