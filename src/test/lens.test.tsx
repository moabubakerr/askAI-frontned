import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import * as client from '../api/client';
import { renderApp } from './render';

describe('the lens toggle', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-renders what is already in memory and issues no request', async () => {
    const askSpy = vi.spyOn(client, 'ask');
    const { user } = renderApp();

    await user.click(screen.getByRole('button', { name: /CPI inflation in April 2026/i }));
    await screen.findByText(/Consumer prices rose/i);

    const asksAfterQuestion = askSpy.mock.calls.length;
    const fetchesAfterQuestion = vi.mocked(globalThis.fetch).mock.calls.length;
    expect(asksAfterQuestion).toBe(1);

    await user.click(screen.getByRole('radio', { name: 'Executive lens' }));
    await user.click(screen.getByRole('radio', { name: 'Explore data' }));
    await user.click(screen.getByRole('radio', { name: 'Executive lens' }));

    expect(askSpy.mock.calls.length).toBe(asksAfterQuestion);
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(fetchesAfterQuestion);
  });

  it('shows the same figure in both lenses, and the scope line in each', async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole('button', { name: /CPI inflation in April 2026/i }));
    await screen.findByText(/Consumer prices rose/i);

    const explore = screen.getByRole('article');
    expect(within(explore).getByText('2.1')).toBeInTheDocument();
    expect(within(explore).getByText(/monthly · Qatar national · April 2026/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Executive lens' }));

    const executive = screen.getByRole('article');
    expect(within(executive).getByText('2.1')).toBeInTheDocument();
    expect(
      within(executive).getByText(/monthly · Qatar national · April 2026/),
    ).toBeInTheDocument();
  });

  it('keeps absent basis lines in the executive lens', async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole('button', { name: /CPI inflation in April 2026/i }));
    await screen.findByText(/Consumer prices rose/i);

    await user.click(screen.getByRole('radio', { name: 'Executive lens' }));

    await waitFor(() => {
      expect(
        screen.getByText(/No analyst commentary is published for this period/i),
      ).toBeInTheDocument();
    });
    // Explore-only content is gone.
    expect(screen.queryByRole('button', { name: /Show published rows/i })).toBeNull();
  });
});
