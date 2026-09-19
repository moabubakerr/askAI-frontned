/**
 * Sample data, deliberately small: enough to reach every state the UI can show,
 * and no more. The service replaces this wholesale — see `client.ts`.
 *
 * This file stands in for the service, so it answers the way the service does:
 * prose with its own `Sources:` footer, figures as **strings**, HTTP-200-shaped
 * "no data", and a `facts` object with no type discriminator.
 *
 * Nothing outside `src/api/` imports this file.
 */

import type {
  ChartSpec,
  ChatRequest,
  ChatResponse,
  Citation,
  Facts,
  ReadResponse,
  SessionState,
} from './types';

const SOURCE = 'National Planning Council';

function citation(indicator: string | null, period: string, vetted = true): Citation {
  return {
    indicator,
    data_source: SOURCE,
    table: vetted ? 'published_data_points' : 'indicator_values',
    record_id: '1125d985-1723-4e56-54a8-08dea2389ab2',
    period_label: period,
    country: 'Qatar',
  };
}

function sourcesFooter(indicator: string, period: string): string {
  return `\n\nSources:\n• ${indicator} — SCAI Approved/Published Data — original source: ${SOURCE} — ${period}`;
}

function found(
  answer: string,
  facts: Facts,
  citations: Citation[],
  chart: ChartSpec | null = null,
  verified = true,
): ChatResponse {
  return {
    answer,
    facts_payload: { ok: true, facts, citations, chart },
    chart,
    verified,
  };
}

function missing(message: string): ChatResponse {
  return {
    answer: message,
    facts_payload: { ok: false, message, citations: [] },
    chart: null,
    verified: true,
  };
}

/* ------------------------------------------------------------------ */
/* one fixture per facts shape                                          */
/* ------------------------------------------------------------------ */

const latestValue = (): ChatResponse =>
  found(
    'The actual Real GDP of Qatar for the period 2025-Q4 was 185.17 QAR billion, against a target of 190.00.' +
      sourcesFooter('Real GDP', '2025-Q4'),
    { indicator: 'Real GDP', period_label: '2025-Q4', actual: '185.17', target: '190.00', unit: 'QAR' },
    [citation('Real GDP', '2025-Q4')],
  );

const definition = (): ChatResponse =>
  found(
    'Inflation is the increase in the general level of prices of goods and services during a specific period.' +
      sourcesFooter('Inflation', 'catalog'),
    {
      definition:
        'The increase in the general level of prices of goods and services during a specific period. Inflation is also defined as an impairment in the actual value of money when the general level of prices increases.',
      indicator: 'Inflation',
      unit: '%',
    },
    [citation(null, 'catalog')],
  );

const TREND_ROWS = [
  { period_label: '2024-Q1', actual: '181.204' },
  { period_label: '2024-Q2', actual: '182.870' },
  { period_label: '2024-Q3', actual: '181.996' },
  { period_label: '2024-Q4', actual: '183.631' },
  { period_label: '2025-Q1', actual: '183.631' },
  { period_label: '2025-Q2', actual: '184.402' },
  { period_label: '2025-Q3', actual: '184.905' },
  { period_label: '2025-Q4', actual: '185.170' },
];

const trend = (): ChatResponse => {
  const chart: ChartSpec = {
    chart_type: 'line',
    title: 'Real GDP',
    unit: 'QAR',
    decimal_places: 2,
    x_field: 'period_label',
    y_field: 'actual',
    data: TREND_ROWS,
  };
  return found(
    'Real GDP rose from 181.20 QAR billion in 2024-Q1 to 185.17 in 2025-Q4, across eight published quarters.' +
      sourcesFooter('Real GDP', '2024-Q1 → 2025-Q4'),
    { indicator: 'Real GDP', series: TREND_ROWS, n_points: TREND_ROWS.length, unit: 'QAR' },
    [citation('Real GDP', '2025-Q4')],
    chart,
  );
};

