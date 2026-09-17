/**
 * Sample data, deliberately small: enough to reach every state the UI can show,
 * and no more. The Python service replaces this wholesale — see `client.ts`.
 *
 * This file stands in for the backend, so it does the backend's job: every
 * sentence is fully composed here, in the requested language, with the numerals
 * the reader should see. Nothing downstream re-formats a figure.
 *
 * Nothing outside `src/api/` imports this file.
 */

import { localizeNumerals } from '../i18n/formatNumber';
import type {
  AnswerElement,
  AnswerPackage,
  AnswerSpec,
  AskRequest,
  AskResponse,
  Candidate,
  Chartable,
  ExternalBlock,
  Freshness,
  Inheritance,
  Lang,
  RefusalCode,
  SeriesPoint,
  SourceSel,
} from './types';

/* ------------------------------------------------------------------ */
/* bilingual helpers                                                    */
/* ------------------------------------------------------------------ */

interface L {
  en: string;
  ar: string;
}
const t = (en: string, ar: string): L => ({ en, ar });

/**
 * Composes a sentence the way the service does: Arabic gets Arabic-Indic
 * numerals, both languages get a typographic minus. Row references are
 * identifiers and never pass through here.
 */
const s = (l: L, lang: Lang): string => localizeNumerals(l[lang], lang);

const TODAY = '2026-09-17';

const FRESH: Freshness = {
  refreshed_at: '2026-09-16T05:30:00Z',
  stale: false,
  age_seconds: 71.35,
};
const OVERDUE: Freshness = {
  refreshed_at: '2026-09-14T06:00:00Z',
  stale: true,
  age_seconds: 253_800,
};

const PSA = t('Planning and Statistics Authority', 'جهاز التخطيط والإحصاء');

const AGENT_APPROVED = t(
  'Answered from the approved published data.',
  'تمت الإجابة من البيانات المنشورة المعتمدة.',
);
const AGENT_EXTERNAL = t(
  'Oxford Economics was asked as a third-party agent.',
  'سُئلت أوكسفورد إيكونوميكس بوصفها وكيلًا خارجيًا.',
);

const NOT_VERIFIED = t(
  'Not verified against approved SCEAI data.',
  'غير مُتحقَّق منه مقابل بيانات المجلس المعتمدة.',
);

/* ------------------------------------------------------------------ */
/* spec + element shorthands                                            */
/* ------------------------------------------------------------------ */

interface SpecInput {
  detail: string | { unbound: string };
  /** Omitted for a deferred ("latest") period. */
  exact?: string;
  resolved?: string | null;
  country?: AnswerSpec['country_scope']['bound'];
  countries?: string[];
  measure?: string;
  operation?: string;
  boundBy?: Record<string, string>;
}

const spec = (input: SpecInput): AnswerSpec => ({
  spec_version: 1,
  today: TODAY,
  detail_id: typeof input.detail === 'string' ? { bound: input.detail } : input.detail,
  period: input.exact ? { bound: { exact: input.exact } } : { deferred: { latest: true } },
  country_scope: { bound: input.country ?? 'national' },
  measure: { bound: input.measure ?? 'actual' },
  operation: { bound: input.operation ?? 'value' },
  bound_by: {
    detail: 'named-in-question',
    period: input.exact ? 'named-in-question' : 'rule-default',
    country_scope: 'rule-default',
    measure: 'rule-default',
    operation: 'rule-default',
    ...input.boundBy,
  },
  resolved_period: input.resolved ?? input.exact ?? null,
  ...(input.countries ? { countries: input.countries } : {}),
});

/** 'detail|period|country|source' — country empty means national. */
const ref = (detail: string, period: string, source: string, country = ''): string =>
  `${detail}|${period}|${country}|${source}`;

const NO_CHART: Chartable = { available: false, default_view: null, alternate_views: [] };

const scopeEl = (
  lang: Lang,
  text: L,
  sourceRef: string,
  cls: AnswerElement['class'] = 'derived',
): AnswerElement => ({
  class: cls,
  role: 'scope',
  text: s(text, lang),
  source_ref: sourceRef,
});

const noteEl = (
  lang: Lang,
  cls: AnswerElement['class'],
  text: L,
  sourceRef: string,
  publisher?: L,
): AnswerElement => ({
  class: cls,
  role: 'note',
  text: s(text, lang),
  source_ref: sourceRef,
  ...(publisher ? { publisher: s(publisher, lang) } : {}),
});

const evidenceEl = (
  lang: Lang,
  indicator: L,
  period: string,
  value: string,
  unit: string,
  sourceRef: string,
  publisher: L = PSA,
): AnswerElement => ({
  class: 'measured',
  role: 'evidence',
  text: s(indicator, lang),
  source_ref: sourceRef,
  period,
  value,
  unit,
  publisher: s(publisher, lang),
});

const seriesEl = (
  points: SeriesPoint[],
  unit: string,
  label: L,
  lang: Lang,
  sourceRef: string,
): AnswerElement => ({
  class: 'measured',
  role: 'series',
  text: s(label, lang),
  source_ref: sourceRef,
  unit,
  series: points,
});

/** A refusal carries no elements: the sentence is the whole answer. */
const refusal = (
  lang: Lang,
  code: RefusalCode,
  reasonId: string,
  reason: L,
  specInput: SpecInput,
  suggestions?: AnswerPackage['suggestions'],
): AnswerPackage => ({
  kind: 'refusal',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec(specInput),
  elements: [],
  chartable: NO_CHART,
  caveat: null,
  reason: s(reason, lang),
  reason_id: reasonId,
  refusal_code: code,
  degradations: [],
  ...(suggestions ? { suggestions } : {}),
});

/* ------------------------------------------------------------------ */
/* 1 — clarification: "inflation" means four published things           */
/* ------------------------------------------------------------------ */

const CPI_NAME = t('Consumer price inflation', 'تضخم أسعار المستهلك');
const CPI_CORE_NAME = t('Core consumer price inflation', 'التضخم الأساسي لأسعار المستهلك');

