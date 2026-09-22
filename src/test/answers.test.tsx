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

  it('labels no citation by source table', async () => {
    await ask('Give me a macro overview');
    const card = await screen.findByRole('article');

    // Every row reads the same; the table name is on the row's title only.
    expect(within(card).queryByText('Working data')).toBeNull();
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

  it('renders a definition once — `answer` and `facts.definition` are the same string', async () => {
    await ask('What does inflation mean?');
    const card = await screen.findByRole('article');

    expect(
      within(card).getAllByText(/impairment in the actual value of money/),
    ).toHaveLength(1);
    // The indicator is still named, above the prose.
    expect(within(card).getByText('Inflation')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'New conversation' }));

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

  it('puts the raw readings behind a disclosure, with their figures', async () => {
    const user = await openRead();
    await screen.findByText(/According to SCAI/);

    expect(screen.queryByText(/185\.17 QAR bn/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /Data evidence/ }));

    // `/read` names the reading `value`, not `actual`; reading only `actual`
    // renders a column of dashes. The unit comes from the facts; the figure is
    // shown exactly as sent.
    expect(screen.getByText('185.17 QAR bn')).toBeInTheDocument();
    expect(screen.getByText('181.49 QAR bn')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Q4 2025' })).toBeInTheDocument();
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

describe('the chrome', () => {
  it('starts a new conversation from the logo', async () => {
    const endSpy = vi.spyOn(client, 'endSession').mockResolvedValue();
    const chatSpy = vi.spyOn(client, 'chat');

    const user = await ask('What is the latest value of Real GDP?');
    await screen.findByRole('article');
    const firstSession = chatSpy.mock.calls[0]?.[0]?.session_id;

    await user.click(screen.getByRole('button', { name: 'Start a new conversation' }));

    expect(endSpy).toHaveBeenCalledWith(firstSession);
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('shows no session control and no service-status chip', async () => {
    await ask('What is the latest value of Real GDP?');
    await screen.findByRole('article');

    expect(screen.queryByRole('button', { name: 'Session' })).toBeNull();
    expect(screen.queryByText(/Service responding/)).toBeNull();
  });
});

describe('the consolidated v2 shapes', () => {
  it('gives every multi-metric row its own period and grain', async () => {
    await ask('Show me GDP and inflation');
    const card = await screen.findByRole('article');

    // Each line carries its own period; none is stated for the table.
    expect(within(card).getByRole('cell', { name: '2025-Q4' })).toBeInTheDocument();
    expect(within(card).getByRole('cell', { name: '2025-12' })).toBeInTheDocument();
    expect(within(card).getByText('quarterly')).toBeInTheDocument();
    expect(within(card).getByText('monthly')).toBeInTheDocument();
  });

  it('leads with year-on-year change where the service reports growth', async () => {
    await ask('Show me GDP and inflation');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('+2.03% YoY')).toBeInTheDocument();
  });

  it('shows metrics that were requested and not found', async () => {
    await ask('Show me GDP and inflation');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('Not found')).toBeInTheDocument();
    expect(within(card).getByText('Tourism arrivals')).toBeInTheDocument();
  });

  it('never renders the service’s internal diagnostics', async () => {
    await ask('Give me a macro overview');
    await screen.findByRole('article');

    // `_`-prefixed keys are diagnostics, not part of the answer.
    expect(screen.queryByText(/_verifier_rejected_numbers/)).toBeNull();
    expect(screen.queryByText('2.0277')).toBeNull();
  });

  it('says which extreme a min/max answer is, and over what range', async () => {
    await ask('What are the highest and lowest values?');
    const card = await screen.findByRole('article');

    expect(within(card).getByText(/Highest reading/)).toBeInTheDocument();
    expect(within(card).getByText(/2024-Q1 → 2025-Q4/)).toBeInTheDocument();
    expect(within(card).getByText(/8 readings scanned/)).toBeInTheDocument();
  });
});

describe('performance ranking', () => {
  it('uses attainment_percent as given, so polarity is not inverted', async () => {
    await ask('Which are the best performing ones?');
    const card = await screen.findByRole('article');

    // Cost per Student is a Decrease indicator: 84.055 against a target of
    // 88.6 is beating it. Computing actual/target would show 94.9% and rank it
    // last; a PISA rank of 48 against 35 would become 137% instead of 72.9%.
    expect(within(card).getByText('105.4%')).toBeInTheDocument();
    expect(within(card).getByText('72.9%')).toBeInTheDocument();
    expect(within(card).queryByText('94.9%')).toBeNull();
    expect(within(card).queryByText(/137/)).toBeNull();
  });

  it('keeps the order the service ranked them in', async () => {
    await ask('Which are the best performing ones?');
    const card = await screen.findByRole('article');

    const ranked = within(card)
      .getAllByRole('listitem')
      .map((node) => node.textContent ?? '')
      .filter((text) => text.includes('%'));

    expect(ranked[0] ?? '').toContain('Cost per Student');
    expect(ranked[1] ?? '').toContain('PISA Rank');
    expect(ranked[2] ?? '').toContain('Teacher–Student Ratio');
  });

  it('shows what could not be ranked, in the open', async () => {
    await ask('Which are the best performing ones?');
    const card = await screen.findByRole('article');

    // 3 of 13 quietly missing would be a more confident picture of the sector
    // than the honest one.
    expect(within(card).getByText('2 of 5 could not be ranked')).toBeInTheDocument();
    expect(within(card).getByText('no reading yet')).toBeInTheDocument();
    expect(within(card).getByText('no target set')).toBeInTheDocument();
    // Not folded away behind a disclosure.
    expect(within(card).queryByRole('button', { name: /could not be ranked/i })).toBeNull();
  });

  it('dates a standing goal rather than passing it off as this period’s target', async () => {
    await ask('Which are the best performing ones?');
    const card = await screen.findByRole('article');

    // PISA's 35 is a 2030 goal, not a target filed against the 2022 reading.
    expect(within(card).getByText(/target for 2030/)).toBeInTheDocument();
  });

  it('keeps each row’s own unit rather than hoisting one into a header', async () => {
    await ask('Which are the best performing ones?');
    const card = await screen.findByRole('article');

    expect(within(card).getByText(/84.055 QAR k/)).toBeInTheDocument();
    expect(within(card).getByText(/48 Rank/)).toBeInTheDocument();
    // An empty unit renders as a bare figure.
    expect(within(card).getByText('15.1')).toBeInTheDocument();
  });

  it('says which way the ranking runs and what it is measured against', async () => {
    await ask('Which are the best performing ones?');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('Best first')).toBeInTheDocument();
    expect(within(card).getByText('3 of 5 ranked')).toBeInTheDocument();
    expect(within(card).getByText(/polarity applied/)).toBeInTheDocument();
  });
});

describe('catalogue listings', () => {
  it('renders the names once, with no duplicate sources block', async () => {
    await ask('Give me all the indicator names');
    const card = await screen.findByRole('article');

    // The citations for a listing are the indicators themselves, so a sources
    // block would print the same list a second time.
    expect(within(card).queryByRole('button', { name: /Sources/ })).toBeNull();
    expect(within(card).getAllByText('Nominal GDP')).toHaveLength(1);
  });
});

describe('the macro snapshot', () => {
  it('shows where each indicator stood a year earlier, not just where it is', async () => {
    await ask('How is Qatar’s economy doing?');
    const card = await screen.findByRole('article');

    // The question is whether it moved, so the comparison is the substance of
    // the row rather than a footnote to it.
    expect(within(card).getByText('vs a year earlier')).toBeInTheDocument();
    expect(within(card).getByText(/181\.49/)).toBeInTheDocument();
    // Two rows have a year-earlier reading; both name the period compared.
    expect(within(card).getAllByText(/\(2024-Q4\)/)).toHaveLength(2);
  });

  it('shows each figure at the precision it arrived with', async () => {
    await ask('How is Qatar’s economy doing?');
    const card = await screen.findByRole('article');

    // The service sends them display-rounded. Rounding again on top could only
    // restate a published figure — 185.17 shown as 185.2 is a different number.
    expect(within(card).getByText('185.17')).toBeInTheDocument();
    expect(within(card).getByText('2.6162')).toBeInTheDocument();
  });

  it('keeps each row’s own unit and period, with no shared "as of"', async () => {
    await ask('How is Qatar’s economy doing?');
    const card = await screen.findByRole('article');

    // 2025-Q4 next to 2026-04 is correct: they report on different schedules.
    expect(within(card).getAllByRole('cell', { name: /2025-Q4/ }).length).toBeGreaterThan(0);
    expect(within(card).getByRole('cell', { name: /2026-04/ })).toBeInTheDocument();
    // The unit already carries its scale; nothing is appended to it.
    expect(within(card).getAllByText('QAR bn').length).toBeGreaterThan(0);
  });

  it('implies no movement where there is no comparable reading', async () => {
    await ask('How is Qatar’s economy doing?');
    const card = await screen.findByRole('article');

    const rows = within(card)
      .getAllByRole('row')
      .filter((row) => (row.textContent ?? '').includes('Population'));
    expect(rows).toHaveLength(1);
    // An absent change is "not known", never "flat".
    expect(rows[0]?.textContent).toContain('—');
  });

  it('renders a change in points as points, not as per cent', async () => {
    await ask('How is Qatar’s economy doing?');
    const card = await screen.findByRole('article');

    const inflation = within(card)
      .getAllByRole('row')
      .find((row) => (row.textContent ?? '').includes('Inflation'));

    // Reading only change_yoy_percent left this cell blank while the prose
    // above it stated the change. And +1.99% would be a different number.
    expect(inflation?.textContent).toContain('+1.99 pp');
    expect(inflation?.textContent).not.toContain('+1.99%');
  });

  it('shows direction without calling it good or bad', async () => {
    await ask('How is Qatar’s economy doing?');
    const card = await screen.findByRole('article');

    expect(within(card).getByText(/\+2\.03%/)).toBeInTheDocument();
    expect(within(card).getByText(/−17\.68%/)).toBeInTheDocument();

    // A fall in inflation is the desirable direction, so the snapshot marks
    // direction and leaves the judgement out of it.
    const fall = within(card)
      .getAllByRole('cell')
      .find((cell) => (cell.textContent ?? '').includes('17.68'));
    expect(fall).toHaveAttribute('data-direction', 'down');
  });
});

describe('indicators split by direction', () => {
  it.each([
    'Which national indicators are increasing, and which are declining compared with the previous year?',
    'which indicators are rising and which are falling',
    'أي المؤشرات ارتفعت وأيها انخفضت',
  ])('is reached by: %s', async (question) => {
    await ask(question);
    const card = await screen.findByRole('article');

    expect(within(card).getByText('Rose (2)')).toBeInTheDocument();
    expect(within(card).getByText('Fell (5)')).toBeInTheDocument();
  });

  it('keeps the order the service sorted them in', async () => {
    await ask('which indicators are rising and which are falling');
    const card = await screen.findByRole('article');

    const fell = within(card)
      .getByText('Fell (5)')
      .closest('section') as HTMLElement;
    const names = within(fell)
      .getAllByRole('listitem')
      .map((node) => node.textContent ?? '');

    // Largest fall first, exactly as sent.
    expect(names[0]).toContain('Government Revenues');
    expect(names[names.length - 1]).toContain('PISA Rank');
  });

  it('shows what has no year-on-year figure, and never as "unchanged"', async () => {
    await ask('which indicators are rising and which are falling');
    const card = await screen.findByRole('article');

    // An answer silently covering 6 of 8 would be a false picture.
    expect(
      within(card).getByText('No year-on-year comparison available for 2 of 8'),
    ).toBeInTheDocument();
    expect(within(card).getByText('no year-on-year figure published')).toBeInTheDocument();
    expect(within(card).queryByText(/Unchanged/)).toBeNull();
  });

  it('reads polarity per row, not per group', async () => {
    await ask('which indicators are rising and which are falling');
    const card = await screen.findByRole('article');

    // The same group holds both: Government Revenues falling is unwelcome,
    // Inflation and Cost per Student falling is the welcome direction. A group
    // that labelled every row the same would fail here.
    const fell = within(card).getByText('Fell (5)').closest('section') as HTMLElement;
    expect(within(fell).getAllByText('higher is better').length).toBeGreaterThan(0);
    expect(within(fell).getAllByText('lower is better').length).toBeGreaterThan(0);

    const rose = within(card).getByText('Rose (2)').closest('section') as HTMLElement;
    expect(within(rose).getAllByText('higher is better')).toHaveLength(2);
  });

  it('keeps each row’s own unit and period', async () => {
    await ask('which indicators are rising and which are falling');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('185.17 QAR bn')).toBeInTheDocument();
    expect(within(card).getByText('5.2 million')).toBeInTheDocument();
    // Different schedules, so no shared period is shown.
    expect(within(card).getAllByText('2025-Q4').length).toBeGreaterThan(0);
    expect(within(card).getByText('2026-Q1')).toBeInTheDocument();
  });

  it('renders points as points, never as per cent', async () => {
    await ask('which indicators are rising and which are falling');
    const card = await screen.findByRole('article');

    // Inflation is measured in per cent, so its year-on-year move is in
    // percentage points: −0.80 pp. Writing it as −0.80% is a different claim.
    expect(within(card).getByText('−0.80 pp')).toBeInTheDocument();
    expect(within(card).queryByText('−0.80%')).toBeNull();
  });

  it('shows the change at reading precision, not the stored four places', async () => {
    await ask('which indicators are rising and which are falling');
    const card = await screen.findByRole('article');

    expect(within(card).getByText('+2.03%')).toBeInTheDocument();
    expect(within(card).getByText('−23.49%')).toBeInTheDocument();
    expect(within(card).queryByText(/2\.0277/)).toBeNull();
  });
});

describe('the read disclosure', () => {
  it('is one control that opens, closes and shows its state', async () => {
    const user = await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    const trigger = within(card).getByRole('button', { name: /Read this for me/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    await screen.findByText(/According to SCAI/);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Closing keeps what was fetched, so reopening costs no request.
    await user.click(trigger);
    expect(screen.queryByText(/According to SCAI/)).toBeNull();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(await screen.findByText(/According to SCAI/)).toBeInTheDocument();
  });

  it('names its source above the answer', async () => {
    await ask('What is the latest value of Real GDP?');
    await screen.findByRole('article');

    expect(screen.getByText('SCEAI Indicators')).toBeInTheDocument();
  });
});

describe('rating an answer', () => {
  it('posts a 3, 4 or 5 straight away, with the message and session ids', async () => {
    const chatSpy = vi.spyOn(client, 'chat');
    const feedbackSpy = vi.spyOn(client, 'sendFeedback');

    const user = await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    await user.click(within(card).getByRole('radio', { name: 'Rate 4 out of 5' }));
    await screen.findByText(/your rating was recorded/i);

    const sent = feedbackSpy.mock.calls[0]?.[0];
    expect(sent?.rating).toBe(4);
    expect(sent?.comment).toBeUndefined();
    expect(sent?.message_id).toBe((await chatSpy.mock.results[0]?.value)?.message_id);
    // The server looks up the exchange by this id to store it beside the score.
    expect(sent?.session_id).toBe(chatSpy.mock.calls[0]?.[0]?.session_id);
  });

  it('asks for the reason before posting a 1 or a 2', async () => {
    const feedbackSpy = vi.spyOn(client, 'sendFeedback');

    const user = await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    await user.click(within(card).getByRole('radio', { name: 'Rate 1 out of 5' }));

    // Posting on the click would take a guaranteed 422 and have to recover.
    expect(feedbackSpy).not.toHaveBeenCalled();
    const box = within(card).getByLabelText('What was wrong with it?');

    await user.type(box, 'wrong period');
    await user.click(within(card).getByRole('button', { name: 'Send rating' }));

    await screen.findByText(/your rating was recorded/i);
    const sent = feedbackSpy.mock.calls[0]?.[0];
    expect(sent?.rating).toBe(1);
    expect(sent?.comment).toBe('wrong period');
  });

  it('keeps the score and shows the service’s own wording when a comment is missing', async () => {
    vi.spyOn(client, 'sendFeedback').mockRejectedValue(
      new client.FeedbackRejected(
        'A comment is required for a rating of 2 or below — please say what was wrong with the answer.',
        true,
      ),
    );

    const user = await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    // Reaching the rejection directly: a 4 is posted immediately.
    await user.click(within(card).getByRole('radio', { name: 'Rate 4 out of 5' }));

    expect(
      await screen.findByText(
        'A comment is required for a rating of 2 or below — please say what was wrong with the answer.',
      ),
    ).toBeInTheDocument();
    // comment_required means the score was fine, so it is kept.
    expect(within(card).getByRole('radio', { name: 'Rate 4 out of 5' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(card).getByLabelText('What was wrong with it?')).toBeInTheDocument();
  });

  it('retires itself once rated, because ratings are append-only', async () => {
    const feedbackSpy = vi.spyOn(client, 'sendFeedback');

    const user = await ask('What is the latest value of Real GDP?');
    const card = await screen.findByRole('article');

    await user.click(within(card).getByRole('radio', { name: 'Rate 5 out of 5' }));
    await screen.findByText(/your rating was recorded/i);

    // There is no update or delete endpoint: re-rating would post a second row.
    expect(screen.queryByRole('radio', { name: 'Rate 1 out of 5' })).toBeNull();
    expect(feedbackSpy).toHaveBeenCalledTimes(1);
  });

  it('can rate a refusal, which is often the answer most worth flagging', async () => {
    await ask('Tell me about GDP Growth Demo');
    const card = await screen.findByRole('article');

    expect(card).toHaveAttribute('data-ok', 'false');
    expect(within(card).getByRole('radio', { name: 'Rate 1 out of 5' })).toBeInTheDocument();
  });
});

describe('colouring a movement', () => {
  it('reads polarity, so a welcome fall is not marked as a loss', async () => {
    await ask('which indicators are rising and which are falling');
    const card = await screen.findByRole('article');

    const cell = (name: string) =>
      within(card)
        .getAllByRole('listitem')
        .find((row) => (row.textContent ?? '').includes(name))
        ?.querySelector('[data-tone]');

    // Both fell. Government Revenues is 'Increase', so falling is unwelcome;
    // Inflation is 'Decrease', so falling is the good news.
    expect(cell('Government Revenues')).toHaveAttribute('data-tone', 'bad');
    expect(cell('Inflation')).toHaveAttribute('data-tone', 'good');

    // And a rise is judged the same way round.
    expect(cell('Real GDP')).toHaveAttribute('data-tone', 'good');
  });
});
