/**
 * The askAI v2 wire contract.
 *
 * `POST /chat` — one JSON response, no streaming. Every shape here is one the
 * service sends; nothing is invented by the client.
 *
 * Three properties of this API drive most of the client:
 *
 *  1. A handled request is **always HTTP 200**, including "no data". The test
 *     for success is `facts_payload.ok`, never the status code.
 *  2. Numbers arrive as **strings** — SQL NUMERIC to Python Decimal to JSON
 *     string — so every figure is parsed before it is formatted or plotted.
 *  3. `facts` has **no type discriminator**. Which question was answered is
 *     read from which keys are present.
 */

export type Lang = 'en' | 'ar';

export interface ChatRequest {
  message: string;
  /**
   * Stable, and per user. The server keeps the transcript itself now, so this
   * id *is* the conversation: follow-ups like "and for Saudi Arabia?" inherit
   * the previous indicator and period from it.
   *
   * Omitting it puts every reader in the server's one "default" conversation,
   * where they would inherit each other's context.
   *
   * There is deliberately no `conversation_context` field: the client no longer
   * sends the transcript back, because the server is the one that holds it.
   */
  session_id: string;
}

/** What the server remembers for a session. */
export interface SessionState {
  session_id?: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  /** User-facing prose. Always present. Includes its own `Sources:` footer. */
  answer: string;
  facts_payload: FactsPayload;
  chart: ChartSpec | null;
  /**
   * false means the numeric verifier rejected the model's phrasing and `answer`
   * is a plain template fallback — correct data, blunt prose. Worth surfacing
   * quietly, and worth logging.
   */
  verified: boolean;
  /**
   * True only when the answer contains an actual reading — a value measured at
   * a period. It is the single gate on the "read this for me" affordance:
   * offering it on a greeting, a refusal, a definition or a catalogue listing
   * shows the reader nothing they were not already shown.
   *
   * Never inferred from the shape of the answer. The service decides.
   */
  readable?: boolean;
}

/* ------------------------------------------------------------------ */
/* POST /read                                                          */
/* ------------------------------------------------------------------ */

/**
 * The read-it-for-me view. Same request shape as `/chat`, but the text comes
 * back split by **who wrote it**, and that split is a correctness requirement
 * rather than a layout preference: generated prose must never appear to carry
 * the Council's authority.
 *
 * So `council_analysis` and `narration` are rendered in separate blocks, with
 * different treatments, and are never merged — see `ReadPanel`.
 */
export interface ReadResponse {
  ok?: boolean;
  message?: string | null;
  readable?: boolean;
  /**
   * `/read` carries the same facts as the answer it is retelling. The evidence
   * rows have no unit or precision of their own, so those are read from here.
   */
  facts_payload?: FactsPayload;
  chart?: ChartSpec | null;
  verified?: boolean;
  /** Null for trends and rankings, which have no single figure. */
  headline: ReadHeadline | null;
  one_liner?: string | null;
  /** SCAI analysts' own words, verbatim. Quoted and attributed. */
  council_analysis: CouncilAnalysis[];
  /** The raw readings, behind a disclosure. */
  evidence: ReadEvidence[];
  /** LLM-generated prose. Never presented as Council analysis. */
  narration?: string | null;
  /** Shown with the narration, always. */
  disclaimer?: string | null;
}

export interface ReadHeadline {
  value: Figure;
  unit: string | null;
  indicator: string;
  period_label: string;
  period_human: string;
}

export interface CouncilAnalysis {
  period_label?: string;
  period_human?: string;
  /** Carries "• " bullet lines, which render as a list. */
  summary: string;
  /**
   * True when the commentary text discusses a **different period** than the
   * data point it is filed against — real in the current data, where the row on
   * Real GDP's 2019-Q1 point reads "Real GDP grew by 6.1% YoY in Q4 2024".
   *
   * Labelling that "According to SCAI, Q1 2019" would put the Council's name to
   * a claim about the wrong period, so the label goes neutral and says so.
   */
  period_mismatch?: boolean;
  [key: string]: unknown;
}

/**
 * True when two pieces of prose are the same text.
 *
 * `/read` has no `answer` field: the generated prose lives in `narration`, and
 * `one_liner` sometimes repeats it. Rendering both would print it twice.
 */