const candidates = (lang: Lang): Candidate[] => [
  {
    detail_id: 'CPI.HEADLINE.M',
    name: s(CPI_NAME, lang),
    scope: s(t('monthly · Qatar national · April 2026', 'شهري · قطر الوطني · أبريل 2026'), lang),
    latest: {
      value: s(t('2.1', '2.1'), lang),
      unit: '%',
      period: s(t('April 2026', 'أبريل 2026'), lang),
    },
  },
  {
    detail_id: 'CPI.HEADLINE.Q',
    name: s(CPI_NAME, lang),
    scope: s(t('quarterly · Qatar national · 2026-Q1', 'ربع سنوي · قطر الوطني · 2026-Q1'), lang),
    latest: { value: s(t('1.8', '1.8'), lang), unit: '%', period: s(t('2026-Q1', '2026-Q1'), lang) },
  },
  {
    detail_id: 'CPI.HEADLINE.Y',
    name: s(CPI_NAME, lang),
    scope: s(t('yearly · Qatar national · 2025', 'سنوي · قطر الوطني · 2025'), lang),
    latest: { value: s(t('2.4', '2.4'), lang), unit: '%', period: s(t('2025', '2025'), lang) },
  },
  {
    detail_id: 'CPI.CORE.M',
    name: s(CPI_CORE_NAME, lang),
    scope: s(t('monthly · Qatar national · April 2026', 'شهري · قطر الوطني · أبريل 2026'), lang),
    latest: {
      value: s(t('1.6', '1.6'), lang),
      unit: '%',
      period: s(t('April 2026', 'أبريل 2026'), lang),
    },
  },
];

const clarificationInflation = (lang: Lang): AnswerPackage => ({
  kind: 'clarification',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec({
    detail: { unbound: 'ambiguous-detail: inflation' },
    resolved: '2026-04',
    boundBy: { detail: 'reader' },
  }),
  elements: [],
  chartable: NO_CHART,
  caveat: null,
  reason: s(
    t(
      '“Inflation” matches four published indicators. Each publishes a different true figure, so I need to know which one the question meant.',
      '«التضخم» يطابق أربعة مؤشرات منشورة. كل منها ينشر رقمًا صحيحًا مختلفًا، لذا أحتاج إلى معرفة أيها تقصده المسألة.',
    ),
    lang,
  ),
  reason_id: 'clarification.ambiguous_indicator',
  candidates: candidates(lang),
  degradations: [],
});

/* ------------------------------------------------------------------ */
/* 2 — CPI answers (one per candidate)                                  */
/* ------------------------------------------------------------------ */

type CpiVariant = 'CPI.HEADLINE.M' | 'CPI.HEADLINE.Q' | 'CPI.HEADLINE.Y' | 'CPI.CORE.M';

interface CpiShape {
  period: string;
  /** "now" questions defer the period; the service reports what it resolved to. */
  deferred: boolean;
  scope: L;
  headline: string;
  sentence: L;
  delta: { value: string; text: L } | null;
  evidenceValue: string;
  row: string;
  indicator: L;
  series: SeriesPoint[] | null;
  seriesLabel: L;
}

const CPI_SHAPES: Record<CpiVariant, CpiShape> = {
  'CPI.HEADLINE.M': {
    period: '2026-04',
    deferred: true,
    scope: t('monthly · Qatar national · April 2026', 'شهري · قطر الوطني · أبريل 2026'),
    headline: '2.1',
    sentence: t(
      'Consumer prices rose 2.1% year on year in April 2026.',
      'ارتفعت أسعار المستهلك 2.1% على أساس سنوي في أبريل 2026.',
    ),
    delta: {
      value: '+0.2',
      text: t('+0.2 pp against March 2026', '+0.2 نقطة مئوية مقارنة بمارس 2026'),
    },
    evidenceValue: '2.13',
    row: 'PSA/CPI/2026-04/R0142',
    indicator: t(
      'Consumer price index, year-on-year change',
      'الرقم القياسي لأسعار المستهلك، التغير السنوي',
    ),
    series: [
      { label: '2025-11', value: 1.7 },
      { label: '2025-12', value: 1.8 },
      { label: '2026-01', value: 1.9 },
      { label: '2026-02', value: 2.0 },
      { label: '2026-03', value: 1.9 },
      { label: '2026-04', value: 2.1 },
    ],
    seriesLabel: t('Monthly, year-on-year change', 'شهري، التغير السنوي'),
  },
  'CPI.HEADLINE.Q': {
    period: '2026-Q1',
    deferred: false,
    scope: t('quarterly · Qatar national · 2026-Q1', 'ربع سنوي · قطر الوطني · 2026-Q1'),
    headline: '1.8',
    sentence: t(
      'Consumer prices rose 1.8% year on year in 2026-Q1.',
      'ارتفعت أسعار المستهلك 1.8% على أساس سنوي في 2026-Q1.',
    ),
    delta: {
      value: '+0.1',
      text: t('+0.1 pp against 2025-Q4', '+0.1 نقطة مئوية مقارنة بـ 2025-Q4'),
    },
    evidenceValue: '1.84',
    row: 'PSA/CPI/2026-Q1/R0139',
    indicator: t(
      'Consumer price index, year-on-year change',
      'الرقم القياسي لأسعار المستهلك، التغير السنوي',
    ),
    series: [
      { label: '2025-Q2', value: 1.5 },
      { label: '2025-Q3', value: 1.6 },
      { label: '2025-Q4', value: 1.7 },
      { label: '2026-Q1', value: 1.8 },
    ],
    seriesLabel: t('Quarterly, year-on-year change', 'ربع سنوي، التغير السنوي'),
  },
  'CPI.HEADLINE.Y': {
    period: '2025',
    deferred: false,
    scope: t('yearly · Qatar national · 2025', 'سنوي · قطر الوطني · 2025'),
    headline: '2.4',
    sentence: t('Consumer prices rose 2.4% over 2025.', 'ارتفعت أسعار المستهلك 2.4% خلال 2025.'),
    delta: {
      value: '+1.0',
      text: t('+1.0 pp against 2024', '+1.0 نقطة مئوية مقارنة بـ 2024'),
    },
    evidenceValue: '2.37',
    row: 'PSA/CPI/2025/R0121',
    indicator: t(
      'Consumer price index, year-on-year change',
      'الرقم القياسي لأسعار المستهلك، التغير السنوي',
    ),
    series: [
      { label: '2021', value: 2.3 },
      { label: '2022', value: 5.0 },
      { label: '2023', value: 3.1 },
      { label: '2024', value: 1.4 },
      { label: '2025', value: 2.4 },
    ],
    seriesLabel: t('Yearly, year-on-year change', 'سنوي، التغير السنوي'),
  },
  'CPI.CORE.M': {
    period: '2026-04',
    deferred: true,
    scope: t('monthly · Qatar national · April 2026', 'شهري · قطر الوطني · أبريل 2026'),
    headline: '1.6',
    sentence: t(
      'Core consumer prices rose 1.6% year on year in April 2026.',
      'ارتفعت الأسعار الأساسية للمستهلك 1.6% على أساس سنوي في أبريل 2026.',
    ),
    delta: null,
    evidenceValue: '1.62',
    row: 'PSA/CPI/CORE/2026-04/R0143',
    indicator: t(
      'Core consumer price index, year-on-year change',
      'الرقم القياسي الأساسي لأسعار المستهلك، التغير السنوي',
    ),
    series: null,
    seriesLabel: t('Core, monthly', 'الأساسي، شهري'),
  },
};

