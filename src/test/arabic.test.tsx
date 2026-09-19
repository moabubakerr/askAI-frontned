import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { formatNumber, localizeNumerals, splitRuns } from '../i18n/formatNumber';
import { replyDir } from '../api/types';
import { renderApp } from './render';

describe('formatNumber', () => {
  it('leaves English alone apart from the minus sign', () => {
    expect(formatNumber('2.13', 'en')).toBe('2.13');
    expect(formatNumber('-28.76', 'en')).toBe('−28.76');
  });

  it('renders Arabic-Indic numerals with ٫ and ٬', () => {
    expect(formatNumber('2.13', 'ar')).toBe('٢٫١٣');
    expect(formatNumber('186,420', 'ar')).toBe('١٨٦٬٤٢٠');
    expect(formatNumber(36.7, 'ar')).toBe('٣٦٫٧');
    expect(formatNumber('-28.76', 'ar')).toBe('−٢٨٫٧٦');
  });

  it('converts numerals in prose without touching sentence punctuation', () => {
    expect(localizeNumerals('ارتفعت 2.1% في أبريل 2026.', 'ar')).toBe(
      'ارتفعت ٢٫١% في أبريل ٢٠٢٦.',
    );
  });

  it('isolates Latin-script runs inside Arabic prose without touching them', () => {
    const runs = splitRuns('بلغ ٣٦٫٧ QAR bn في ٢٠٢٥', 'ar');

    expect(runs.find((run) => run.ltr)?.text).toBe('QAR bn');
    expect(runs.map((run) => run.text).join('')).toBe('بلغ ٣٦٫٧ QAR bn في ٢٠٢٥');
  });

  it('changes no character of backend prose', () => {
    const sentence = 'ارتفعت أسعار المستهلك ٢٫١% في أبريل ٢٠٢٦.';
    expect(splitRuns(sentence, 'ar').map((run) => run.text).join('')).toBe(sentence);
    expect(splitRuns('Inflation was 2.6 % in April 2026.', 'en')[0]?.text).toBe(
      'Inflation was 2.6 % in April 2026.',
    );
  });
});

describe('direction', () => {
  it('follows the text, not a setting', () => {
    expect(replyDir('بلغ الناتج المحلي الإجمالي الحقيقي')).toBe('rtl');
    expect(replyDir('Real GDP was 185.17')).toBe('ltr');
    expect(replyDir(null)).toBe('ltr');
  });
});

describe('the Arabic path', () => {
  /**
   * There is no language toggle: the reader picks the language by typing, and
   * the service answers in kind. So the interface stays as it is and the
   * *answer* is what flips direction.
   */
  it('answers an Arabic question in Arabic, RTL, with the interface unchanged', async () => {
    const { user } = renderApp();

    expect(document.documentElement.dir).toBe('ltr');

    await user.type(screen.getByLabelText('Your question'), 'ما الناتج المحلي الإجمالي الحقيقي؟');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    const card = await screen.findByRole('article');
    const prose = within(card).getByText(/بلغ الناتج المحلي/);

    expect(prose.closest('[dir="rtl"]')).not.toBeNull();
    // The chrome did not change language or direction.
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('offers no language control', () => {
    renderApp();

    expect(screen.queryByRole('radiogroup', { name: 'Interface language' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'العربية' })).toBeNull();
  });
});