export function sameProse(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalize(a) === normalize(b);
}

export interface ReadEvidence {
  period_label?: string;
  period_human?: string;
  /**
   * The reading. `/read` names it `value`; the `/chat` shapes name the same
   * thing `actual`, so both are accepted — reading only one of them renders a
   * column of dashes.
   */
  value?: Figure;
  actual?: Figure;
  target?: Figure;
  unit?: string | null;
  indicator?: string;
  record_id?: string;
  table?: string;
  country?: string;
  [key: string]: unknown;
}

/** "• " bullet lines inside a summary, split for rendering as a list. */
export function bulletLines(summary: string): string[] {
  return summary
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('•'))
    .map((line) => line.replace(/^•\s*/, ''));
}

/** Whatever is not a bullet — the lead-in above the list. */
export function nonBulletText(summary: string): string {
  return summary
    .split('\n')
    .filter((line) => !line.trim().startsWith('•'))
    .join('\n')
    .trim();
}

export type FactsPayload = FactsFound | FactsMissing;

export interface FactsFound {
  ok: true;
  facts: Facts;
  citations: Citation[];
  chart?: ChartSpec | null;
}

/** No data, ambiguous, or out of scope — with the honest reason. */
export interface FactsMissing {
  ok: false;
  message: string;
  /** Present on an ambiguous match, carrying `candidates`. */
  facts?: Facts;
  citations?: Citation[];
  chart?: ChartSpec | null;
}

export interface Citation {
  /** Null on catalog-level citations. */
  indicator: string | null;
  data_source: string;
  /** 'published_data_points' is SCAI-vetted; 'indicator_values' is raw. */
  table: string;
  record_id: string;
  period_label: string;
  country: string;
}

export const VETTED_TABLE = 'published_data_points';

/* ------------------------------------------------------------------ */
/* facts                                                               */
/* ------------------------------------------------------------------ */

/** A figure as it arrives: a string, or null where the service has none. */
export type Figure = string | null;

export interface SeriesRow {
  period_label: string;
  actual: Figure;
}

export interface CountryRow {
  country: string;
  period_label: string;
  actual: Figure;
}

export interface OverviewRow {
  [key: string]: unknown;
}

export interface FactsLatestValue {
  period_label: string;
  actual: Figure;
  target: Figure;
  unit?: string | null;
}

export interface FactsDefinition {
  definition: string;
  indicator: string;
  unit?: string | null;
}

export interface FactsTrend {
  series: SeriesRow[];
  n_points: number;
  unit?: string | null;
}

export interface FactsExtremes {
  high_period: string;
  high_value: Figure;
  low_period: string;
  low_value: Figure;
  absolute_difference: Figure;
  unit?: string | null;
}

export interface FactsComparison {
  period_a: string;
  value_a: Figure;
  period_b: string;
  value_b: Figure;
  absolute_change: Figure;
  percent_change: Figure;
  unit?: string | null;
}

export interface FactsGrowth {
  period_start: string;
  value_start: Figure;
  period_end: string;
  value_end: Figure;
  method: string;
  growth_rate_percent: Figure;
  unit?: string | null;
}

export interface FactsCountryComparison {
  rows: CountryRow[];
  countries_with_no_data: string[];
  unit?: string | null;
}

export interface FactsCountryRanking {
  ranked: CountryRow[];
  countries_with_no_data: string[];
  period_used: string;
  unit?: string | null;
}

export interface FactsOverview {
  overview: OverviewRow[];
}

export interface FactsCapability {
  published_indicator_count: number;
  sectors_covered: string[];
  capability_note: string;
}

export interface FactsCount {
  count: number;
  names: string[];
}

export type Facts = Record<string, unknown>;

/** What the payload turned out to be, once its keys have been read. */
export type FactsKind =
  | 'none'
  | 'latest-value'
  | 'definition'
  | 'trend'
  | 'extremes'
  | 'comparison'
  | 'growth'
  | 'country-comparison'
  | 'country-ranking'
  | 'period-ranking'
  | 'direction-split'
  | 'performance-ranking'
  | 'analysis'
  | 'passages'
  | 'overview'
  | 'capability'
  | 'count'
  | 'unknown';

