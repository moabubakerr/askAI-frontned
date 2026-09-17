# Ask AI — web client

Bilingual (English / Arabic) question-answering UI over Qatar's national economic indicator data,
for the Supreme Council for Economic Affairs and Investment.

Every figure on screen is read from an approved published row. Nothing is generated, estimated or
smoothed by this client. The UI's job is to make that provenance visible without burying the answer
in citations: the reader sees the figure immediately, and reaches the published row it came from in
one more interaction.

## Running it

```bash
npm install
npm run dev        # fixtures, no backend needed
```

| Script              | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Vite dev server on :5173                    |
| `npm run build`     | `tsc --noEmit` then a production bundle     |
| `npm run typecheck` | `tsc --noEmit`                              |
| `npm test`          | Vitest, single run                          |

## Swapping in the Python service

The API is **always same-origin**. Client code calls `/api/ask` and `/api/health` as relative paths
— there is no API host or port anywhere in the bundle, and no variable to put one there. Something
in front of the app proxies `/api` to the service: the Vite dev server in development, nginx in the
container. The browser therefore never makes a cross-origin request, and the service's missing CORS
middleware never matters.

```bash
npm run dev                                          # fixtures (VITE_USE_FIXTURES=true in .env)
API_UPSTREAM=http://localhost:17900 npm run dev      # real service, proxied through :5173
```

| Variable            | Read by            | Default                  |
| ------------------- | ------------------ | ------------------------ |
| `VITE_USE_FIXTURES` | the bundle         | unset — call the service |
| `API_UPSTREAM`      | the proxy (dev server, or nginx in the container) | `http://localhost:17900` in dev, `http://askai-api:8000` in the container |
| `CALLER_ID`         | the proxy          | `askai-web`              |

`X-Caller-Id` is set by the proxy, server-side, and overwrites anything the browser sent. A client
that can set it can forge it, so the client never sets it.

The test suite pins `VITE_USE_FIXTURES=true` in `vite.config.ts`, so it always runs on fixtures
whatever `.env` says.

## Deployment

`DEPLOY.md` is the operational document. In short: `Dockerfile` is a two-stage build (Node builds,
`nginxinc/nginx-unprivileged` serves), `docker-compose.frontend.yml` publishes it on host port
**17000** and joins `kap_shared_network`, and the same container proxies `/api` to `API_UPSTREAM`
(default `http://askai-api:8000` — the API by service name, never `localhost`, which inside a
container is that container).

Fonts are bundled from `node_modules` at build time (`src/styles/fonts.css`); the shipped HTML
references no CDN, no Google Fonts and no remote script, so the page renders fully offline.

`src/api/client.ts` is the only module that knows whether the app is on fixtures or on the live
service. With no `VITE_API_BASE` it resolves from `src/api/fixtures.ts` after ~400 ms so loading
states are real; with it set it `POST`s to `{API_BASE}/api/ask` and reads `{API_BASE}/api/health`.
Caller identity goes in the `X-Caller-Id` header (`VITE_CALLER_ID`, default `askai-web`), never in
the body. Nothing outside `src/api/` imports `fixtures.ts`, and no component knows which mode is
active. Deleting `fixtures.ts` and the lines that reference it is the whole migration.

### The contract, and how this client obeys it

`src/api/types.ts` is the wire contract, exactly as the service sends it. The rules that shaped the
UI:

| Rule                                                    | Where it lives                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Branch on `kind`, handle all three                       | `PackageCard.KindBlock` — the only switch; a new variant is a compile error |
| `refusal` is terminal, `clarification` invites more      | `RefusalCard` vs `ClarificationBody` — different UI, never one "error" state |
| `reason_id` / `refusal_code` are omitted, not null       | `hasRefusalCode()` tests presence, never truthiness                         |
| Never format, round or reconstruct a number              | `LocalizedText` / `splitRuns` change no character; `formatNumber` is for client-composed text only |
| Never hold a client label table                          | `agent`, `reason`, `caveat` and every `text` render as they arrived         |
| `class` and `role` stay two fields                       | `role` picks the slot, `class` picks the badge — `elements.ts`              |
| Render `class: "absent"`                                 | `BasisList` — it is content, not a gap                                      |
| Use `resolved_period`                                    | `ScopeLine` — the "As of …" affordance, from `asOfPeriod()`                 |
| Show staleness                                           | `FreshnessChip` (from `age_seconds`) plus a badge on every card             |
| External caveat always, above the prose                  | `ExternalPanel` — and the panel is the only home for third-party prose      |
| 422 has no `packages`                                    | `AskRejectedError`, checked before the body is read; its own turn state     |

Known-unstable, handled rather than hard-coded against: the external answer still arrives in **both**
`packages` and `external`, so `approvedPackages()` drops the `provenance: "external"` entry from
`packages`; and `comparison` / `rank` / `spread` / `extremum` come back as `question-not-supported`,
which renders as an ordinary refusal.

These fields are **extensions**: the service does not send them today, the client renders them when a
response carries them, and nothing requires them. They are marked EXTENSION in `types.ts`.