const cpiAnswer =
  (variant: CpiVariant) =>
  (lang: Lang): AnswerPackage => {
    const c = CPI_SHAPES[variant];
    const rowRef = ref(variant, c.period, c.row);

    const elements: AnswerElement[] = [
      scopeEl(lang, c.scope, rowRef),
      {
        class: 'measured',
        role: 'headline',
        text: s(c.sentence, lang),
        source_ref: rowRef,
        value: s(t(c.headline, c.headline), lang),
        unit: '%',
      },
    ];

    if (c.delta) {
      elements.push({
        class: 'derived',
        role: 'delta',
        text: s(c.delta.text, lang),
        source_ref: rowRef,
        value: s(t(c.delta.value, c.delta.value), lang),
        unit: 'pp',
      });
    }

    if (c.series) {
      elements.push(seriesEl(c.series, '%', c.seriesLabel, lang, rowRef));
    }

    elements.push(
      noteEl(
        lang,
        'measured',
        t(
          `Read from the published release, row ${c.row}.`,
          `مقروء من الإصدار المنشور، السجل ${c.row}.`,
        ),
        rowRef,
      ),
      noteEl(
        lang,
        'absent',
        t(
          'No analyst commentary is published for this period.',
          'لا يوجد تعليق تحليلي منشور لهذه الفترة.',
        ),
        rowRef,
      ),
      evidenceEl(lang, c.indicator, c.period, c.evidenceValue, '%', rowRef),
    );

    return {
      kind: 'answer',
      provenance: 'approved',
      agent: s(AGENT_APPROVED, lang),
      spec: spec({
        detail: variant,
        ...(c.deferred ? { resolved: c.period } : { exact: c.period }),
      }),
      elements,
      chartable: c.series
        ? { available: true, default_view: 'line', alternate_views: ['bar', 'table'] }
        : NO_CHART,
      caveat: null,
      reason: null,
      degradations: [],
    };
  };

/* ------------------------------------------------------------------ */
/* 3 — exports series                                                   */
/* ------------------------------------------------------------------ */

const EXPORT_NAME = t('Total goods exports', 'إجمالي صادرات السلع');
const EXPORT_POINTS: SeriesPoint[] = [
  { label: '2018', value: 29.3 },
  { label: '2019', value: 32.0 },
  { label: '2020', value: 40.6 },
  { label: '2021', value: 30.0 },
  { label: '2022', value: 29.3 },
  { label: '2023', value: 34.3 },
  { label: '2024', value: 36.4 },
  { label: '2025', value: 36.7 },
];

const EXPORT_REF = ref('TRD.EXP.TOTAL.Y', '2025', 'PSA/TRD/2025/R0088');

const exportsSeries = (lang: Lang): AnswerPackage => ({
  kind: 'answer',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec({ detail: 'TRD.EXP.TOTAL.Y', exact: '2025', operation: 'series' }),
  elements: [
    scopeEl(
      lang,
      t('yearly · Qatar national · 2018–2025', 'سنوي · قطر الوطني · 2018–2025'),
      EXPORT_REF,
    ),
    {
      class: 'measured',
      role: 'headline',
      text: s(
        t(
          'Total goods exports were 36.7 QAR bn in 2025, the latest published year.',
          'بلغ إجمالي صادرات السلع 36.7 مليار ريال قطري في 2025، وهي آخر سنة منشورة.',
        ),
        lang,
      ),
      source_ref: EXPORT_REF,
      value: s(t('36.7', '36.7'), lang),
      unit: s(t('QAR bn', 'مليار ريال قطري'), lang),
    },
    {
      class: 'derived',
      role: 'delta',
      text: s(t('+0.3 QAR bn against 2024', '+0.3 مليار ريال قطري مقارنة بـ 2024'), lang),
      source_ref: EXPORT_REF,
      value: s(t('+0.3', '+0.3'), lang),
      unit: s(t('QAR bn', 'مليار ريال قطري'), lang),
    },
    seriesEl(EXPORT_POINTS, 'QAR bn', t('Yearly, 2018–2025', 'سنوي، 2018–2025'), lang, EXPORT_REF),
    noteEl(
      lang,
      'measured',
      t('Read from eight published yearly rows.', 'مقروء من ثمانية سجلات سنوية منشورة.'),
      EXPORT_REF,
    ),
    {
      class: 'attributed',
      role: 'analysis',
      text: s(
        t(
          'The 2020 level reflects a one-off contract settlement recorded in the fourth quarter.',
          'يعكس مستوى 2020 تسوية تعاقدية غير متكررة سُجلت في الربع الرابع.',
        ),
        lang,
      ),
      source_ref: ref('TRD.EXP.TOTAL.Y', '2020', 'PSA/NOTE/2020/A0044'),
      publisher: s(t('Economic Analysis Unit', 'وحدة التحليل الاقتصادي'), lang),
    },
    {
      class: 'article',
      role: 'analysis',
      text: s(
        t(
          'Diversification has widened the export base, but concentration in a small number of commodities remains high.',
          'وسّع التنويع قاعدة الصادرات، لكن التركّز في عدد محدود من السلع لا يزال مرتفعًا.',
        ),
        lang,
      ),
      source_ref: ref('TRD.EXP.TOTAL.Y', '2025', 'PSA/ART/2025/A0311'),
      article: {
        title: s(t('Reading the export series', 'قراءة في سلسلة الصادرات'), lang),
        date: '2025-03-11',
      },
    },
    evidenceEl(lang, EXPORT_NAME, '2025', '36.74', 'QAR bn', EXPORT_REF),
    evidenceEl(
      lang,
      EXPORT_NAME,
      '2024',
      '36.41',
      'QAR bn',
      ref('TRD.EXP.TOTAL.Y', '2024', 'PSA/TRD/2024/R0081'),
    ),
  ],
  chartable: { available: true, default_view: 'line', alternate_views: ['bar', 'table'] },
  caveat: null,
  reason: null,
  degradations: [],
});

