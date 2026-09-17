/**
 * The Ask AI wire contract.
 *
 * The shapes here are the backend's, exactly: `POST /api/ask` and
 * `GET /api/health` on the Python service. Nothing in this file is invented by
 * the client — every figure, sentence, caveat and reason is composed once by
 * the service and rendered here as-is.
 *
 * A few fields are marked EXTENSION. The service does not send them today; the
 * client renders them when a response carries them and never requires them.
 */

export type Lang = 'en' | 'ar';
export type SourceSel = 'approved' | 'external';

export interface AskRequest {
  question: string;
  lang: Lang;
  /** ['approved'] | ['external'] | ['approved','external']. Anything else: 422. */
  sources: SourceSel[];
  /** Echo the previous response's value to continue the thread. */
  conversation_id: string | null;
  /**
   * EXTENSION. Set when the reader picks a candidate from a `clarification`
   * package: complete the *original* question against that indicator.
   */
  resolve_detail_id?: string | null;
  /**
   * EXTENSION. Set by the "not this indicator" control on an inheritance
   * banner: list the indicators this question could mean instead of carrying
   * the previous turn's subject forward.
   */
  disambiguate?: boolean;
}

/** Only these keys go on the wire. Extensions stay client-side. */
export const WIRE_REQUEST_KEYS = ['question', 'lang', 'sources', 'conversation_id'] as const;

export type Provenance = 'approved' | 'external';
export type PackageKind = 'answer' | 'refusal' | 'clarification';

/** How far the content can be trusted. Governs visual treatment only. */
export type ElementClass =
  | 'measured' // a published row
  | 'derived' // computed, inputs stated
  | 'attributed' // analyst text bound to a datapoint
  | 'article' // published editorial
  | 'external' // third-party content, always caveated
  | 'absent'; // "no commentary published" — content, not a hole

/** Where the content goes on screen. Governs layout slot only. */
export type ElementRole =
  | 'headline'
  | 'series'
  | 'delta'
  | 'evidence'
  | 'analysis'
  | 'commentary'
  | 'scope'
  | 'note';

/** The six refusals. Each reads differently; none of them is an error. */
export type RefusalCode =
  | 'no-such-indicator'
  | 'not-approved-for-publication'
  | 'published-with-no-data'
  | 'no-data-for-this-selection'
  | 'question-not-supported'
  | 'data-could-not-be-reached';

/** EXTENSION. A charted series, when a response carries the points. */
export interface SeriesPoint {
  label: string; // period label, e.g. '2026-04' or '2021'
  value: number;
}

export interface AnswerElement {
  class: ElementClass;
  role: ElementRole;
  /** Fully composed, already in the requested language. Rendered as-is. */
  text: string;
  /** 'detail|period|country|source'. Empty country means national. */
  source_ref: string;

  /* EXTENSIONS — rendered when present, never required. */
  value?: string;
  unit?: string;
  period?: string;
  publisher?: string;
  article?: { title: string; date: string };
  series?: SeriesPoint[];
}

/** A slot the service either bound to something, or could not bind. */
export type Bound<T> = { bound: T };
export type Unbound = { unbound: string };

export type DetailIdSlot = Bound<string> | Unbound;
export type CountryScope = 'national' | 'named' | 'declared_benchmarks';

/**
 * A period is either pinned to an exact value, deferred to whatever is latest,
 * or something this client has not seen yet — hence the open third arm.
 */
export type PeriodSlot =
  | { bound: { exact: string } }
  | { deferred: { latest: true } }
  | Record<string, unknown>;

export interface AnswerSpec {
  spec_version: number;
  today: string; // '2026-09-17'
  detail_id: DetailIdSlot;
  period: PeriodSlot;
  country_scope: Bound<CountryScope>;
  measure: Bound<string>;
  operation: Bound<string>;
  /** Open vocabulary, e.g. {"detail":"named-in-question"}. */
  bound_by: Record<string, string>;
  /** What a deferred period ACTUALLY resolved to. */
  resolved_period: string | null;
  /** Present ONLY when country_scope is 'named'. */
  countries?: string[];
}

export interface Chartable {
  available: boolean;
  default_view: string | null;
  alternate_views: string[];
}

export interface Degradation {
  kind: string;
  where: string;
  detail: string;
}

/** EXTENSION. A next step the service knows exists, rendered as a chip. */
export interface Suggestion {
  label: string;
  question: string;
}

/** EXTENSION. One of the indicators a question could have meant. */
export interface Candidate {
  detail_id: string;
  name: string;
  /** Pre-rendered scope line: 'monthly · Qatar national · April 2026'. */
  scope: string;
  /** Latest published value, as a preview. Null when nothing is published. */
  latest: { value: string; unit: string; period: string } | null;
}

interface PackageBase {
  provenance: Provenance;
  /** A rendered sentence, already in the requested language. */
  agent: string;
  spec: AnswerSpec;
  /** EMPTY for refusal and clarification. */
  elements: AnswerElement[];
  chartable: Chartable;
  /** null on approved; always a string on external content. */
  caveat: string | null;
  /** The sentence; null on an answer. */
  reason: string | null;
  degradations: Degradation[];
  /** EXTENSION. */
  suggestions?: Suggestion[];
}