/**
 * There is no type discriminator in the payload, so the kind is read from which
 * keys exist. Order matters: the most specific signature wins, and anything
 * unrecognised is 'unknown' rather than a guess — a new shape from the service
 * then renders as a plain list instead of disappearing.
 */
export function factsKind(facts: Facts): FactsKind {
  const has = (...keys: string[]) => keys.every((key) => key in facts);
  const keys = Object.keys(facts).filter((key) => !isInternalKey(key));

  // A greeting or a small-talk turn answers with prose and a marker such as
  // {"note": "Greeting — no data needed."}. That marker is the service talking
  // to itself, not data the reader asked for, so nothing is rendered for it.
  if (keys.length === 0 || (keys.length === 1 && keys[0] === 'note')) return 'none';

  if (has('period_start', 'period_end', 'growth_rate_percent')) return 'growth';
  if (has('period_a', 'period_b')) return 'comparison';
  if (has('high_period', 'low_period')) return 'extremes';
  if (has('increasing', 'declining')) return 'direction-split';
  if (has('ranked_indicators')) return 'performance-ranking';
  if (has('analysis')) return 'analysis';
  if (has('passages')) return 'passages';
  if (has('ranked_periods')) return 'period-ranking';
  if (has('ranked')) return 'country-ranking';
  if (has('rows')) return 'country-comparison';
  if (has('series')) return 'trend';
  if (has('definition')) return 'definition';
  if (has('overview')) return 'overview';
  if (has('published_indicator_count')) return 'capability';
  if (has('count', 'names')) return 'count';
  if (has('period_label')) return 'latest-value';
  return 'unknown';
}

/** The unit, wherever a shape carries one. */
export function factsUnit(facts: Facts): string | null {
  const unit = facts['unit'];
  return typeof unit === 'string' && unit.length > 0 ? unit : null;
}

/**
 * The indicator the service actually matched.
 *
 * Present on every successful answer now, and always shown: an answer that
 * describes an indicator without naming it hides a wrong match, which is the
 * one error a reader cannot catch on their own.
 */
export function factsIndicator(facts: Facts): string | null {
  const indicator = facts['indicator'];
  return typeof indicator === 'string' && indicator.length > 0 ? indicator : null;
}

/**
 * A caveat attached to the figures — "Compared at 2025-12, the most recent
 * period all of these countries report". It changes how the answer should be
 * read, so it is never dropped.
 */
export function factsNote(facts: Facts): string | null {
  const note = facts['note'];
  return typeof note === 'string' && note.length > 0 ? note : null;
}

/* ------------------------------------------------------------------ */
/* language of the reply                                               */
/* ------------------------------------------------------------------ */

const ARABIC = /[؀-ۿ]/;

/**
 * The service answers in the language of the *question*, which is not
 * necessarily the language of the interface: a reader can type Arabic while the
 * UI is in English. So direction is decided per reply, from its own characters,
 * never from the language toggle.
 */
export function containsArabic(text: string | null | undefined): boolean {
  return typeof text === 'string' && ARABIC.test(text);
}

export function replyDir(text: string | null | undefined): 'rtl' | 'ltr' {
  return containsArabic(text) ? 'rtl' : 'ltr';
}

/**
 * "… I matched your question to Real GDP (approximate match)" — a
 * low-confidence warning the service appends to the prose. Split out so it can
 * be said plainly instead of trailing off the end of an otherwise confident
 * answer.
 */
export function splitApproximateMatch(answer: string): { body: string; warning: string | null } {
  const match = answer.match(/(^|\n)([^\n]*\(approximate match\)[^\n]*)\s*$/i);
  if (!match || match.index === undefined) return { body: answer, warning: null };
  return { body: answer.slice(0, match.index).trimEnd(), warning: (match[2] ?? '').trim() };
}

/**
 * Countries the service was asked about and holds no approved data for. This
 * is how it reports them rather than silently dropping them, so it is never
 * hidden — see QC finding F-001.
 */
export function countriesWithNoData(facts: Facts): string[] {
  const value = facts['countries_with_no_data'];
  return Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string') : [];
}

/**
 * SCAI's analyst commentary, verbatim — the Council's own writing, attached to a
 * reading. Rendered as quoted and attributed content, never merged into a
 * summary and never styled like generated prose.
 */