const HYDRO_NAME = t('Hydrocarbon exports', 'صادرات المواد الهيدروكربونية');
const HYDRO_REF = ref('TRD.EXP.HYDRO.Y', '2025', 'PSA/TRD/HC/2025/R0090');

const hydrocarbonExports = (lang: Lang): AnswerPackage => ({
  kind: 'answer',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec({ detail: 'TRD.EXP.HYDRO.Y', exact: '2025', boundBy: { detail: 'reader' } }),
  elements: [
    scopeEl(lang, t('yearly · Qatar national · 2025', 'سنوي · قطر الوطني · 2025'), HYDRO_REF),
    {
      class: 'measured',
      role: 'headline',
      text: s(
        t(
          'Hydrocarbon exports were 28.9 QAR bn in 2025.',
          'بلغت صادرات المواد الهيدروكربونية 28.9 مليار ريال قطري في 2025.',
        ),
        lang,
      ),
      source_ref: HYDRO_REF,
      value: s(t('28.9', '28.9'), lang),
      unit: s(t('QAR bn', 'مليار ريال قطري'), lang),
    },
    noteEl(
      lang,
      'absent',
      t(
        'No analyst commentary is published for this period.',
        'لا يوجد تعليق تحليلي منشور لهذه الفترة.',
      ),
      HYDRO_REF,
    ),
    evidenceEl(lang, HYDRO_NAME, '2025', '28.94', 'QAR bn', HYDRO_REF),
  ],
  chartable: NO_CHART,
  caveat: null,
  reason: null,
  degradations: [],
});

const clarificationExports = (lang: Lang): AnswerPackage => ({
  kind: 'clarification',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec({
    detail: { unbound: 'ambiguous-detail: exports' },
    exact: '2025',
    boundBy: { detail: 'reader' },
  }),
  elements: [],
  chartable: NO_CHART,
  caveat: null,
  reason: s(
    t(
      'Two export series are published at this grain. Tell me which one the question meant.',
      'تُنشر سلسلتان للصادرات بهذه الدقة. أخبرني أيّهما تقصد المسألة.',
    ),
    lang,
  ),
  reason_id: 'clarification.ambiguous_indicator',
  candidates: [
    {
      detail_id: 'TRD.EXP.TOTAL.Y',
      name: s(EXPORT_NAME, lang),
      scope: s(t('yearly · Qatar national · 2018–2025', 'سنوي · قطر الوطني · 2018–2025'), lang),
      latest: {
        value: s(t('36.7', '36.7'), lang),
        unit: s(t('QAR bn', 'مليار ريال قطري'), lang),
        period: s(t('2025', '2025'), lang),
      },
    },
    {
      detail_id: 'TRD.EXP.HYDRO.Y',
      name: s(HYDRO_NAME, lang),
      scope: s(t('yearly · Qatar national · 2025', 'سنوي · قطر الوطني · 2025'), lang),
      latest: {
        value: s(t('28.9', '28.9'), lang),
        unit: s(t('QAR bn', 'مليار ريال قطري'), lang),
        period: s(t('2025', '2025'), lang),
      },
    },
  ],
  degradations: [],
});

/* ------------------------------------------------------------------ */
/* 4 — GDP, approved answer + external block                            */
/* ------------------------------------------------------------------ */

const GDP_NAME = t('Real gross domestic product', 'الناتج المحلي الإجمالي الحقيقي');
const GDP_Q1_REF = ref('NA.GDP.REAL.Q', '2025-Q1', 'PSA/NA/2025Q1/R0311');
const GDP_Q2_REF = ref('NA.GDP.REAL.Q', '2025-Q2', 'PSA/NA/2025Q2/R0342');