const extremes = (): ChatResponse =>
  found(
    'Real GDP was highest in 2025-Q4 at 185.17 and lowest in 2024-Q1 at 181.20 — a difference of 3.97.' +
      sourcesFooter('Real GDP', '2024-Q1 → 2025-Q4'),
    {
      indicator: 'Real GDP',
      high_period: '2025-Q4',
      high_value: '185.170',
      low_period: '2024-Q1',
      low_value: '181.204',
      absolute_difference: '3.966',
      unit: 'QAR',
    },
    [citation('Real GDP', '2025-Q4')],
  );

const comparison = (): ChatResponse =>
  found(
    'Real GDP was 183.63 in 2025-Q1 and 185.17 in 2025-Q4, an increase of 1.54 (0.84%).' +
      sourcesFooter('Real GDP', '2025-Q1 vs 2025-Q4'),
    {
      indicator: 'Real GDP',
      period_a: '2025-Q1',
      value_a: '183.631',
      period_b: '2025-Q4',
      value_b: '185.170',
      absolute_change: '1.539',
      percent_change: '0.838',
      unit: 'QAR',
    },
    [citation('Real GDP', '2025-Q4')],
  );

const growth = (): ChatResponse =>
  found(
    'Real GDP grew 2.19% between 2024-Q1 and 2025-Q4, measured as total growth over the period.' +
      sourcesFooter('Real GDP', '2024-Q1 → 2025-Q4'),
    {
      indicator: 'Real GDP',
      period_start: '2024-Q1',
      value_start: '181.204',
      period_end: '2025-Q4',
      value_end: '185.170',
      method: 'total growth over period',
      growth_rate_percent: '2.189',
      unit: 'QAR',
    },
    [citation('Real GDP', '2025-Q4')],
  );

const countryComparison = (): ChatResponse => {
  const rows = [
    { country: 'Qatar', period_label: '2025-Q4', actual: '185.170' },
    { country: 'Saudi Arabia', period_label: '2025-Q4', actual: '1102.400' },
  ];
  const chart: ChartSpec = {
    chart_type: 'bar',
    title: 'Real GDP by country',
    unit: 'QAR',
    decimal_places: 2,
    x_field: 'country',
    y_field: 'actual',
    data: rows,
    missing_countries: ['Kuwait', 'Oman'],
  };
  return found(
    'Real GDP for 2025-Q4 was 185.17 in Qatar and 1,102.40 in Saudi Arabia.' +
      sourcesFooter('Real GDP', '2025-Q4'),
    {
      indicator: 'Real GDP',
      rows,
      countries_with_no_data: ['Kuwait', 'Oman'],
      unit: 'QAR',
      // A caveat on how the figures compare — part of reading them correctly.
      note: 'Compared at 2025-Q4, the most recent period all of these countries report.',
    },
    [citation('Real GDP', '2025-Q4')],
    chart,
  );
};

const countryRanking = (): ChatResponse =>
  found(
    'For 2025-Q4, Saudi Arabia ranks above Qatar on Real GDP.' + sourcesFooter('Real GDP', '2025-Q4'),
    {
      indicator: 'Real GDP',
      ranked: [
        { country: 'Saudi Arabia', period_label: '2025-Q4', actual: '1102.400' },
        { country: 'Qatar', period_label: '2025-Q4', actual: '185.170' },
      ],
      countries_with_no_data: ['Bahrain'],
      period_used: '2025-Q4',
      unit: 'QAR',
    },
    [citation('Real GDP', '2025-Q4')],
  );

const overview = (): ChatResponse =>
  found(
    'Across the approved dataset, Real GDP stands at 185.17 QAR billion, inflation at 2.60% and population at 3.10 million.' +
      sourcesFooter('Macro overview', '2025-Q4'),
    {
      overview: [
        { indicator: 'Real GDP', period_label: '2025-Q4', actual: '185.170', unit: 'QAR' },
        { indicator: 'Inflation', period_label: '2025-Q4', actual: '2.600', unit: '%' },
        { indicator: 'Population', period_label: '2025', actual: '3.100', unit: 'million' },
      ],
    },
    [citation('Real GDP', '2025-Q4'), citation('Inflation', '2025-Q4', false)],
    {
      chart_type: 'bar',
      title: 'Macro overview',
      unit: null,
      decimal_places: 2,
      x_field: 'indicator',
      y_field: 'actual',
      data: [
        { indicator: 'Real GDP', actual: '185.170' },
        { indicator: 'Inflation', actual: '2.600' },
        { indicator: 'Population', actual: '3.100' },
      ],
      note: 'Units differ per bar; these are not on a shared scale.',
    },
  );

