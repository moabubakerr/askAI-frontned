# Ask AI — web client

Bilingual (English / Arabic) question-answering UI over Qatar's national economic indicator data,
for the Supreme Council for Economic Affairs and Investment. It talks to the askAI v2 service:
`POST /chat` per question, `POST /read` for the read-it-for-me view, and the
`/session/{id}` endpoints for the conversation the server now keeps. One JSON response each, no streaming.

Every figure on screen comes from the approved dataset, and the UI's job is to keep that visible:
the reader sees the answer immediately, the structured facts behind it, and where each row came
from — including whether a row is SCAI-approved or raw working data.

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

## Talking to the service

The API is **always same-origin**. Client code calls `/api/chat` and `/api/health` as relative
paths — there is no API host or port anywhere in the bundle, and no variable to put one there.
Whatever serves the app proxies `/api/` to the service and strips the prefix: the Vite dev server
in development, nginx in the container. The browser therefore never makes a cross-origin request,
which is what makes the service's missing CORS middleware a non-issue.

```bash
npm run dev                                          # fixtures (VITE_USE_FIXTURES=true in .env)
API_UPSTREAM=http://localhost:18000 npm run dev      # real service, proxied through :5173
```

| Variable            | Read by            | Default                    |
| ------------------- | ------------------ | -------------------------- |
| `VITE_USE_FIXTURES` | the bundle         | unset — call the service   |
| `API_UPSTREAM`      | the proxy (dev server, or nginx in the container) | `http://localhost:18000` in dev, `http://host.docker.internal:18000` in the container |
| `CALLER_ID`         | the proxy          | `askai-web`                |

`X-Caller-Id` is set by the proxy, server-side, and overwrites anything the browser sent.

The test suite pins `VITE_USE_FIXTURES=true` in `vite.config.ts`, so it always runs on fixtures
whatever `.env` says.

## What the contract forces, and where it lives

| Rule | Where |
| --- | --- |
| `ok`, not the status code, decides success — "no data" is HTTP 200 | `AnswerCard`, which styles `ok: false` as an answer, never an error |
| Figures arrive as **strings** and must be parsed before use | `toNumber` in `api/types.ts`; `i18n/figures.ts` formats, and never re-rounds |
| `facts` has no type discriminator — read the keys | `factsKind()`, and `FactsPanel` which renders an unknown shape rather than dropping it |
| `answer` already carries its `Sources:` footer | `splitSourcesFooter()` — the footer is split off so citations render once |
| `countries_with_no_data` must be displayed | `FactsPanel` → `NoDataCountries` (QC finding F-001) |
| Charts honour `unit` and `decimal_places` | `Chart` and the three views (F-004) |
| An ambiguous match must not be a dead end | `ambiguousChoices()` → clickable chips that resend (F-003 / F-012) |
| `verified: false` is **not** shown to the reader — the data is correct | logged by `useConversation` and counted in the Session panel, so the backend gap stays visible |
| `/read` prose lives in `narration` only | `sameProse()` drops a `one_liner` that repeats it |
| `answer` and `facts.definition` are the same string | `FactsPanel` renders nothing for a definition; the prose is already on screen |
| `period_mismatch` must not carry the Council's name to another period | `ReadPanel` — neutral label plus a caution |
| A trend shows its readings once | `FactsPanel` skips the table when a chart is rendering; the chart's Table view is the other half of the toggle |
| Trend summary figures are computed server-side | stat tiles: first → latest, % change, peak, trough |
| `table` distinguishes approved from raw | `Citations`, which badges each row |
| `session_id` must be stable per user — the **server** holds the transcript | `useConversation`; no `conversation_context` is ever sent |
| A new conversation must `DELETE /session/{id}` | `reset()` — otherwise the old indicator leaks into an unrelated question |
| Council analysis and generated prose must never share a block | `ReadPanel` — separate surfaces, attribution on one, disclaimer on the other |
| The read view is offered **iff** `readable === true` | `AnswerCard` — the service decides; no client heuristic |
| Ambiguity chips come from `facts.candidates`, resent verbatim | `factsCandidates()` — the message text is never parsed |
| `facts.analysis[]` and `facts.passages[]` are SCAI's own writing | `CouncilText` — one shared quoted block, so they can never drift toward looking generated |
| `facts.indicator` is named on every answer | `AnswerCard` — an unnamed indicator hides a wrong match |
| `facts.note` is a caveat and must show | `AnswerCard`, except when a `note` is the whole payload (a greeting marker) |
| "(approximate match)" is a low-confidence warning | `splitApproximateMatch()`, rendered as its own warning |
| Direction follows the **reply** | `replyDir()`. There is no language toggle: the reader picks by typing, and the service answers in kind |
| The first request after a restart takes ~10s | 90s client timeout, patient spinner, no 5s cutoff anywhere |
| `GET /health` proves only that the process is up | the SubBar says "service responding" and nothing more |