const gdpApproved = (lang: Lang): AnswerPackage => ({
  kind: 'answer',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec({
    detail: 'NA.GDP.REAL.Q',
    exact: '2025-Q2',
    measure: 'change',
    operation: 'change',
    boundBy: { detail: 'semantic-match' },
  }),
  elements: [
    scopeEl(
      lang,
      t(
        'quarterly · Qatar national · 2025-Q1 → 2025-Q2',
        'ربع سنوي · قطر الوطني · 2025-Q1 ← 2025-Q2',
      ),
      GDP_Q2_REF,
    ),
    {
      class: 'derived',
      role: 'headline',
      text: s(
        t(
          'Real GDP was 1.3% lower in 2025-Q2 than in 2025-Q1.',
          'كان الناتج المحلي الإجمالي الحقيقي أقل بنسبة 1.3% في 2025-Q2 عنه في 2025-Q1.',
        ),
        lang,
      ),
      source_ref: GDP_Q2_REF,
      value: s(t('-1.3', '-1.3'), lang),
      unit: '%',
    },
    seriesEl(
      [
        { label: '2025-Q1', value: 186420 },
        { label: '2025-Q2', value: 183997 },
      ],
      'QAR mn',
      t('The two published rows', 'السجلان المنشوران'),
      lang,
      GDP_Q2_REF,
    ),
    noteEl(
      lang,
      'derived',
      t(
        'Calculated from two published rows. No growth rate is published for this pair.',
        'محسوب من سجلّين منشورين. لا يوجد معدل نمو منشور لهذا الزوج.',
      ),
      GDP_Q2_REF,
    ),
    evidenceEl(lang, GDP_NAME, '2025-Q1', '186,420', 'QAR mn', GDP_Q1_REF),
    evidenceEl(lang, GDP_NAME, '2025-Q2', '183,997', 'QAR mn', GDP_Q2_REF),
  ],
  chartable: { available: true, default_view: 'bar', alternate_views: ['table'] },
  caveat: null,
  reason: null,
  degradations: [],
});

const gdpExternal = (lang: Lang): ExternalBlock => ({
  provenance: 'external',
  agent: s(AGENT_EXTERNAL, lang),
  caveat: s(NOT_VERIFIED, lang),
  outcome: 'success',
  prose: s(
    t(
      'Oxford Economics estimates real GDP fell 0.9% between 2025-Q1 and 2025-Q2. The estimate is modelled; no published row underlies it.',
      'تقدّر أوكسفورد إيكونوميكس انخفاض الناتج المحلي الإجمالي الحقيقي بنسبة 0.9% بين 2025-Q1 و2025-Q2. التقدير نموذجي ولا يستند إلى سجل منشور.',
    ),
    lang,
  ),
  reason: null,
  check: {
    band: s(t('−2.0% to +1.0%', '−2.0% إلى +1.0%'), lang),
    limits: s(
      t('Compared against the approved quarterly series.', 'مقارنة بالسلسلة الربع سنوية المعتمدة.'),
      lang,
    ),
    found: [s(t('real GDP, 2025-Q2', 'الناتج المحلي الحقيقي، 2025-Q2'), lang)],
    beyond: [],
    flagged: false,
  },
  elapsed_seconds: 3.42,
  degradations: [],
});

/* ------------------------------------------------------------------ */
/* 5 — forecast: approved refusal + external answer                     */
/* ------------------------------------------------------------------ */

const forecastRefusal = (lang: Lang): AnswerPackage =>
  refusal(
    lang,
    'not-approved-for-publication',
    'refusal.not_approved_for_publication',
    t(
      'A 2027 real GDP growth projection is held in the indicator catalogue, but it is not approved for publication. Approval is set by the publishing authority: this is a publication decision, not a data gap.',
      'يوجد في فهرس المؤشرات تقدير لنمو الناتج المحلي الإجمالي الحقيقي لعام 2027، لكنه غير معتمد للنشر. الاعتماد تحدده الجهة الناشرة: هذا قرار نشر وليس فجوة في البيانات.',
    ),
    { detail: 'NA.GDP.GROWTH.FCST.Y', exact: '2027', measure: 'target' },
    [
      {
        label: s(t('Real GDP, 2025-Q1 → Q2', 'الناتج المحلي الحقيقي، 2025-Q1 ← Q2'), lang),
        question: s(
          t('How did GDP change from Q1 to Q2 2025?', 'كيف تغيّر الناتج المحلي من Q1 إلى Q2 2025؟'),
          lang,
        ),
      },
    ],
  );

const forecastExternal = (lang: Lang): ExternalBlock => ({
  provenance: 'external',
  agent: s(AGENT_EXTERNAL, lang),
  caveat: s(
    t(
      'Not verified against approved SCEAI data. Presented exactly as retrieved.',
      'غير مُتحقَّق منه مقابل بيانات المجلس المعتمدة. معروض كما استُرجع تمامًا.',
    ),
    lang,
  ),
  outcome: 'success',
  prose: s(
    t(
      'Oxford Economics returns a 2027 real GDP growth forecast of -28.76%. Presented exactly as retrieved on 2026-09-02: not smoothed, capped or adjusted.',
      'تُرجع أوكسفورد إيكونوميكس توقعًا لنمو الناتج المحلي الإجمالي الحقيقي لعام 2027 قدره -28.76%. معروض كما استُرجع تمامًا في 2026-09-02: دون تنعيم أو تحديد سقف أو تعديل.',
    ),
    lang,
  ),
  reason: null,
  check: {
    band: s(t('−5.0% to +8.0%', '−5.0% إلى +8.0%'), lang),
    limits: s(
      t(
        'Compared against the published growth range since 2015.',
        'مقارنة بنطاق النمو المنشور منذ 2015.',
      ),
      lang,
    ),
    found: [s(t('real GDP growth, 2027', 'نمو الناتج المحلي الحقيقي، 2027'), lang)],
    beyond: [s(t('-28.76% is outside the published range', '-28.76% خارج النطاق المنشور'), lang)],
    flagged: true,
  },
  elapsed_seconds: 6.08,
  degradations: [],
});

/* ------------------------------------------------------------------ */
/* 6 — yes / no                                                         */
/* ------------------------------------------------------------------ */

const CPI_2025_REF = ref('CPI.HEADLINE.Y', '2025', 'PSA/CPI/2025/R0121');

