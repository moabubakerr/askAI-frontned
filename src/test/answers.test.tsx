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

  it('never tells the reader an answer was "replaced" — the data is correct', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await ask('Give me the blunt version');
    await screen.findByRole('article');

    // verified:false means the wording was templated, not that the figure is
    // doubtful. Saying so would invite doubt about an answer that is right.
    expect(screen.queryByText(/replaced with a plain template/i)).toBeNull();
    expect(screen.queryByText(/wording/i)).toBeNull();

    // But the evidence is not swallowed: it is a backend gap worth closing.
    expect(warn).toHaveBeenCalledWith(
      '[askai] answer returned verified:false',
      expect.objectContaining({ question: 'Give me the blunt version' }),
    );
  });

  it('builds the chips from facts.candidates, not from the message text', async () => {
    const chatSpy = vi.spyOn(client, 'chat');
    const user = await ask('What is the GDP forecast?');
    await screen.findByText(/could match more than one indicator/i);

    // 'Debt to GDP Ratio' is in `candidates` but never in the message, so a
    // chip for it proves the structured field is what is being read.
    expect(screen.getByRole('button', { name: 'Debt to GDP Ratio' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Real GDP' }));
    await screen.findByText('Target');

    // Sent verbatim, on the same session: the service is holding that exact
    // string, and an altered one would not match.
    const resend = chatSpy.mock.calls[1]?.[0];
    expect(resend?.message).toBe('Real GDP');
    expect(resend?.session_id).toBe(chatSpy.mock.calls[0]?.[0]?.session_id);
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

    expect(await screen.findByText(/moves within a narrow band/)).toBeInTheDocument();
  });

  it('renders the generated prose once, even when one_liner repeats it', async () => {
    await openRead('Show the Real GDP trend over time');
    await screen.findByText(/moves within a narrow band/);

    // /read has no `answer` field: the prose is `narration`, and `one_liner`
    // sometimes repeats it word for word.
    expect(screen.getAllByText(/moves within a narrow band/)).toHaveLength(1);
  });

  it('does not put the Council’s name to commentary about another period', async () => {
    await openRead();
    await screen.findByText(/Real GDP grew by 6.1% YoY in Q4 2024/);

    // The row is filed against Q1 2019 but its text is about Q4 2024.
    expect(
      screen.getByText(/SCAI commentary attached to the the first quarter of 2019 data point/),
    ).toBeInTheDocument();
    expect(screen.getByText(/refers to a different period/)).toBeInTheDocument();

    // The matching entry keeps the plain attribution.
    expect(screen.getByText(/According to SCAI, the fourth quarter of 2025/)).toBeInTheDocument();
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

describe('the readable gate', () => {
  it('offers the read view only when the service says the answer is readable', async () => {
    await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    expect(within(card).getByRole('button', { name: /Read this for me/ })).toBeInTheDocument();
  });

  it.each([
    ['What does inflation mean?', 'a definition'],
    ['What can you do?', 'a capability answer'],
    ['How many indicators are there?', 'a catalogue listing'],
    ['Tell me about GDP Growth Demo', 'a no-data answer'],
    ['Show me the analyst commentary', 'analyst commentary'],
    ['Show me articles on diversification', 'article excerpts'],
  ])('hides it on %s (%s)', async (question) => {
    await ask(question);
    await screen.findByRole('article');

    // readable is false: offering it here shows the reader nothing new.
    expect(screen.queryByRole('button', { name: /Read this for me/ })).toBeNull();
  });

  it('follows the flag rather than the shape of the answer', async () => {
    // A reading-shaped payload with readable:false must still hide the button.
    const response: ChatResponse = {
      answer: 'Real GDP was 185.17 in 2025-Q4.',
      facts_payload: {
        ok: true,
        facts: { indicator: 'Real GDP', period_label: '2025-Q4', actual: '185.17', unit: 'QAR' },
        citations: [],
      },
      chart: null,
      verified: true,
      readable: false,
    };
    vi.spyOn(client, 'chat').mockResolvedValue(response);

    await ask('anything');
    await screen.findByRole('article');

    expect(screen.queryByRole('button', { name: /Read this for me/ })).toBeNull();
  });
});

describe('SCAI’s own writing', () => {
  it('renders analyst commentary as attributed content, with its bullets', async () => {
    await ask('Show me the analyst commentary');
    const card = await screen.findByRole('article');

    expect(within(card).getByText(/SCAI analyst commentary/i)).toBeInTheDocument();
    const bullet = within(card).getByText('Services expanded for a fourth consecutive quarter.');
    // Quoted and attributed, not merged into the prose above it.
    expect(bullet.closest('figure')).not.toBeNull();
  });

  it('keeps each commentary field under its own heading', async () => {
    await ask('Show me the analyst commentary');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('In detail')).toBeInTheDocument();
    expect(within(card).getByText('NPC analysis')).toBeInTheDocument();
    expect(within(card).getByText('Benchmark')).toBeInTheDocument();
  });

  it('puts article excerpts behind a disclosure and names the article', async () => {
    const user = await ask('Show me articles on diversification');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('economic diversification')).toBeInTheDocument();
    expect(screen.queryByText(/share of non-hydrocarbon activity has risen/)).toBeNull();

    await user.click(screen.getByRole('button', { name: /Show sources \(2\)/ }));

    expect(screen.getByText(/share of non-hydrocarbon activity has risen/)).toBeInTheDocument();
    expect(
      screen.getByText('Diversification and the non-hydrocarbon economy'),
    ).toBeInTheDocument();
  });

  it('styles article excerpts the same way as analyst commentary', async () => {
    const user = await ask('Show me articles on diversification');
    await screen.findByRole('article');
    await user.click(screen.getByRole('button', { name: /Show sources/ }));

    // Both are the Council's published writing, so both are attributed quotes —
    // never mistakable for generated prose.
    const excerpt = screen.getByText(/share of non-hydrocarbon activity has risen/);
    expect(excerpt.closest('figure')).not.toBeNull();
    expect(screen.getAllByText(/From a SCAI article/).length).toBeGreaterThan(0);
  });
});

describe('trend answers', () => {
  it('shows the server-computed summary figures as tiles', async () => {
    await ask('Show the Real GDP trend over time');
    const card = await screen.findByRole('article');

    // Computed server-side, not by the model.
    expect(within(card).getByText('First · 2024-Q1')).toBeInTheDocument();
    expect(within(card).getByText('Latest · 2025-Q4')).toBeInTheDocument();
    expect(within(card).getByText('Highest · 2025-Q4')).toBeInTheDocument();
    expect(within(card).getByText('Lowest · 2024-Q1')).toBeInTheDocument();
    expect(within(card).getByText('+2.19%')).toBeInTheDocument();
  });

  it('renders the readings once, not as a chart and a table at the same time', async () => {
    const user = await ask('Show the Real GDP trend over time');
    await screen.findByRole('figure');

    // The chart is showing; its Table view is the other half of the toggle, so
    // the same rows must not also be printed below it.
    expect(screen.queryAllByRole('cell', { name: '2024-Q2' })).toHaveLength(0);

    await user.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getAllByRole('cell', { name: '2024-Q2' })).toHaveLength(1);
  });

  it('falls back to the table when there is no chart', async () => {
    const response: ChatResponse = {
      answer: 'A trend with no chart spec.',
      facts_payload: {
        ok: true,
        facts: {
          indicator: 'Real GDP',
          series: [
            { period_label: '2024-Q1', actual: '181.204' },
            { period_label: '2024-Q2', actual: '182.870' },
          ],
          n_points: 2,
          unit: 'QAR',
        },
        citations: [],
      },
      chart: null,
      verified: true,
      readable: true,
    };
    vi.spyOn(client, 'chat').mockResolvedValue(response);

    await ask('a trend with no chart');
    await screen.findByRole('article');

    // No chart to carry them, so the readings are shown here.
    expect(screen.getByRole('cell', { name: '2024-Q2' })).toBeInTheDocument();
  });
});

describe('the internal record of templated wording', () => {
  it('counts verified:false answers in the session panel', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = await ask('Give me the blunt version');
    await screen.findByRole('article');

    await user.click(screen.getByRole('button', { name: 'Session' }));

    const label = await screen.findByText('Templated wording: 1');
    const panel = label.closest('div');
    expect(panel).not.toBeNull();
    // The question is listed alongside the count (it also appears as the turn's
    // own heading, hence the scoped lookup).
    expect(within(panel as HTMLElement).getByText('Give me the blunt version')).toBeInTheDocument();
  });
});
