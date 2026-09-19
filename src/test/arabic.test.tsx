import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { formatNumber, localizeNumerals, splitRuns } from '../i18n/formatNumber';
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
    // Backend text: already Arabic, already localized. splitRuns only marks the
    // Latin run so the line does not reorder around it.
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

describe('the Arabic path', () => {
  it('mirrors the layout and localizes the figures it formats', async () => {
    const { user } = renderApp('ar');

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');

    // The service answers in Arabic when the question is Arabic; the client
    // formats the figures it is given, in Arabic-Indic numerals.
    await user.type(screen.getByLabelText('سؤالك'), 'ما الناتج المحلي الإجمالي الحقيقي؟');
    await user.click(screen.getByRole('button', { name: 'اسأل' }));

    await screen.findByText(/بلغ الناتج المحلي الإجمالي الحقيقي/);
    expect(screen.getByText('١٨٥٫١٧')).toBeInTheDocument();
    expect(screen.getByText('الفترة')).toBeInTheDocument();
  });

  it('switches direction with the language toggle', async () => {
    const { user } = renderApp('en');
    expect(document.documentElement.dir).toBe('ltr');

    await user.click(screen.getByRole('radio', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getAllByText('اسأل الذكاء الاصطناعي').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('اسأل عن مؤشر منشور')).toBeInTheDocument();
  });
});