export interface AnalysisEntry {
  period_label?: string;
  value?: Figure;
  summary?: string;
  detailed?: string;
  npc_analysis?: string;
  benchmark?: string;
  [key: string]: unknown;
}

/**
 * One line of a multi-metric answer. Each carries its **own** period, so no
 * shared period may be stated across them.
 */
export interface OverviewEntry {
  indicator?: string;
  /** Carries its own scale: 'QAR bn', 'million', '%', or '' for none. */
  unit?: string | null;
  granularity?: string;
  period_label?: string;
  actual?: Figure | number;
  change_yoy_percent?: Figure | number;
  /** Lead with the year-on-year change rather than the level. */
  report_as_growth?: boolean;

  /* The same period one year earlier. All three are optional per row: a series
     with no comparable reading a year back simply has none, and an absent
     figure means no movement is known — never that nothing moved. */
  previous_value?: Figure | number;
  previous_period?: string;
  /** SCAI's own Format column: how many decimals this indicator is shown to. */
  decimal_places?: number;

  asked_as?: string;
  target?: Figure | number | null;
  [key: string]: unknown;
}

/**
 * 'macro' marks the curated headline snapshot, which is shown as a before →
 * after comparison. An overview without the marker is a list of metrics the
 * reader named, and stays compact.
 */
export function overviewKind(facts: Facts): string | null {
  const kind = facts['overview_kind'];
  return typeof kind === 'string' && kind.length > 0 ? kind : null;
}

/**
 * One indicator in a performance ranking.
 *
 * `attainment_percent` is the whole answer: it is the sort key, the bar length
 * and the score, and it already has polarity applied. Recomputing it from
 * `actual / target` inverts every `Decrease` indicator — a cost that came in
 * under target would read as a failure — so it is used exactly as given.
 */
export interface RankedIndicator {
  indicator: string;
  attainment_percent: number;
  actual: Figure | number;
  /** Per row, never per answer: these are different indicators. */
  unit: string;
  period_label: string;
  target: Figure | number;
  /** 'Increase' — higher is better. 'Decrease' — lower is better. */
  polarity: string;
  /** 'period' — filed against that reading. 'indicator' — a standing goal. */
  target_basis: string;
  target_year: number | string | null;
  [key: string]: unknown;
}

/**
 * One indicator in a group split by direction of travel.
 *
 * `polarity` says which way is welcome — 'Increase' means a higher value is the
 * better outcome, 'Decrease' means a lower one is. Inflation, Cost per Student
 * and PISA Rank are all `Decrease`, so a fall is the good news. Nothing here
 * assumes up is good.
 */
export interface DirectionRow {
  indicator: string;
  change_yoy_percent?: number | Figure;
  actual?: number | Figure;
  /** Per row, already at display scale. May be '' where there is no unit. */
  unit?: string;
  period_label?: string;
  polarity?: string;
  /** Present on `no_comparison` rows. */
  reason?: string;
  [key: string]: unknown;
}

function directionRows(facts: Facts, key: string): DirectionRow[] {
  const value = facts[key];
  return Array.isArray(value) ? (value as DirectionRow[]) : [];
}

export function increasingRows(facts: Facts): DirectionRow[] {
  return directionRows(facts, 'increasing');
}

export function decliningRows(facts: Facts): DirectionRow[] {
  return directionRows(facts, 'declining');
}

export function unchangedRows(facts: Facts): DirectionRow[] {
  return directionRows(facts, 'unchanged');
}

/**
 * Indicators with no published year-on-year figure. They are **not**
 * "unchanged" and are never shown as such: an answer that silently covers 6 of
 * 8 indicators is a false picture of the group.
 */
export function noComparisonRows(facts: Facts): DirectionRow[] {
  return directionRows(facts, 'no_comparison');
}

/** An indicator that could not be scored, and why. */
export interface NotAssessable {
  indicator: string;
  reason: string;
  actual: Figure | number | null;
  target: Figure | number | null;
  unit?: string;
  period_label?: string | null;
  polarity?: string;
  [key: string]: unknown;
}

