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
   * Per-user, and a real value: follow-ups ("and last year?") resolve against
   * server-side state keyed on this. Omitting it puts every user in one
   * conversation.
   */
  session_id: string;
  /** Prior turns as plain text. Used only for follow-up detection. */
  conversation_context: string;
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
  const keys = Object.keys(facts);

  // A greeting or a small-talk turn answers with prose and a marker such as
  // {"note": "Greeting — no data needed."}. That marker is the service talking
  // to itself, not data the reader asked for, so nothing is rendered for it.
  if (keys.length === 0 || (keys.length === 1 && keys[0] === 'note')) return 'none';

  if (has('period_start', 'period_end', 'growth_rate_percent')) return 'growth';
  if (has('period_a', 'period_b')) return 'comparison';
  if (has('high_period', 'low_period')) return 'extremes';
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
 * Countries the service was asked about and holds no approved data for. This
 * is how it reports them rather than silently dropping them, so it is never
 * hidden — see QC finding F-001.
 */
export function countriesWithNoData(facts: Facts): string[] {
  const value = facts['countries_with_no_data'];
  return Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string') : [];
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
 * An ambiguous match names the candidates inside its message, in double quotes:
 * `"GDP forecast" could match … "GDP", "GDP Growth Demo", "Real GDP".`
 *
 * Pulling them out turns a dead end into one click. The first quoted run is the
 * term the reader used, so it is excluded — offering it back would just repeat
 * the ambiguous question.
 */
export function ambiguousChoices(message: string): string[] {
  const quoted = [...message.matchAll(/"([^"]{1,80})"/g)].map((m) => m[1] ?? '');
  if (quoted.length < 3) return [];
  const [asked, ...rest] = quoted;
  const unique = [...new Set(rest.filter((name) => name && name !== asked))];
  return unique.length >= 2 ? unique : [];
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