const yesNo = (lang: Lang): AnswerPackage => ({
  kind: 'answer',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec({ detail: 'CPI.HEADLINE.Y', exact: '2025', operation: 'threshold' }),
  elements: [
    scopeEl(lang, t('yearly · Qatar national · 2025', 'سنوي · قطر الوطني · 2025'), CPI_2025_REF),
    {
      class: 'derived',
      role: 'headline',
      text: s(
        t(
          'No. Consumer price inflation was 2.4% over 2025, below the 3% threshold in the question.',
          'لا. بلغ تضخم أسعار المستهلك 2.4% خلال 2025، أي دون عتبة 3% الواردة في السؤال.',
        ),
        lang,
      ),
      source_ref: CPI_2025_REF,
      value: s(t('No', 'لا'), lang),
    },
    noteEl(
      lang,
      'measured',
      t(
        'Compared against the published yearly value for 2025.',
        'مقارنة بالقيمة السنوية المنشورة لعام 2025.',
      ),
      CPI_2025_REF,
    ),
    evidenceEl(
      lang,
      t(
        'Consumer price index, year-on-year change',
        'الرقم القياسي لأسعار المستهلك، التغير السنوي',
      ),
      '2025',
      '2.37',
      '%',
      CPI_2025_REF,
    ),
  ],
  chartable: NO_CHART,
  caveat: null,
  reason: null,
  degradations: [],
});

/* ------------------------------------------------------------------ */
/* 7 — the remaining refusals                                           */
/* ------------------------------------------------------------------ */

const refusalEmpty = (lang: Lang): AnswerPackage =>
  refusal(
    lang,
    'published-with-no-data',
    'refusal.published_with_no_data',
    t(
      'Visitor arrivals is a published indicator, but no rows have been released for 2026. The indicator exists and is approved; the 2026 rows have not been released yet.',
      'الوافدون الزائرون مؤشر منشور، لكن لم تصدر أي سجلات لعام 2026. المؤشر موجود ومعتمد، ولم تصدر سجلات 2026 بعد.',
    ),
    { detail: 'TUR.ARRIVALS.M', exact: '2026' },
  );

const refusalGrain = (lang: Lang): AnswerPackage =>
  refusal(
    lang,
    'no-data-for-this-selection',
    'refusal.no_data_for_this_selection',
    t(
      'Female labour force participation is published for Qatar only. No benchmark rows are published for other GCC states, so there is nothing to answer this selection from.',
      'تُنشر مشاركة المرأة في القوى العاملة لقطر فقط. لا توجد سجلات مرجعية منشورة لبقية دول مجلس التعاون، فلا يوجد ما يُجاب منه عن هذا التحديد.',
    ),
    {
      detail: 'LAB.FLFP.Y',
      exact: '2025',
      country: 'declared_benchmarks',
      boundBy: { country_scope: 'named-in-question' },
    },
    [
      {
        label: s(t('Total goods exports, 2018–2025', 'إجمالي صادرات السلع، 2018–2025'), lang),
        question: s(
          t('Show total goods exports since 2018', 'اعرض إجمالي صادرات السلع منذ 2018'),
          lang,
        ),
      },
    ],
  );

/**
 * `comparison`, `rank`, `spread` and `extremum` are not implemented in the
 * service yet and come back as `question-not-supported`.
 */
const refusalComparison = (lang: Lang): AnswerPackage =>
  refusal(
    lang,
    'question-not-supported',
    'refusal.question_not_supported',
    t(
      'Comparisons, rankings and spreads are not supported yet. Ask for a single published value and I can answer it.',
      'المقارنات والترتيب والفروق غير مدعومة بعد. اطلب قيمة منشورة واحدة ويمكنني الإجابة عنها.',
    ),
    { detail: { unbound: 'unsupported-operation: comparison' }, operation: 'comparison' },
  );

const refusalUnsupported = (lang: Lang): AnswerPackage =>
  refusal(
    lang,
    'question-not-supported',
    'refusal.question_not_supported',
    t(
      'This asks for a judgement about causes. I answer questions about published values, and show published commentary where it exists — it is attached to about 8% of datapoints.',
      'يطلب هذا حكمًا بشأن الأسباب. أجيب عن المسائل المتعلقة بالقيم المنشورة، وأعرض التعليق المنشور حيثما وُجد — وهو مرتبط بنحو 8% من نقاط البيانات.',
    ),
    { detail: { unbound: 'no-detail-named: question about causes' } },
    [
      {
        label: s(t('Exports, with published commentary', 'الصادرات، مع التعليق المنشور'), lang),
        question: s(
          t('Show total goods exports since 2018', 'اعرض إجمالي صادرات السلع منذ 2018'),
          lang,
        ),
      },
    ],
  );

const refusalUnreachable = (lang: Lang): AnswerPackage =>
  refusal(
    lang,
    'data-could-not-be-reached',
    'refusal.data_could_not_be_reached',
    t(
      'The indicator store did not respond, so no figure can be shown until it is reachable again. The last successful refresh was 2026-09-14 06:00.',
      'لم يستجب مخزن المؤشرات، فلا يمكن عرض أي رقم حتى يصبح متاحًا مجددًا. آخر تحديث ناجح كان في 2026-09-14 06:00.',
    ),
    { detail: 'MON.RESERVES.M', exact: '2026-08' },
    [
      {
        label: s(t('Ask again', 'اسأل مرة أخرى'), lang),
        question: s(t('International reserves', 'الاحتياطيات الدولية'), lang),
      },
    ],
  );

const refusalNoIndicator = (lang: Lang): AnswerPackage =>
  refusal(
    lang,
    'no-such-indicator',
    'refusal.no_such_indicator',
    t(
      'No published indicator matches that name, so there is nothing published to answer it from. The catalogue holds 320 indicators.',
      'لا يوجد مؤشر منشور يطابق ذلك الاسم، فلا يوجد ما يُجاب منه. يضم الفهرس 320 مؤشرًا.',
    ),
    { detail: { unbound: 'no-detail-named' } },
    [
      {
        label: s(CPI_NAME, lang),
        question: s(
          t('What was CPI inflation in April 2026?', 'ما تضخم أسعار المستهلك في أبريل 2026؟'),
          lang,
        ),
      },
      {
        label: s(EXPORT_NAME, lang),
        question: s(
          t('Show total goods exports since 2018', 'اعرض إجمالي صادرات السلع منذ 2018'),
          lang,
        ),
      },
      {
        label: s(GDP_NAME, lang),
        question: s(
          t('How did GDP change from Q1 to Q2 2025?', 'كيف تغيّر الناتج المحلي من Q1 إلى Q2 2025؟'),
          lang,
        ),
      },
    ],
  );