export interface AnswerPackageAnswer extends PackageBase {
  kind: 'answer';
  /** Omitted on an answer — never null. */
  reason: null;
}

export interface AnswerPackageRefusal extends PackageBase {
  kind: 'refusal';
  reason: string;
  reason_id: string;
  refusal_code: RefusalCode;
}

/**
 * A well-asked question the service cannot narrow on its own. It carries a
 * `reason_id` but no `refusal_code`, because it is not a failure and is not
 * counted as one.
 */
export interface AnswerPackageClarification extends PackageBase {
  kind: 'clarification';
  reason: string;
  reason_id: string;
  /** EXTENSION. */
  candidates?: Candidate[];
}

/**
 * Discriminated on `kind` so a new backend variant is a compile error in every
 * switch rather than a blank card.
 */
export type AnswerPackage =
  | AnswerPackageAnswer
  | AnswerPackageRefusal
  | AnswerPackageClarification;

export type ExternalOutcome = 'success' | 'timeout' | 'unavailable' | 'abandoned';

/**
 * The single home for third-party prose.
 *
 * The key being ABSENT from the response means no external agent was admitted.
 * An external agent that was asked and failed is PRESENT, saying so. Those are
 * different states and must not render the same way.
 */
export interface ExternalBlock {
  provenance: 'external';
  agent: string;
  /** Unconditional. Rendered above the prose, never hidden. */
  caveat: string;
  outcome: ExternalOutcome;
  /** Text ONLY when outcome is 'success'. */
  prose: string | null;
  reason: string | null;
  check: null | {
    band: string;
    limits: string;
    found: string[];
    beyond: string[];
    flagged: boolean;
  };
  elapsed_seconds: number;
  degradations: Degradation[];
}

export interface Freshness {
  refreshed_at: string | null;
  stale: boolean;
  age_seconds: number;
}

/** EXTENSION. What the service carried over from an earlier turn. */
export interface Inheritance {
  carried: string; // 'Consumer price inflation · Qatar national'
  changed: string[]; // ['frequency → quarterly', 'period → 2026-Q1']
}

export interface AskResponse {
  conversation_id: string;
  packages: AnswerPackage[];
  freshness: Freshness;
  /** PRESENT ONLY when an external agent was asked. */
  external?: ExternalBlock;
  /** EXTENSION. */
  inherited?: Inheritance | null;
}

/** `GET /api/health` returns the same freshness block as an answer. */
export interface HealthResponse {
  freshness: Freshness;
}

/* ------------------------------------------------------------------ */
/* reading the contract                                                 */
/* ------------------------------------------------------------------ */

/**
 * `refusal_code` is OMITTED on an answer and on a clarification, not null, so
 * presence is the test — never truthiness.
 */
export function hasRefusalCode(pkg: AnswerPackage): pkg is AnswerPackageRefusal {
  return 'refusal_code' in pkg;
}

export function isBound<T>(slot: Bound<T> | Unbound | Record<string, unknown>): slot is Bound<T> {
  return typeof slot === 'object' && slot !== null && 'bound' in slot;
}

/** The indicator the spec bound to, or null when nothing was bound. */
export function boundDetailId(spec: AnswerSpec): string | null {
  return isBound<string>(spec.detail_id) ? spec.detail_id.bound : null;
}

/** Why the period slot could not be filled, when it could not be. */
export function unboundReason(slot: DetailIdSlot): string | null {
  return 'unbound' in slot ? slot.unbound : null;
}

/** True when the reader asked for "now" rather than a named period. */
export function isDeferredPeriod(spec: AnswerSpec): boolean {
  return typeof spec.period === 'object' && spec.period !== null && 'deferred' in spec.period;
}

/** The exact period asked for, when one was named. */
export function exactPeriod(spec: AnswerSpec): string | null {
  const period = spec.period as { bound?: { exact?: string } };
  return period?.bound?.exact ?? null;
}

/**
 * What the answer is actually as of. `resolved_period` is what a deferred
 * period resolved to and is the most common question about an answer, so it
 * wins over the exact period whenever it is present.
 */
export function asOfPeriod(spec: AnswerSpec): string | null {
  return spec.resolved_period ?? exactPeriod(spec);
}

export interface SourceRefParts {
  detail: string;
  period: string;
  /** Empty means national. */
  country: string;
  source: string;
}

/** 'detail|period|country|source' — split, never reformatted. */
export function parseSourceRef(ref: string | undefined): SourceRefParts | null {
  if (!ref) return null;
  const [detail = '', period = '', country = '', source = ''] = ref.split('|');
  return { detail, period, country, source };
}

/**
 * Known backend defect: the external answer currently appears in BOTH
 * `packages` and `external`. `external` is the single home for third-party
 * prose, so an external entry in `packages` is dropped here rather than being
 * rendered twice.
 */
export function approvedPackages(packages: AnswerPackage[]): AnswerPackage[] {
  return packages.filter((pkg) => pkg.provenance !== 'external');
}

/** Exhaustiveness guard for `kind` / `class` switches. */
export function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}