| Extension                                   | Why                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `AnswerPackageClarification.candidates[]`    | Name, scope line and latest published value for each candidate         |
| `suggestions[]` on answers and refusals      | Next-step chips; the client never invents one                          |
| `AnswerElement.series[]`                     | The points behind a `role: 'series'` element                            |
| `AnswerElement.value` / `.unit`              | The same figure split out for the large type, never re-rounded          |
| `AnswerElement.period` / `.publisher`        | Evidence rows, where `source_ref` does not already carry them           |
| `AskResponse.inherited`                      | What a follow-up carried over, and what it changed                     |
| `AskRequest.resolve_detail_id`               | The reader picked a candidate — complete the *original* question       |
| `AskRequest.disambiguate`                    | "Not this indicator" — list the candidates instead of inheriting       |

Extension request fields never go on the wire: `client.ts` sends only `WIRE_REQUEST_KEYS`.

Two axes stay independent throughout. `class` (`measured`, `derived`, `attributed`, `article`,
`external`, `absent`) decides visual treatment only — it resolves to colour in `styles/base.css` and
nowhere else. `role` decides the layout slot only. The same `analysis` role arrives as `attributed`
from an analyst note and as `article` from a dated opinion piece, and they do not look alike.

## What is where

```
Dockerfile  nginx.conf.template  docker-compose.frontend.yml  DEPLOY.md
src/
  api/          types.ts  client.ts  fixtures.ts     the only door to the data
  i18n/         en.ts  ar.ts  useI18n.tsx  formatNumber.ts  LocalizedText.tsx
  state/        useConversation.tsx                  turns, source, lens, ask()
  components/   Header SubBar FreshnessChip Composer SourceSelector LensToggle
                Thread Turn InheritanceBanner FirstRun ExternalPanel
                PackageCard ProvenanceChip ScopeLine Headline BasisList
                AnalysisBlock EvidenceDisclosure RefusalCard ClarificationBody
                CandidateList Callouts
                Chart/  (Chart LineView BarView TableView geometry)
  styles/       tokens.css  base.css  fonts.css   (bundled faces, no CDN)
  test/
```

Plain CSS: tokens in `:root`, a CSS module per component. No component framework, no Tailwind, no
charting library, no data-fetching library. Charts are hand-rolled inline SVG, which is what lets
them obey `chartable` exactly — no view button ever appears that the backend did not declare.

## Reaching every state

Type any of these (substring matching, in either language):

| Question                                                    | State                                    |
| ----------------------------------------------------------- | ---------------------------------------- |
| `What was CPI inflation in April 2026?`                      | value answer, chart, absent basis line    |
| `Show total goods exports since 2018`                        | 8-point series, analyst note + article    |
| `How did GDP change from Q1 to Q2 2025?`                     | derived comparison (bar + table only)     |
| `Did inflation exceed 3% in 2025?`                           | yes/no answer                             |
| `What is the inflation rate?`                                | clarification, 4 candidates               |
| `What is the GDP growth forecast for 2027?`                  | refusal + external answer of −28.76%      |
| `Visitor arrivals this year`                                 | refusal: published but empty              |
| `Compare female labour force participation with the GCC`     | refusal: `no-data-for-this-selection`     |
| `Rank published indicators by growth`                        | refusal: `question-not-supported` (comparison is not implemented) |
| `Why did exports fall?`                                      | refusal: `question-not-supported`         |
| `International reserves`                                     | refusal: `data-could-not-be-reached`, stale badge, external timeout |
| anything unmatched                                           | refusal: `no-such-indicator`              |

Follow-ups need a prior turn: `and quarterly?` and `what about 2022?` both return an inheritance
banner, and the second also reports a changed grain in the answer text and in `degradations`.

Switch the source selector to **Combined — never blended** on the GDP or forecast question to see
the approved card with the external panel below it, caveat first and nothing reconciled between them.
Ask `International reserves` in Combined to see an external agent that was asked and *failed* —
a different state from one that was never admitted, which renders no panel at all.

## Tests

`npm test` covers the acceptance points that are easy to regress:

- toggling the lens issues **zero** requests, and both lenses show the same figure
- the scope line is present in both lenses for every package, including the "As of …" period
- `absent` basis lines survive the Executive lens; explore-only content does not
- a refusal and a clarification render as different states, and only the refusal carries a code
- the external caveat renders *above* the prose, and survives the Executive lens
- an external agent that failed says so; one that was never asked renders no panel
- an approved refusal and an external answer are shown together, never one instead of the other
- a package with no evidence rows gets no evidence affordance
- only the declared chart views appear, and none when `chartable.available` is false
- every state above is reachable by typing
- backend prose is rendered character-for-character; bidi isolation only; `dir`/`lang` flip on the toggle

## Local environment note

If `npm` fails here with `EPERM … C:\Users\Administrator\AppData`, it is because `C:\nodejs` is a
symlink into another user's profile. Run npm with symlink resolution off:

```powershell
$env:NODE_OPTIONS="--preserve-symlinks --preserve-symlinks-main"
npm install
```