const capability = (): ChatResponse =>
  found(
    'I answer questions about 42 published indicators across the national accounts, prices, population and labour sectors.',
    {
      published_indicator_count: 42,
      sectors_covered: ['National accounts', 'Prices', 'Population', 'Labour'],
      capability_note:
        'I report approved published values, definitions, trends and comparisons. Forecasts are out of scope.',
    },
    [],
  );

const countList = (): ChatResponse =>
  found(
    'There are 3 published indicators in the national accounts sector: Real GDP, Nominal GDP and GDP per capita.',
    { count: 3, names: ['Real GDP', 'Nominal GDP', 'GDP per capita'] },
    [],
  );

const periodRanking = (): ChatResponse =>
  found(
    'The three strongest quarters for Real GDP were 2025-Q4, 2025-Q3 and 2025-Q2.' +
      sourcesFooter('Real GDP', '2024-Q1 → 2025-Q4'),
    {
      indicator: 'Real GDP',
      ranked_periods: [
        { period_label: '2025-Q4', actual: '185.170' },
        { period_label: '2025-Q3', actual: '184.905' },
        { period_label: '2025-Q2', actual: '184.402' },
      ],
      order: 'descending',
      n_points: 8,
      unit: 'QAR',
    },
    [citation('Real GDP', '2025-Q4')],
  );

/** The service matched loosely and says so at the end of the prose. */
const approximateMatch = (): ChatResponse =>
  found(
    'Annual Growth in Labor Productivity was 1.42% in 2022.' +
      sourcesFooter('Annual Growth in Labor Productivity', '2022') +
      '\n\nI matched your question to Annual Growth in Labor Productivity (approximate match)',
    {
      indicator: 'Annual Growth in Labor Productivity',
      period_label: '2022',
      actual: '1.42',
      target: null,
      unit: '%',
    },
    [citation('Annual Growth in Labor Productivity', '2022')],
  );

/** The verifier rejected the model's phrasing, so the prose is a template. */
const unverified = (): ChatResponse =>
  found(
    'Real GDP, 2025-Q4: 185.17 QAR.' + sourcesFooter('Real GDP', '2025-Q4'),
    { indicator: 'Real GDP', period_label: '2025-Q4', actual: '185.17', target: null, unit: 'QAR' },
    [citation('Real GDP', '2025-Q4')],
    null,
    false,
  );

const arabicAnswer = (): ChatResponse =>
  found(
    'بلغ الناتج المحلي الإجمالي الحقيقي لقطر في الربع الرابع من 2025 نحو 185.17 مليار ريال قطري.' +
      '\n\nالمصادر:\n• الناتج المحلي الإجمالي الحقيقي — بيانات معتمدة — 2025-Q4',
    {
      indicator: 'الناتج المحلي الإجمالي الحقيقي',
      period_label: '2025-Q4',
      actual: '185.17',
      target: null,
      unit: 'QAR',
    },
    [citation('الناتج المحلي الإجمالي الحقيقي', '2025-Q4')],
  );

/* ------------------------------------------------------------------ */
/* the fixture table                                                    */
/* ------------------------------------------------------------------ */

interface Fixture {
  keywords: string[];
  respond: () => ChatResponse;
}

