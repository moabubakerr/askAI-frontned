import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from './render';

async function ask(question: string) {
  const { user } = renderApp();
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

describe('every state is reachable by typing', () => {
  it.each([
    ['What was CPI inflation in April 2026?', /Consumer prices rose 2.1%/i],
    ['Show total goods exports since 2018', /Total goods exports were 36.7/i],
    ['How did GDP change from Q1 to Q2 2025?', /Real GDP was 1.3% lower/i],
    ['Did inflation exceed 3% in 2025?', /below the 3% threshold/i],
    ['What is the inflation rate?', /Pick one and the question completes/i],
    ['What is the GDP growth forecast for 2027?', /is not approved for publication/i],
    ['Visitor arrivals this year', /no rows have been released for 2026/i],
    ['Compare female labour force participation with the GCC', /published for Qatar only/i],
    ['Why did exports fall?', /judgement about causes/i],
    ['International reserves', /indicator store did not respond/i],
    ['Widget output per fortnight', /No published indicator matches that name/i],
  ])('%s', async (question, expected) => {
    await ask(question);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('renders the spec line for every package in every state', async () => {
    await ask('What is the inflation rate?');
    await screen.findByText(/Pick one and the question completes/i);

    // A clarification carries no elements, so the scope line is the spec: what
    // could not be bound, and how each slot was bound.
    expect(screen.getByText(/ambiguous-detail: inflation/)).toBeInTheDocument();
    expect(screen.getByText('chosen by the reader')).toBeInTheDocument();
    expect(screen.getByText('As of 2026-04')).toBeInTheDocument();
  });

  it('shows the period a deferred "now" resolved to', async () => {
    await ask('What was CPI inflation in April 2026?');
    await screen.findByText(/Consumer prices rose 2.1%/i);

    expect(screen.getByText('As of 2026-04')).toBeInTheDocument();
  });

  it('separates a clarification from a refusal and invites a follow-up', async () => {
    await ask('What is the inflation rate?');
    await screen.findByText(/Pick one and the question completes/i);

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('data-kind', 'clarification');
    expect(screen.getByRole('button', { name: 'Reply to this' })).toBeInTheDocument();
    // A clarification is not counted as a failure, so it carries no refusal code.
    expect(screen.queryByText('Nothing published to answer from')).toBeNull();
  });

  it('shows a refusal as terminal, with the service’s own sentence', async () => {
    await ask('What is the GDP growth forecast for 2027?');
    await screen.findByText(/is not approved for publication/i);

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('data-kind', 'refusal');
    expect(screen.getByText('Nothing published to answer from')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reply to this' })).toBeNull();
  });

  it('refuses a comparison, which the service does not support yet', async () => {
    await ask('Rank published indicators by growth');
    expect(
      await screen.findByText(/Comparisons, rankings and spreads are not supported yet/i),
    ).toBeInTheDocument();
  });

  it('badges every card when the response says the data is stale', async () => {
    await ask('International reserves');
    await screen.findByText(/indicator store did not respond/i);

    expect(screen.getByRole('article')).toHaveAttribute('data-stale', 'true');
    expect(screen.getByText('Stale data')).toBeInTheDocument();
  });

  it('shows a stale freshness chip when the response says so', async () => {
    await ask('International reserves');
    await screen.findByText(/indicator store did not respond/i);

    expect(screen.getByRole('status', { name: /Data freshness: Overdue by/ })).toBeInTheDocument();
  });

  it('completes the original question when a candidate is picked', async () => {
    const user = await ask('What is the inflation rate?');
    await screen.findByText(/Pick one and the question completes/i);

    const before = screen.getAllByRole('heading', { level: 2 }).length;

    await user.click(screen.getByRole('button', { name: /Use Core consumer price inflation/ }));
    await screen.findByText(/Core consumer prices rose 1.6%/i);

    // Same turn resolved in place — no new question was appended.
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(before);
    expect(screen.getByText(/Completed with Core consumer price inflation/)).toBeInTheDocument();
  });

  it('shows an inheritance banner on a follow-up and offers a way out', async () => {
    const user = await ask('What was CPI inflation in April 2026?');
    await screen.findByText(/Consumer prices rose 2.1%/i);

    await user.type(screen.getByLabelText('Your question'), 'and quarterly?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));
    await screen.findByText(/Consumer prices rose 1.8%/i);

    expect(screen.getByText('Carried over from the previous question')).toBeInTheDocument();
    expect(screen.getByText(/frequency → quarterly/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Not this indicator' }));
    expect(await screen.findAllByText(/Pick one and the question completes/i)).not.toHaveLength(0);
  });

  it('states a changed grain in the answer text and in the degradations', async () => {
    const user = await ask('Show total goods exports since 2018');
    await screen.findByText(/Total goods exports were 36.7/i);

    await user.type(screen.getByLabelText('Your question'), 'what about 2022?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    // Once in the answer sentence, once in the degradation's own detail.
    expect(await screen.findAllByText(/Monthly rows are not published for 2022/i)).toHaveLength(2);
    expect(screen.getByText('Grain changed')).toBeInTheDocument();
    expect(screen.getByText('monthly → yearly')).toBeInTheDocument();
  });
});
