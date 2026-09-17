/**
 * Responses captured from the running service, verbatim.
 *
 * The fixtures were written before the service existed and gave every answer a
 * headline. The service does not: a series answer is one element per row with
 * no headline at all, and a definition puts the whole answer in an `evidence`
 * element. Both of those rendered as an empty card until this suite existed.
 *
 * Anything captured here is a shape the service actually sent. Nothing in it is
 * invented, so a failure means the client dropped content the reader was owed.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import * as client from '../api/client';
import type { AskResponse } from '../api/types';
import { renderApp } from './render';

const FRESHNESS = {
  refreshed_at: '2026-09-17T13:02:21.415049+00:00',
  stale: false,
  age_seconds: 1192.037772,
};

const CPI = 'e4293295-fb43-46b0-7ac5-08dec461c23d';
const SOURCE = 'a04cf0bf-fece-46c0-aa7d-0ad1e7618a8d';

/** "Show me inflation in Qatar each year from 2019 to 2025." */
const SERIES_RESPONSE: AskResponse = {
  conversation_id: '2f4d08577df742c397bd1b3eabeeea7e',
  packages: [
    {
      provenance: 'approved',
      agent: 'Answered from the approved published data.',
      kind: 'answer',
      spec: {
        spec_version: 1,
        today: '2026-09-17',
        detail_id: { bound: CPI },
        period: { bound: { range: { start: '2019', end: '2025' } } },
        country_scope: { bound: 'national' },
        measure: { bound: 'actual' },
        operation: { bound: 'series' },
        bound_by: {
          detail: 'named-in-question',
          period: 'named-in-question',
          country_scope: 'rule-default',
          measure: 'rule-default',
          operation: 'named-in-question',
        },
        resolved_period: '2025',
      },
      elements: [
        ['2019', '-0.89001'],
        ['2020', '-2.58049'],
        ['2021', '2.30447'],
        ['2022', '4.99528'],
        ['2023', '3.02765'],
        ['2024', '1.22835'],
        ['2025', '0.54316'],
      ].map(([year, value]) => ({
        class: 'measured' as const,
        role: 'series' as const,
        text: `${year}: ${value} %`,
        source_ref: `${CPI}|${year}||${SOURCE}`,
      })),
      chartable: { available: false, default_view: null, alternate_views: [] },
      caveat: null,
      reason: null,
      degradations: [],
    },
  ],
  freshness: FRESHNESS,
};

/** "What does inflation mean?" */
const DEFINITION_RESPONSE: AskResponse = {
  conversation_id: '2f4d08577df742c397bd1b3eabeeea7e',
  packages: [
    {
      provenance: 'approved',
      agent: 'Answered from the approved published data.',
      kind: 'answer',
      spec: {
        spec_version: 1,
        today: '2026-09-17',
        detail_id: { bound: CPI },
        period: { deferred: { latest: true } },
        country_scope: { bound: 'national' },
        measure: { bound: 'actual' },
        operation: { bound: 'definition' },
        bound_by: {
          detail: 'named-in-question',
          period: 'rule-default',
          country_scope: 'rule-default',
          measure: 'rule-default',
          operation: 'named-in-question',
        },
        resolved_period: null,
      },
      elements: [
        {
          class: 'measured',
          role: 'evidence',
          text: `${CPI}: The increase in the general level of prices of goods and services during a specific period.`,
          source_ref: `catalogue:detail:${CPI}`,
        },
      ],
      chartable: { available: false, default_view: null, alternate_views: [] },
      caveat: null,
      reason: null,
      degradations: [],
    },
  ],
  freshness: FRESHNESS,
};

async function askWith(response: AskResponse, question: string) {
  vi.spyOn(client, 'ask').mockResolvedValue(response);
  const { user } = renderApp();
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('shapes the live service actually returns', () => {
  it('renders every row of a series answer that has no headline', async () => {
    await askWith(SERIES_RESPONSE, 'Show me inflation each year from 2019 to 2025');

    // All seven rows, exactly as the service composed them — no chart required.
    for (const row of [
      '2019: -0.89001 %',
      '2020: -2.58049 %',
      '2021: 2.30447 %',
      '2022: 4.99528 %',
      '2023: 3.02765 %',
      '2024: 1.22835 %',
      '2025: 0.54316 %',
    ]) {
      expect(await screen.findByText(row)).toBeInTheDocument();
    }
  });

  it('keeps series rows in the executive lens, where they are the whole answer', async () => {
    const user = await askWith(SERIES_RESPONSE, 'Show me inflation each year from 2019 to 2025');
    await screen.findByText('2019: -0.89001 %');

    await user.click(screen.getByRole('radio', { name: 'Executive lens' }));
    expect(screen.getByText('2025: 0.54316 %')).toBeInTheDocument();
  });

  it('shows the span a series covers, not just where it ends', async () => {
    await askWith(SERIES_RESPONSE, 'Show me inflation each year from 2019 to 2025');
    await screen.findByText('2019: -0.89001 %');

    // resolved_period is 2025; the question covered 2019–2025.
    expect(screen.getByText('2019–2025')).toBeInTheDocument();
  });

  it('shows a definition that arrived as an evidence element, not behind a toggle', async () => {
    await askWith(DEFINITION_RESPONSE, 'What does inflation mean?');

    const card = await screen.findByRole('article');
    expect(
      within(card).getByText(/The increase in the general level of prices/),
    ).toBeInTheDocument();
    // It is the answer, so it is not hidden behind the evidence disclosure.
    expect(screen.queryByRole('button', { name: /Show published rows/i })).toBeNull();
  });

  it('keeps that definition in the executive lens too', async () => {
    const user = await askWith(DEFINITION_RESPONSE, 'What does inflation mean?');
    await screen.findByText(/The increase in the general level of prices/);

    await user.click(screen.getByRole('radio', { name: 'Executive lens' }));
    expect(screen.getByText(/The increase in the general level of prices/)).toBeInTheDocument();
  });
});
