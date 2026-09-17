import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from './render';

async function ask(question: string) {
  const { user } = renderApp();
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

describe('the chart', () => {
  it('offers only the views the backend declared', async () => {
    await ask('How did GDP change from Q1 to Q2 2025?');
    await screen.findByText(/Real GDP was 1.3% lower/i);

    const group = screen.getByRole('radiogroup', { name: 'Chart view' });
    const options = within(group)
      .getAllByRole('radio')
      .map((node) => node.textContent);

    // chartable declares bar + table for a two-point comparison. No line view.
    expect(options).toEqual(['Bar', 'Table']);
  });

  it('starts on the declared default view and switches within it', async () => {
    const user = await ask('What was CPI inflation in April 2026?');
    await screen.findByText(/Consumer prices rose/i);

    const group = screen.getByRole('radiogroup', { name: 'Chart view' });
    expect(within(group).getByRole('radio', { name: 'Line' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(within(group).getByRole('radio', { name: 'Table' }));

    const chart = screen.getByRole('figure');
    expect(within(chart).getByRole('columnheader', { name: /Period/ })).toBeInTheDocument();
    expect(within(chart).getByRole('cell', { name: '2026-04' })).toBeInTheDocument();
  });

  it('shows no chart affordance when the backend declares none', async () => {
    await ask('Did inflation exceed 3% in 2025?');
    await screen.findByText(/below the 3% threshold/i);

    expect(screen.queryByRole('radiogroup', { name: 'Chart view' })).toBeNull();
  });
});
