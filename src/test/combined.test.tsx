import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from './render';

async function askCombined(question: string) {
  const { user } = renderApp();
  await user.click(screen.getByRole('radio', { name: /Combined/ }));
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

async function askApproved(question: string) {
  const { user } = renderApp();
  await user.type(screen.getByLabelText('Your question'), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

describe('the combined source', () => {
  it('keeps third-party prose in its own panel, never in the approved answer', async () => {
    await askCombined('How did GDP change from Q1 to Q2 2025?');
    await screen.findByText(/Real GDP was 1.3% lower/i);

    // One approved card. The external agent gets a separate panel — and the
    // duplicate external entry the backend still sends in `packages` is dropped.
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('data-provenance', 'approved');

    const panel = screen.getByRole('complementary');
    expect(panel).toHaveAttribute('data-provenance', 'external');
    expect(within(panel).getByText(/Oxford Economics estimates real GDP fell 0.9%/i)).toBeInTheDocument();

    // The disagreement stays visible: -1.3 approved against -0.9 external.
    expect(within(cards[0] as HTMLElement).getByText('−1.3')).toBeInTheDocument();
  });

  it('renders the external caveat above the prose, in both lenses', async () => {
    const user = await askCombined('How did GDP change from Q1 to Q2 2025?');
    await screen.findByText(/Real GDP was 1.3% lower/i);

    const panel = screen.getByRole('complementary');
    const caveat = within(panel).getByText(/Not verified against approved SCEAI data/i);
    const prose = within(panel).getByText(/Oxford Economics estimates real GDP fell/i);

    expect(caveat.compareDocumentPosition(prose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByRole('radio', { name: 'Executive lens' }));
    expect(screen.getByText(/Not verified against approved SCEAI data/i)).toBeInTheDocument();
  });

  it('shows an approved refusal beside an external answer, not instead of it', async () => {
    await askCombined('What is the GDP growth forecast for 2027?');
    await screen.findByText(/is not approved for publication/i);

    expect(screen.getByRole('article')).toHaveAttribute('data-kind', 'refusal');
    expect(screen.getByRole('complementary')).toHaveAttribute('data-outcome', 'success');
    // Once in the prose, once in what the check found beyond the published band.
    expect(screen.getAllByText(/−28.76%/)).toHaveLength(2);
    expect(screen.getByText('Beyond the band')).toBeInTheDocument();
  });

  it('says so when an external agent was asked and failed', async () => {
    await askCombined('International reserves');
    await screen.findByText(/indicator store did not respond/i);

    const panel = screen.getByRole('complementary');
    expect(panel).toHaveAttribute('data-outcome', 'timeout');
    expect(within(panel).getByText('Timed out')).toBeInTheDocument();
    expect(within(panel).getByText(/did not answer within the time allowed/i)).toBeInTheDocument();
    // The caveat holds whatever the outcome.
    expect(within(panel).getByText(/Not verified against approved SCEAI data/i)).toBeInTheDocument();
  });

  it('renders nothing external when no external agent was admitted', async () => {
    await askApproved('How did GDP change from Q1 to Q2 2025?');
    await screen.findByText(/Real GDP was 1.3% lower/i);

    // Absent is not the same state as failed: there is no panel at all.
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('gives a package without evidence rows no evidence affordance', async () => {
    await askCombined('What is the GDP growth forecast for 2027?');
    await screen.findByText(/is not approved for publication/i);

    // A refusal carries no elements at all, so there is nothing to disclose.
    expect(screen.queryByRole('button', { name: /Show published rows/i })).toBeNull();
  });
});