/* ------------------------------------------------------------------ */
/* external blocks that are not an answer                               */
/* ------------------------------------------------------------------ */

/** Asked, and it has nothing for this subject. Present, saying so. */
const externalNoCoverage = (lang: Lang): ExternalBlock => ({
  provenance: 'external',
  agent: s(AGENT_EXTERNAL, lang),
  caveat: s(NOT_VERIFIED, lang),
  outcome: 'unavailable',
  prose: null,
  reason: s(
    t(
      'Oxford Economics does not carry a series matching this question. Third-party coverage is narrower than the approved catalogue.',
      'لا تملك أوكسفورد إيكونوميكس سلسلة تطابق هذه المسألة. تغطية الطرف الثالث أضيق من الفهرس المعتمد.',
    ),
    lang,
  ),
  check: null,
  elapsed_seconds: 1.11,
  degradations: [],
});

/** Asked, and it ran out of time. Also present, also saying so. */
const externalTimeout = (lang: Lang): ExternalBlock => ({
  provenance: 'external',
  agent: s(AGENT_EXTERNAL, lang),
  caveat: s(NOT_VERIFIED, lang),
  outcome: 'timeout',
  prose: null,
  reason: s(
    t(
      'Oxford Economics did not answer within the time allowed.',
      'لم تُجب أوكسفورد إيكونوميكس ضمن الوقت المتاح.',
    ),
    lang,
  ),
  check: null,
  elapsed_seconds: 30.0,
  degradations: [
    {
      kind: 'agent_timeout',
      where: 'external',
      detail: s(t('Cut off at 30 seconds.', 'أُوقف عند 30 ثانية.'), lang),
    },
  ],
});

/* ------------------------------------------------------------------ */
/* 8 — follow-ups (only reachable once a conversation exists)           */
/* ------------------------------------------------------------------ */

const followUpQuarterly = (lang: Lang): AnswerPackage => cpiAnswer('CPI.HEADLINE.Q')(lang);

const followUpQuarterlyInheritance = (lang: Lang): Inheritance => ({
  carried: s(
    t('Consumer price inflation · Qatar national', 'تضخم أسعار المستهلك · قطر الوطني'),
    lang,
  ),
  changed: [
    s(t('frequency → quarterly', 'التواتر ← ربع سنوي'), lang),
    s(t('period → 2026-Q1', 'الفترة ← 2026-Q1'), lang),
  ],
});

const FOLLOWUP_2022_REF = ref('TRD.EXP.TOTAL.Y', '2022', 'PSA/TRD/2022/R0063');

const followUp2022 = (lang: Lang): AnswerPackage => ({
  kind: 'answer',
  provenance: 'approved',
  agent: s(AGENT_APPROVED, lang),
  spec: spec({
    detail: 'TRD.EXP.TOTAL.Y',
    exact: '2022',
    boundBy: { detail: 'carried-from-previous-turn' },
  }),
  elements: [
    scopeEl(lang, t('yearly · Qatar national · 2022', 'سنوي · قطر الوطني · 2022'), FOLLOWUP_2022_REF),
    {
      class: 'measured',
      role: 'headline',
      text: s(
        t(
          'Total goods exports were 29.3 QAR bn in 2022. Monthly rows are not published for 2022, so the yearly row is shown instead.',
          'بلغ إجمالي صادرات السلع 29.3 مليار ريال قطري في 2022. السجلات الشهرية غير منشورة لعام 2022، لذا يُعرض السجل السنوي بدلًا منها.',
        ),
        lang,
      ),
      source_ref: FOLLOWUP_2022_REF,
      value: s(t('29.3', '29.3'), lang),
      unit: s(t('QAR bn', 'مليار ريال قطري'), lang),
    },
    noteEl(
      lang,
      'measured',
      t('Read from one published yearly row.', 'مقروء من سجل سنوي منشور واحد.'),
      FOLLOWUP_2022_REF,
    ),
    evidenceEl(lang, EXPORT_NAME, '2022', '29.27', 'QAR bn', FOLLOWUP_2022_REF),
  ],
  chartable: NO_CHART,
  caveat: null,
  reason: null,
  degradations: [
    {
      kind: 'grain_changed',
      where: s(t('monthly → yearly', 'شهري ← سنوي'), lang),
      detail: s(
        t(
          'Monthly rows are not published for 2022; the yearly row was used.',
          'السجلات الشهرية غير منشورة لعام 2022؛ استُخدم السجل السنوي.',
        ),
        lang,
      ),
    },
  ],
});

const followUp2022Inheritance = (lang: Lang): Inheritance => ({
  carried: s(t('Total goods exports · Qatar national', 'إجمالي صادرات السلع · قطر الوطني'), lang),
  changed: [s(t('period → 2022', 'الفترة ← 2022'), lang)],
});

/* ------------------------------------------------------------------ */
/* the fixture table                                                    */
/* ------------------------------------------------------------------ */

interface Fixture {
  id: string;
  keywords: string[];
  /** Follow-ups only resolve once a conversation exists. */
  followUpOnly?: boolean;
  approved: (lang: Lang) => AnswerPackage;
  /** Returned in the `external` block when the reader admitted an external agent. */
  external?: (lang: Lang) => ExternalBlock;
  freshness?: Freshness;
  inherited?: (lang: Lang) => Inheritance;
}