export function rankedIndicators(facts: Facts): RankedIndicator[] {
  const value = facts['ranked_indicators'];
  return Array.isArray(value) ? (value as RankedIndicator[]) : [];
}

export function notAssessable(facts: Facts): NotAssessable[] {
  const value = facts['not_assessable'];
  return Array.isArray(value) ? (value as NotAssessable[]) : [];
}

/** Excerpts from SCAI articles — also the Council's published writing. */
export interface PassageEntry {
  article_title?: string;
  article_id?: string;
  excerpt: string;
  match?: string;
  distance?: number;
  [key: string]: unknown;
}

export function factsAnalysis(facts: Facts): AnalysisEntry[] {
  const value = facts['analysis'];
  return Array.isArray(value) ? (value as AnalysisEntry[]) : [];
}

/**
 * Keys the service uses for its own diagnostics — `_verifier_rejected_numbers`,
 * `_plain_reading_rejected`. They are never rendered; an unknown *shape* is
 * shown to the reader, but an internal field is not part of the answer.
 */
export function isInternalKey(key: string): boolean {
  return key.startsWith('_');
}

/** The readable half of a facts object, with diagnostics stripped. */
export function publicFacts(facts: Facts): Facts {
  const out: Facts = {};
  for (const [key, value] of Object.entries(facts)) {
    if (!isInternalKey(key)) out[key] = value;
  }
  return out;
}

export function factsPassages(facts: Facts): PassageEntry[] {
  const value = facts['passages'];
  return Array.isArray(value) ? (value as PassageEntry[]) : [];
}

/** What the passage search was for. */
export function factsTopic(facts: Facts): string | null {
  const topic = facts['topic'];
  return typeof topic === 'string' && topic.length > 0 ? topic : null;
}

/* ------------------------------------------------------------------ */
/* charts                                                              */
/* ------------------------------------------------------------------ */

export interface ChartSpec {
  chart_type: 'line' | 'bar' | string;
  title: string;
  unit: string | null;
  decimal_places: number;
  /** Read the data generically through these, never by hard-coded key. */
  x_field: string;
  y_field: string;
  data: Record<string, unknown>[];
  /** Present on a macro overview: units differ per bar, so no shared axis. */
  note?: string | null;
  /** Present on comparison charts. */
  missing_countries?: string[];
}

/** A plotted point. Values are parsed here, once, and never re-parsed. */
export interface SeriesPoint {
  label: string;
  value: number;
}

/**
 * Figures arrive as strings ("185.17"). This is the only place they become
 * numbers; a NaN is dropped rather than plotted as zero, which would invent a
 * data point the service never published.
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function chartPoints(spec: ChartSpec): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const row of spec.data) {
    const value = toNumber(row[spec.y_field]);
    const label = row[spec.x_field];
    if (value === null || typeof label !== 'string') continue;
    points.push({ label, value });
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* reading the response                                                */
/* ------------------------------------------------------------------ */

export function isFound(payload: FactsPayload): payload is FactsFound {
  return payload.ok;
}

/**
 * The indicators an ambiguous question could have meant.
 *
 * This is the structured field, not the message text: the service remembers
 * what it offered and resolves the exact indicator when one comes back. So each
 * candidate is resent **verbatim** — trimmed, retitled or reworded, it will not
 * match what the service is holding.
 */
export function factsCandidates(facts: Facts | undefined): string[] {
  const candidates = facts?.['candidates'];
  if (!Array.isArray(candidates)) return [];
  return candidates.filter((name): name is string => typeof name === 'string' && name.length > 0);
}

/**
 * `answer` already ends with its own `Sources:` footer. Rendering the citations
 * underneath it as well shows every source twice, so the footer is split off
 * and the citations are rendered properly instead.
 *
 * If the footer is not found — a different phrasing, another language — the
 * answer is returned whole and untouched, and the caller shows no separate
 * citation list.
 */
export function splitSourcesFooter(answer: string): { body: string; hasFooter: boolean } {
  const match = answer.match(/\n\s*(?:Sources|المصادر)\s*:\s*\n/);
  if (!match || match.index === undefined) return { body: answer, hasFooter: false };
  return { body: answer.slice(0, match.index).trimEnd(), hasFooter: true };
}

/** Exhaustiveness guard. */
export function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}