## Deployment

`DEPLOY.md` is the operational document. In short: `Dockerfile` is a two-stage build (Node builds,
`nginxinc/nginx-unprivileged` serves), `docker-compose.frontend.yml` publishes it on host port
**17000**, and the same container proxies `/api/*` to `API_UPSTREAM` (default
`http://host.docker.internal:18000` — never `localhost`, which inside a container is that
container).

Fonts are bundled from `node_modules` at build time (`src/styles/fonts.css`); the shipped HTML
references no CDN, no Google Fonts and no remote script, so the page renders fully offline.

## What is where

```
Dockerfile  nginx.conf.template  docker-compose.frontend.yml  DEPLOY.md
src/
  api/          types.ts  client.ts  fixtures.ts     the only door to the data
  i18n/         en.ts  ar.ts  useI18n.tsx  figures.ts  formatNumber.ts  LocalizedText.tsx
  state/        useConversation.tsx                  turns, session id, ask()
  components/   Header SubBar Composer Thread Turn FirstRun
                AnswerCard FactsPanel Citations CouncilText ReadPanel SessionPanel Segmented
                Chart/  (Chart LineView BarView TableView geometry)
  styles/       tokens.css  base.css  fonts.css   (bundled faces, no CDN)
  test/
```

Plain CSS: tokens in `:root`, a CSS module per component. No component framework, no Tailwind, no
charting library, no data-fetching library. Charts are hand-rolled inline SVG, which is what lets
them follow the spec exactly — `x_field`/`y_field` are read generically, so a chart over countries
plots like one over periods with no special case.

## Reaching every state

Type any of these (substring matching, in either language):

| Question | State |
| --- | --- |
| `What is the latest value of Real GDP?` | value + target |
| `Show the Real GDP trend over time` | 8-point series, line chart, table view |
| `What does inflation mean?` | definition — prose only, catalog-level citation |
| `What are the highest and lowest values?` | extremes + difference |
| `Compare 2025-Q1 against 2025-Q4` | period comparison, signed change |
| `What was the growth rate of Real GDP?` | growth rate + method |
| `Compare Real GDP across Qatar and Saudi Arabia` | country rows, bar chart, **countries with no data** |
| `Rank the countries by Real GDP` | ranking + period used |
| `Give me a macro overview` | per-row units, and the "not a shared scale" warning |
| `What can you do?` | capability |
| `How many indicators are there?` | count + names |
| `Give me the blunt version` | `verified: false` marker |
| `What is the GDP forecast?` | ambiguous — clickable choices |
| `What were the strongest quarters?` | period ranking + order |
| `Show me the analyst commentary` | SCAI commentary, attributed, with bullets |
| `Show me articles on diversification` | article excerpts behind "Show sources" |
| `What is labor productivity?` | approximate-match warning |
| `ما الناتج المحلي الإجمالي الحقيقي؟` | Arabic reply, RTL, with the UI still in English |
| `Tell me about GDP Growth Demo` | no data, as an answer not an error |
| anything unmatched | no match, honestly |

## Tests

`npm test` covers the parts of the contract that are easy to regress:

- every facts shape renders its own structure, and an unknown shape still renders
- `ok: false` is an answer, not a failure — no retry affordance, nothing red
- string figures are parsed, grouped, and never re-rounded
- the `Sources:` footer is not rendered twice
- `countries_with_no_data` is always shown
- approved rows and raw working data are visibly different
- a null `indicator` renders a fallback, never a literal "None"
- charts honour `decimal_places`, carry the overview warning and name missing countries
- an ambiguous match becomes clickable choices that resend
- a timeout offers a retry and explains the slow first request
- `session_id` is real, stable across turns, and prior turns go in `conversation_context`
- the read view is offered only when `readable` is true, whatever shape the answer has
- the read view keeps Council analysis and generated prose in separate blocks, with the disclaimer
- ambiguity chips come from `facts.candidates` and resend the name verbatim on the same session
- analyst commentary and article excerpts both render as attributed Council writing
- summary bullets render as a list, and the raw readings stay behind a disclosure
- the session id is stable, no transcript is sent, and a new conversation deletes the old session
- direction follows the reply, so an Arabic answer is RTL with the interface unchanged
- there is no language control to get out of step with the answer
- Arabic numerals, `dir`/`lang` flip on the toggle

## Local environment note

If `npm` fails here with `EPERM … C:\Users\Administrator\AppData`, it is because `C:\nodejs` is a
symlink into another user's profile. Run npm with symlink resolution off:

```powershell
$env:NODE_OPTIONS="--preserve-symlinks --preserve-symlinks-main"
npm install
```
