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

/**
 * `readable` is true only where the answer holds an actual reading — a value at
 * a period. The service decides it; the client never infers it.
 */
function found(
  answer: string,
  facts: Facts,
  citations: Citation[],
  chart: ChartSpec | null = null,
  verified = true,
  readable = true,
): ChatResponse {
  return {
    answer,
    facts_payload: { ok: true, facts, citations, chart },
    chart,
    verified,
    readable,
  };
}

function missing(message: string, facts?: Facts): ChatResponse {
  return {
    answer: message,
    facts_payload: { ok: false, message, ...(facts ? { facts } : {}), citations: [] },
    chart: null,
    verified: true,
    readable: false,
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

const DEFINITION_TEXT =
  'The increase in the general level of prices of goods and services during a specific period. ' +
  'Inflation is also defined as an impairment in the actual value of money when the general level of prices increases.';

const definition = (): ChatResponse =>
  found(
    // `answer` and `facts.definition` carry the same string now.
    DEFINITION_TEXT + sourcesFooter('Inflation', 'catalog'),
    {
      definition: DEFINITION_TEXT,
      indicator: 'Inflation',
      unit: '%',
    },
    [citation(null, 'catalog')],
    null,
    true,
    // A definition holds no reading, so there is nothing to read out.
    false,
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
    {
      indicator: 'Real GDP',
      series: TREND_ROWS,
      n_points: TREND_ROWS.length,
      unit: 'QAR',
      // Computed server-side, not by the model — safe to show as stat tiles.
      first_period: '2024-Q1',
      first_value: '181.204',
      last_period: '2025-Q4',
      last_value: '185.170',
      highest_period: '2025-Q4',
      highest_value: '185.170',
      lowest_period: '2024-Q1',
      lowest_value: '181.204',
      change_percent: 2.1888,
      absolute_change: 3.966,
    },
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
      extremum: 'highest',
      scanned_points: 8,
      scanned_from: '2024-Q1',
      scanned_to: '2025-Q4',
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
      // The curated headline snapshot, shown as before → after.
      overview_kind: 'macro',
      overview: [
        {
          indicator: 'Real GDP',
          actual: 185.17,
          period_label: '2025-Q4',
          unit: 'QAR bn',
          decimal_places: 1,
          granularity: 'quarterly',
          previous_value: 181.49,
          previous_period: '2024-Q4',
          change_yoy_percent: 2.0277,
          target: null,
          report_as_growth: false,
          asked_as: 'Real GDP',
        },
        {
          // No comparable reading a year back: no movement is known.
          indicator: 'Inflation',
          actual: 2.6162,
          period_label: '2026-04',
          unit: '%',
          decimal_places: 4,
          granularity: 'monthly',
          report_as_growth: false,
        },
        {
          indicator: 'Trade Balance',
          actual: 37.972,
          period_label: '2025-Q4',
          unit: 'QAR bn',
          decimal_places: 3,
          granularity: 'quarterly',
          previous_value: 46.127,
          previous_period: '2024-Q4',
          change_yoy_percent: -17.6797,
          report_as_growth: false,
        },
      ],
      not_found: ['Tourism arrivals'],
      // Internal diagnostics: never rendered, only logged.
      _verifier_rejected_numbers: ['2.0277'],
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

/**
 * An overview with no `overview_kind`: a list of metrics the reader named,
 * which stays compact rather than getting the before → after treatment.
 */
const namedMetrics = (): ChatResponse =>
  found(
    'Real GDP grew 2.03% year on year, and inflation stood at 2.60%.',
    {
      overview: [
        {
          indicator: 'Real GDP',
          unit: 'QAR',
          granularity: 'quarterly',
          period_label: '2025-Q4',
          actual: '185.170',
          change_yoy_percent: 2.0277,
          // Reported as growth, so the change leads and the level follows.
          report_as_growth: true,
        },
        {
          indicator: 'Inflation',
          unit: '%',
          granularity: 'monthly',
          period_label: '2025-12',
          actual: '2.600',
          report_as_growth: false,
        },
      ],
      not_found: ['Tourism arrivals'],
    },
    [citation('Real GDP', '2025-Q4')],
    null,
    true,
    false,
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
    null,
    true,
    false,
  );

const LINE = '\n';
const NAMES = ['Real GDP', 'Nominal GDP', 'GDP per capita'];

const countList = (): ChatResponse =>
  found(
    [
      'There are 3 published indicators in the national accounts sector. All 3 are listed below.',
      '',
      'Sources:',
      ...NAMES.map((name) => `• ${name} — SCAI Approved/Published Data`),
    ].join(LINE),
    { count: NAMES.length, names: NAMES },
    // One citation per name: the sources block would repeat the list.
    NAMES.map((name) => citation(name, '2025')),
    null,
    true,
    false,
  );

/** A group split by direction of travel, year on year. */
const directionSplit = (): ChatResponse =>
  found(
    'Of the 8 National Indicators, 2 rose and 4 fell compared with a year earlier.',
    {
      scope: 'National Indicator',
      scope_kind: 'type',
      comparison: "year-on-year, at each indicator's most recent reading",
      n_increasing: 2,
      n_declining: 4,
      n_total: 8,
      increasing: [
        {
          indicator: 'Real GDP',
          change_yoy_percent: 2.0277,
          actual: 185.17,
          unit: 'QAR bn',
          period_label: '2025-Q4',
          polarity: 'Increase',
        },
        {
          indicator: 'Visitor Arrivals',
          change_yoy_percent: 8.4119,
          actual: 5.2,
          unit: 'million',
          period_label: '2025',
          polarity: 'Increase',
        },
      ],
      declining: [
        {
          indicator: 'Government Revenues',
          change_yoy_percent: -23.4946,
          actual: 37.799,
          unit: 'QAR bn',
          period_label: '2026-Q1',
          polarity: 'Increase',
        },
        {
          indicator: 'Trade Balance',
          change_yoy_percent: -17.6797,
          actual: 37.972,
          unit: 'QAR bn',
          period_label: '2025-Q4',
          polarity: 'Increase',
        },
        {
          // A fall is the welcome direction here.
          indicator: 'Cost per Student',
          change_yoy_percent: -5.1204,
          actual: 84.055,
          unit: 'QAR k',
          period_label: '2025',
          polarity: 'Decrease',
        },
        {
          indicator: 'PISA Rank',
          change_yoy_percent: -2.0408,
          actual: 48,
          unit: 'Rank',
          period_label: '2022',
          polarity: 'Decrease',
        },
      ],
      unchanged: [],
      no_comparison: [
        {
          indicator: 'Inflation',
          reason: 'no year-on-year figure published',
          actual: 2.6162,
          unit: '%',
          period_label: '2026-04',
          polarity: 'Decrease',
        },
        {
          indicator: 'Adult Literacy Rate',
          reason: 'no reading a year earlier',
          actual: 97.8,
          unit: '%',
          period_label: '2024',
          polarity: 'Increase',
        },
      ],
    },
    [citation('Real GDP', '2025-Q4')],
  );

/** Indicators ranked by progress against their own targets. */
const performanceRanking = (): ChatResponse =>
  found(
    'Ranked by how close each is to its target, best first.',
    {
      scope: 'Education Sector',
      scope_kind: 'sector',
      order: 'best_first',
      n_ranked: 3,
      n_total: 5,
      basis: "percent of each indicator's own target attained, with polarity applied",
      ranked_indicators: [
        {
          // Beating a target it is meant to come in *under*: actual/target
          // would call this 95% and rank it last.
          indicator: 'Cost per Student (K-12 Public Schools)',
          attainment_percent: 105.4,
          actual: 84.055,
          unit: 'QAR k',
          period_label: '2025',
          target: 88.6,
          polarity: 'Decrease',
          target_basis: 'period',
          target_year: null,
        },
        {
          indicator: 'PISA Rank',
          attainment_percent: 72.9,
          actual: 48,
          unit: 'Rank',
          period_label: '2022',
          target: 35,
          polarity: 'Decrease',
          target_basis: 'indicator',
          target_year: 2030,
        },
        {
          indicator: 'Teacher–Student Ratio',
          attainment_percent: 88.2,
          actual: 15.1,
          unit: '',
          period_label: '2025',
          target: 17.1,
          polarity: 'Increase',
          target_basis: 'period',
          target_year: null,
        },
      ],
      not_assessable: [
        {
          indicator: 'Graduates from STEM ( Share of All Graduates )',
          reason: 'no reading yet',
          actual: null,
          target: null,
          unit: '%',
          period_label: null,
          polarity: 'Increase',
        },
        {
          indicator: 'Adult Literacy Rate',
          reason: 'no target set',
          actual: 97.8,
          target: null,
          unit: '%',
          period_label: '2024',
          polarity: 'Increase',
        },
      ],
    },
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

/** SCAI's analyst commentary, verbatim. */
const analysisAnswer = (): ChatResponse =>
  found(
    'SCAI analysts published commentary on Real GDP for 2025-Q4.' +
      sourcesFooter('Real GDP', '2025-Q4'),
    {
      indicator: 'Real GDP',
      unit: 'QAR',
      analysis: [
        {
          period_label: '2025-Q4',
          value: '185.170',
          summary: [
            'Activity held its upward path through the quarter.',
            '• Non-hydrocarbon output carried most of the increase.',
            '• Services expanded for a fourth consecutive quarter.',
          ].join('\n'),
          detailed:
            'Quarter-on-quarter growth was concentrated in construction and transport, with manufacturing broadly flat.',
          npc_analysis: 'The reading is consistent with the Council’s published medium-term path.',
          benchmark: 'Above the GCC median for the same quarter.',
        },
      ],
    },
    [citation('Real GDP', '2025-Q4')],
    null,
    true,
    // Commentary is text, not a reading.
    false,
  );

/** Excerpts from SCAI articles. */
const passagesAnswer = (): ChatResponse =>
  found(
    'Three published articles discuss economic diversification.',
    {
      topic: 'economic diversification',
      passage_count: 2,
      passages: [
        {
          article_title: 'Diversification and the non-hydrocarbon economy',
          article_id: 'art-114',
          excerpt:
            'The share of non-hydrocarbon activity has risen steadily since 2018, with services accounting for most of the gain.',
          match: 'economic diversification',
          distance: 0.21,
        },
        {
          article_title: 'Reading the export series',
          article_id: 'art-087',
          excerpt:
            'Concentration in a small number of commodities remains high despite a widening export base.',
          match: 'diversification',
          distance: 0.33,
        },
      ],
    },
    [],
    null,
    true,
    false,
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
  { keywords: ['how many', 'list', 'indicator names', 'كم عدد'], respond: countList },
  { keywords: ['mean', 'definition', 'what is inflation', 'تعريف'], respond: definition },
  { keywords: ['gdp and inflation', 'these metrics', 'هذه المؤشرات'], respond: namedMetrics },
  {
    keywords: ['overview', 'macro', 'economy doing', 'economy growing', 'نظرة عامة'],
    respond: overview,
  },
  // Ahead of the comparison fixtures: "…declining compared with the previous
  // year?" contains "compare", which would otherwise match a country comparison.
  {
    keywords: ['increasing', 'declining', 'rising and which are falling', 'ارتفعت وأيها انخفضت'],
    respond: directionSplit,
  },

  // Order is the disambiguation here: "highest and lowest" is a question about
  // extremes in one series, while "rank" is a question across countries.
  // Not bare 'min'/'max': "best performing" contains "min".
  { keywords: ['highest and lowest', 'maximum', 'minimum', 'أعلى', 'أدنى'], respond: extremes },
  { keywords: ['rank', 'ترتيب'], respond: countryRanking },
  { keywords: ['growth rate', 'grew', 'نمو'], respond: growth },
  // Likewise "against"/"between" compares two periods; "across" compares
  // countries — and both questions start with the word "compare".
  { keywords: ['against', 'between', 'مقارنة بين'], respond: comparison },
  { keywords: ['across', 'compare', 'versus', ' vs ', 'قارن'], respond: countryComparison },
  { keywords: ['best performing', 'performance', 'ranked by target', 'الأفضل أداءً'], respond: performanceRanking },
  { keywords: ['commentary', 'analyst', 'تعليق'], respond: analysisAnswer },
  { keywords: ['article', 'diversification', 'مقال'], respond: passagesAnswer },
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
        // The chips come from here, not from the message text: the service is
        // holding exactly these strings.
        { candidates: ['Real GDP', 'Debt to GDP Ratio', 'GDP Growth Demo'] },
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
      period_label: '2019-Q1',
      period_human: 'the first quarter of 2019',
      // The text below discusses Q4 2024, not Q1 2019.
      period_mismatch: true,
      summary: 'Real GDP grew by 6.1% YoY in Q4 2024.',
    },
    {
      period_label: '2025-Q4',
      period_human: 'the fourth quarter of 2025',
      period_mismatch: false,
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
  // The service sometimes repeats the narration here word for word.
  one_liner: 'The series moves within a narrow band, with no quarter falling below 181.',
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