const FIXTURES: Fixture[] = [
  { keywords: ['what can you', 'capabilit', 'ماذا يمكنك'], respond: capability },
  { keywords: ['how many', 'list', 'كم عدد'], respond: countList },
  { keywords: ['mean', 'definition', 'what is inflation', 'تعريف'], respond: definition },
  { keywords: ['overview', 'macro', 'نظرة عامة'], respond: overview },
  // Order is the disambiguation here: "highest and lowest" is a question about
  // extremes in one series, while "rank" is a question across countries.
  { keywords: ['highest and lowest', 'max', 'min', 'أعلى', 'أدنى'], respond: extremes },
  { keywords: ['rank', 'ترتيب'], respond: countryRanking },
  { keywords: ['growth rate', 'grew', 'نمو'], respond: growth },
  // Likewise "against"/"between" compares two periods; "across" compares
  // countries — and both questions start with the word "compare".
  { keywords: ['against', 'between', 'مقارنة بين'], respond: comparison },
  { keywords: ['across', 'compare', 'versus', ' vs ', 'قارن'], respond: countryComparison },
  { keywords: ['best quarters', 'strongest', 'top periods', 'أفضل الفترات'], respond: periodRanking },
  { keywords: ['productivity', 'إنتاجية'], respond: approximateMatch },
  { keywords: ['trend', 'each quarter', 'over time', 'chart', 'اتجاه'], respond: trend },
  { keywords: ['blunt', 'unverified'], respond: unverified },
  { keywords: ['بالعربية', 'الناتج المحلي'], respond: arabicAnswer },
  { keywords: ['latest', 'real gdp', 'value'], respond: latestValue },
  {
    keywords: ['gdp forecast', 'forecast', 'توقع'],
    respond: () =>
      missing(
        '"GDP forecast" could match more than one indicator: "GDP", "GDP Growth Demo", "Real GDP". Which one did you mean?',
      ),
  },
  {
    keywords: ['gdp growth demo'],
    respond: () => missing('"GDP Growth Demo" has no data points in the approved dataset.'),
  },
];

const FALLBACK = (): ChatResponse =>
  missing('I could not match that to a published indicator in the approved dataset.');

/* ------------------------------------------------------------------ */
/* POST /read                                                          */
/* ------------------------------------------------------------------ */

const READ_WITH_HEADLINE: ReadResponse = {
  headline: {
    value: '185.17',
    unit: 'QAR',
    indicator: 'Real GDP',
    period_label: '2025-Q4',
    period_human: 'the fourth quarter of 2025',
  },
  one_liner: 'Real GDP reached 185.17 QAR billion in the fourth quarter of 2025.',
  council_analysis: [
    {
      period_label: '2025-Q4',
      period_human: 'the fourth quarter of 2025',
      summary: [
        'Growth held steady through the quarter.',
        '• Non-hydrocarbon activity carried most of the increase.',
        '• Construction and services both expanded against the previous quarter.',
        '• The hydrocarbon component was broadly flat.',
      ].join('\n'),
    },
  ],
  evidence: [
    { period_label: '2025-Q3', actual: '184.905', unit: 'QAR', indicator: 'Real GDP' },
    { period_label: '2025-Q4', actual: '185.170', unit: 'QAR', indicator: 'Real GDP' },
  ],
  narration:
    'The quarter continued a gradual upward path, with each of the last four quarters higher than the one before it.',
  disclaimer: 'Generated from the readings above — not Council analysis.',
};

/** Trends and rankings have no single figure, so `headline` is null. */
const READ_WITHOUT_HEADLINE: ReadResponse = {
  headline: null,
  one_liner: 'Real GDP rose across the eight published quarters.',
  council_analysis: [],
  evidence: TREND_ROWS.map((row) => ({ ...row, unit: 'QAR', indicator: 'Real GDP' })),
  narration: 'The series moves within a narrow band, with no quarter falling below 181.',
  disclaimer: 'Generated from the readings above — not Council analysis.',
};

export function resolveReadFixture(req: ChatRequest): ReadResponse {
  const q = req.message.toLowerCase();
  const trendish = ['trend', 'over time', 'each quarter', 'rank', 'compare'].some((k) =>
    q.includes(k),
  );
  return trendish ? READ_WITHOUT_HEADLINE : READ_WITH_HEADLINE;
}

/** What the server would remember for this session. For the debug panel. */
export function fixtureSession(sessionId: string): SessionState {
  return {
    session_id: sessionId,
    last_indicator: 'Real GDP',
    last_period: '2025-Q4',
    turns: 1,
  };
}

/** Resolve a request against the sample data. */
export function resolveFixture(req: ChatRequest): ChatResponse {
  const q = req.message.toLowerCase();
  for (const fixture of FIXTURES) {
    if (fixture.keywords.some((k) => q.includes(k))) return fixture.respond();
  }
  return FALLBACK();
}