const FIXTURES: Fixture[] = [
  {
    id: 'followup-quarterly',
    keywords: ['quarterly', 'ربع'],
    followUpOnly: true,
    approved: followUpQuarterly,
    inherited: followUpQuarterlyInheritance,
  },
  {
    id: 'followup-2022',
    keywords: ['2022'],
    followUpOnly: true,
    approved: followUp2022,
    inherited: followUp2022Inheritance,
  },
  // Ahead of every topical fixture: "why did exports fall?" is a question about
  // causes, whatever subject it names.
  {
    id: 'refusal-unsupported',
    keywords: ['why', 'should', 'recommend', 'لماذا', 'هل ينبغي'],
    approved: refusalUnsupported,
  },
  {
    id: 'answer-yesno',
    keywords: ['exceed', 'above 3', 'more than 3', 'تجاوز', 'أكثر من 3'],
    approved: yesNo,
  },
  {
    id: 'answer-cpi-april',
    keywords: ['april', 'cpi', 'consumer price', 'أبريل', 'المستهلك'],
    approved: cpiAnswer('CPI.HEADLINE.M'),
  },
  {
    id: 'answer-exports',
    keywords: ['export', 'صادرات'],
    approved: exportsSeries,
  },
  // Ordered before the GDP fixture: "GDP growth forecast for 2027" is a
  // question about a forecast, not about the published GDP series.
  {
    id: 'refusal-forecast',
    keywords: ['forecast', 'projection', '2027', 'توقع', 'تنبؤ'],
    approved: forecastRefusal,
    external: forecastExternal,
  },
  {
    id: 'answer-gdp',
    keywords: ['gdp', 'gross domestic', 'الناتج المحلي'],
    approved: gdpApproved,
    external: gdpExternal,
  },
  {
    id: 'clarification-inflation',
    keywords: ['inflation', 'تضخم'],
    approved: clarificationInflation,
  },
  {
    id: 'refusal-empty',
    keywords: ['tourism', 'visitor', 'arrivals', 'سياحة', 'زائر'],
    approved: refusalEmpty,
  },
  // Before the generic comparison refusal: this one is about a selection with
  // no published rows, not about an unimplemented operation.
  {
    id: 'refusal-grain',
    keywords: ['gcc', 'benchmark', 'labour force', 'الخليج', 'القوى العاملة'],
    approved: refusalGrain,
  },
  {
    id: 'refusal-comparison',
    keywords: ['compare', 'rank', 'highest', 'lowest', 'spread', 'قارن', 'ترتيب'],
    approved: refusalComparison,
  },
  {
    id: 'refusal-unreachable',
    keywords: ['reserves', 'unreachable', 'stale', 'احتياطي', 'قديمة'],
    approved: refusalUnreachable,
    external: externalTimeout,
    freshness: OVERDUE,
  },
];

const FALLBACK: Fixture = {
  id: 'refusal-no-indicator',
  keywords: [],
  approved: refusalNoIndicator,
};

/** Candidate picks complete the original question against a chosen indicator. */
const RESOLUTIONS: Record<string, Fixture> = {
  'CPI.HEADLINE.M': { id: 'r-cpi-m', keywords: [], approved: cpiAnswer('CPI.HEADLINE.M') },
  'CPI.HEADLINE.Q': { id: 'r-cpi-q', keywords: [], approved: cpiAnswer('CPI.HEADLINE.Q') },
  'CPI.HEADLINE.Y': { id: 'r-cpi-y', keywords: [], approved: cpiAnswer('CPI.HEADLINE.Y') },
  'CPI.CORE.M': { id: 'r-cpi-core', keywords: [], approved: cpiAnswer('CPI.CORE.M') },
  'TRD.EXP.TOTAL.Y': { id: 'r-exp-total', keywords: [], approved: exportsSeries },
  'TRD.EXP.HYDRO.Y': { id: 'r-exp-hydro', keywords: [], approved: hydrocarbonExports },
};

/**
 * "Not this indicator" on an inheritance banner: answer by listing the
 * indicators the question could mean instead of carrying the subject forward.
 */
const DISAMBIGUATIONS: Record<string, Fixture> = {
  'followup-quarterly': { id: 'd-cpi', keywords: [], approved: clarificationInflation },
  'answer-cpi-april': { id: 'd-cpi', keywords: [], approved: clarificationInflation },
  'clarification-inflation': { id: 'd-cpi', keywords: [], approved: clarificationInflation },
  'followup-2022': { id: 'd-exp', keywords: [], approved: clarificationExports },
  'answer-exports': { id: 'd-exp', keywords: [], approved: clarificationExports },
};

function match(question: string, hasConversation: boolean): Fixture {
  const q = question.toLowerCase();
  for (const f of FIXTURES) {
    if (f.followUpOnly && !hasConversation) continue;
    if (f.keywords.some((k) => q.includes(k))) return f;
  }
  return FALLBACK;
}

/** `sources` outside the three valid selections is a 422 on the real service. */
function validSelection(sources: SourceSel[]): boolean {
  const unique = new Set(sources);
  return unique.size === sources.length && sources.length > 0 && sources.length <= 2;
}

/** The freshness `GET /api/health` reports before any question is asked. */
export function fixtureFreshness(): Freshness {
  return FRESH;
}

/** Resolve a request against the sample data. */
export function resolveFixture(req: AskRequest): AskResponse {
  if (!validSelection(req.sources)) {
    throw new Error(`sources: unsupported selection ${JSON.stringify(req.sources)}`);
  }

  const resolveId = req.resolve_detail_id ?? null;
  const matched = match(req.question, req.conversation_id !== null);

  const fixture = resolveId
    ? (RESOLUTIONS[resolveId] ?? FALLBACK)
    : req.disambiguate
      ? (DISAMBIGUATIONS[matched.id] ?? FALLBACK)
      : matched;

  const inherited = fixture.inherited ? fixture.inherited(req.lang) : null;

  // approved always first; the external agent gets its own block, never a
  // package, so third-party prose has exactly one home.
  const packages = req.sources.includes('approved') ? [fixture.approved(req.lang)] : [];
  const external = req.sources.includes('external')
    ? (fixture.external ?? externalNoCoverage)(req.lang)
    : undefined;

  return {
    conversation_id: req.conversation_id ?? `conv_${Math.random().toString(36).slice(2, 10)}`,
    packages,
    freshness: fixture.freshness ?? FRESH,
    ...(external ? { external } : {}),
    inherited,
  };
}
