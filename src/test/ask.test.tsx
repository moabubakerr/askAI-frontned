import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import * as client from '../api/client';
import { renderApp } from './render';

async function askBoth(question: string, option = 'Both') {
  const { user } = renderApp();
  await user.click(screen.getByRole('radio', { name: option }));
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

afterEach(() => vi.restoreAllMocks());

describe('asking two houses', () => {
  it('renders two panels and never merges them', async () => {
    await askBoth('What was GDP growth in 2024?');
    const panels = await screen.findAllByRole('article');

    expect(panels).toHaveLength(2);
    expect(panels[0]).toHaveAttribute('data-source', 'scai');
    expect(panels[1]).toHaveAttribute('data-source', 'oxford');

    // The disagreement is the point: both figures stand.
    expect(within(panels[1] as HTMLElement).getAllByText(/2\.4/).length).toBeGreaterThan(0);
  });

  it('says which answer carries the guarantee', async () => {
    await askBoth('What was GDP growth in 2024?');
    const panels = await screen.findAllByRole('article');

    expect(within(panels[0] as HTMLElement).getByText('Figures checked')).toBeInTheDocument();
    expect(within(panels[1] as HTMLElement).queryByText('Figures checked')).toBeNull();
    expect(
      within(panels[1] as HTMLElement).getByText(/not verified against SCAI data/i),
    ).toBeInTheDocument();
  });

  it('renders Oxford tables rather than pipe soup', async () => {
    await askBoth('What was GDP growth in 2024?');
    const panels = await screen.findAllByRole('article');

    const table = within(panels[1] as HTMLElement).getByRole('table');
    expect(within(table).getByRole('cell', { name: '2.4' })).toBeInTheDocument();
  });

  it('keeps the half that worked when the other fails', async () => {
    await askBoth('What was GDP growth in 1990?');
    const panels = await screen.findAllByRole('article');

    expect(panels).toHaveLength(2);
    expect(panels[1]).toHaveAttribute('data-ok', 'false');
    expect(
      within(panels[1] as HTMLElement).getByText(/No series matching that request/),
    ).toBeInTheDocument();
    // The SCAI answer is untouched by its neighbour failing.
    expect(panels[0]).toHaveAttribute('data-ok', 'true');
  });

  it('rates each house separately', async () => {
    const spy = vi.spyOn(client, 'sendFeedback');
    const user = await askBoth('What was GDP growth in 2024?');
    const panels = await screen.findAllByRole('article');

    await user.click(
      within(panels[1] as HTMLElement).getByRole('radio', { name: 'Rate 4 out of 5' }),
    );
    await within(panels[1] as HTMLElement).findByText(/your rating was recorded/i);

    // The Oxford id, not the response's top-level one.
    expect(spy.mock.calls[0]?.[0]?.message_id).toMatch(/^ox_/);
    // The SCAI panel is still unrated.
    expect(
      within(panels[0] as HTMLElement).getByRole('radio', { name: 'Rate 4 out of 5' }),
    ).toBeInTheDocument();
  });
});

describe('sending a question outside', () => {
  it('starts on the premises and says nothing about egress', () => {
    renderApp();

    expect(screen.getByRole('radio', { name: 'SCAI' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText(/sent to Oxford Economics/)).toBeNull();
  });

  it('warns while an outside source is selected, not just on the click', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('radio', { name: 'Both' }));

    // It applies to every question asked under it, so it stays on screen.
    expect(screen.getByText(/sent to Oxford Economics/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'SCAI' }));
    expect(screen.queryByText(/sent to Oxford Economics/)).toBeNull();
  });

  it('stops offering Oxford when the deployment cannot reach it', async () => {
    vi.spyOn(client, 'ask').mockRejectedValue(
      new client.SourceUnavailable('Oxford Economics is not configured on this deployment.'),
    );

    const user = await askBoth('What was GDP growth in 2024?');
    await screen.findByText(/not configured on this deployment/);

    // The option is withdrawn rather than left to fail again.
    expect(screen.queryByRole('radio', { name: 'Both' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'SCAI' })).toHaveAttribute('aria-checked', 'true');
    expect(user).toBeTruthy();
  });
});
