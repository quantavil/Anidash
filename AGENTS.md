# AGENTS.md — AniDash 0.1.3 Engineering Contract

## Stack

Svelte 5 (Runes) + SvelteKit 2 + adapter-cloudflare + Tailwind v4 + IndexedDB + Vitest + Zod + Cloudflare Pages. MAL API v2 is source-of-truth for auth, list sync, search/seasonal/ranking. AniList GraphQL `https://graphql.anilist.co` is **sole enrichment** (no Jikan).

## Working in this repository

Read this contract before changing code. Keep changes focused, preserve existing user work, and verify behavior before claiming completion. Never commit `.env`, `.dev.vars`, tokens, or client secrets. The current product is a real watch journal, not a mockup; do not ship fixture collections or invented ratings.

## Interface Contract

- **Design system**: shared tokens live in `src/app.css`. Preserve the deep ink/ivory palette, coral actions, gold rating accents, local Outfit UI font with `font-display: swap`, and Georgia editorial headings. Maintain readable contrast, visible focus, and reduced-motion behavior.
- **Views and state**: the default list view is `journal`; `view=grid` selects the poster grid. Preserve tab, search, filter, and sort behavior when switching views. `watching` remains the default status tab.
- **Real collection**: the featured entry, journal rows, planned shelf, and collection counts consume existing list records. They must not trigger extra AniList enrichment calls or introduce demo data into production.
- **Ratings**: distinguish MAL community ratings from personal scores with explicit labels. Personal scores are 1–10, with 0 representing unrated. Keep native, accessible controls in compact list/grid layouts and keyboard-operable detail controls.
- **Episode/status edits**: all journal entries, including the featured one, allow status changes. Use the existing store mutation methods; retain completion guards, unknown episode totals, PTW auto-watch, and queued sync behavior.
- **Responsive ergonomics**: verify at 320, 390, 820, and 1440px. Controls must retain at least 44px touch targets in both dimensions, including inside narrow poster cards. Long titles must not create horizontal overflow. Keep mobile bottom navigation clear of safe-area insets and content.
- **Startup and public access**: keep navigation available during auth initialization and use a list skeleton for loading. Public browsing and the inline welcome must remain usable without an automatic login modal. Do not enable SSR or prerendering without auditing browser-only stores and the offline shell.
- **Performance**: prefer appropriately sized artwork, lazy loading below the fold, and targeted motion. Do not add runtime dependencies or broad visual effects without a concrete need. Report measured performance results accurately; do not invent PageSpeed improvements.

## Non-Negotiable Data and Security Constraints

- **No fallback**: AniList detail is `Media(idMal: Int type:ANIME)` direct. If `null` → empty, never `Page{media(search)}` title fallback. No Jikan, no backward compat, no dead aliases. AniList answers an unknown MAL id with **HTTP 404 + `data:{Media:null}`** — `gqlFetch` treats that as `ok(null)`, not an error.
- **Single enrichment budget**: detail charas/recs/tags/trailer/airing count as one AniList fetch. Use `anilistLimiter` 700ms (90/min → 30/min degraded). Never fire parallel AniList calls for same `malId`.
- **Browser headers**: `fetch(ANILIST_GQL)` must send only `Content-Type` + `Accept`. `User-Agent` is forbidden in browser fetch. CSP `connect-src` + `preconnect` must include `https://graphql.anilist.co` (`svelte.config.js`, `src/app.html`).
- **Validation**: All AniList responses Zod-validated (`AnilistMediaSchema`, which mirrors exactly what `MEDIA_DETAIL_QUERY` requests — add a field to both or neither). Surface `rate_limit` with `retryAfter` ms, not generic `api` 429.
- **Cache**: `anilist:fetch:{malId}` 7d TTL, written/read by `loadAnilistMedia()` (the only call the UI makes; it also de-dupes in-flight requests per `malId`), GC'd via `purgeStaleAnilistCache()`; `browse:popular:v1` + `seasonal:YYYY:season` are single-key SWR (24h), not GC'd by the AniList purger. Do not broaden prefix.
- **Trailer**: YouTube embed only if `site==='youtube'` + `id` passes `^[a-zA-Z0-9_-]{11}$` (trim + regex) → `safeTrailerId`. Prevents `?autoplay` injection. CSP `frame-src` must remain restricted to `https://www.youtube.com`.
- **Untrusted text**: Render MAL `anime.synopsis` as plain `{}`. AniList `description` (HTML) is not queried and must never be `{@html}`'d. AniList review bodies pass through `formatReviewExcerpt()` and remain plain text; do not add an HTML/DOMPurify rendering path.
- **Tab default**: `TabBar` + `+page.svelte` default `watching` (empty URL param = `watching` via `getUrlParam` `??` + `setUrlParam` delete).
- **Query correctness**: AniList `MediaTag` has `isAdult` not `isGeneral`. Never query `isGeneral` (400). Tags query is `tags{name rank isAdult}`.
- **Cloudflare variables**: `wrangler.toml [vars]` supplies the public `VITE_MAL_CLIENT_ID` and `MAL_CLIENT_ID` (they must be the same value). `MAL_CLIENT_SECRET` must remain a Cloudflare **Secret** (dashboard type _Secret_, or `.dev.vars` locally) and must never be committed. Server code reads credentials only via `$lib/server/mal-env.ts` from `platform.env` (no `process.env` fallback; `vite dev` gets `platform.env` from adapter-cloudflare's platform proxy). Auth/API endpoints are same-origin (`$lib/api/config.ts`); there is no `VITE_WORKER_URL`.
- **Token refresh**: only a definitive rejection of the refresh token (4xx except 408/429/`invalid_client`) clears tokens. Throttling, 5xx, or a misconfigured client must keep the session.
- **Sync queue**: `flushSync` sends the _merged_ queued payload and acks with `deleteSyncQueue(malId, timestamp)` so a newer merged edit is never deleted unsent. `bulkPut` keeps a locally-present entry missing from MAL only while its edit is still queued.
- **Seasonal**: fetch with `limit=500` (MAL's max); the default of 100 silently truncates a season (fall 2025 has 327 entries).
- **Offline shell**: `src/service-worker.ts` precaches the build + static files and serves the cached `/` shell for failed navigations. It must never cache `/api/*`, `/auth/token`, `/auth/refresh`, or cross-origin requests (live MAL data / credentials / opaque image responses). Verify changes with a real browser: load once online, go offline, reload `/`, `/browse`, `/stats`.
- **List ordering**: `updated` sort moves only on sync ack (`markSynced` in `userlist.svelte.ts`), never on optimistic edit. Other sorts reorder immediately.
- **PTW auto-watch**: `incrementEpisode`/`setEpisodeCount` on `plan_to_watch` moves to `watching` with a combined `{status, num_watched_episodes}` payload.
- **Browse search**: online search fires only at 3+ chars (`MIN_QUERY_LEN = 3` in `browse/+page.svelte`).

## UI File Map

- `src/routes/+layout.svelte` — startup, shared navigation, preferences, and offline feedback.
- `src/routes/+page.svelte` — public welcome, journal/grid selection, list filtering and ordering, real list state.
- `src/lib/ui/AnimeJournal.svelte`, `JournalEntry.svelte`, `CollectionShelf.svelte` — featured entry, journal rows, and planned collection shelf.
- `src/lib/ui/RatingSelect.svelte`, `ScoreInput.svelte` — compact personal score selection and detail-page scoring.
- `src/lib/ui/EpisodeStepper.svelte`, `EpisodeBar.svelte` — integrated journal stepper and single-element segmented progress. `EpisodeProgress.svelte` and `EpisodeCounter.svelte` serve existing grid/detail layouts.
- `src/lib/ui/StoryWindow.svelte` — original decorative SVG welcome artwork; no external assets or fabricated collection data.
- `src/lib/ui/AnimeCard.svelte`, `TabBar.svelte`, `FilterBar.svelte`, `SearchInput.svelte` — poster view, status tabs, sorting and search.
- `src/app.css`, `src/lib/ui/Logo.svelte`, `static/favicon.svg`, `static/manifest.json` — shared visual tokens and app identity.
- `tests/browser/watch-journal.py`, `offline-shell.py` — isolated production-browser regressions; setup in `tests/browser/README.md`.

## Data and Server File Map

- `src/lib/api/anilist.ts` — `gqlFetch` (429→`rate_limit`, 404+null→`ok(null)`), `MEDIA_DETAIL_QUERY` (only fields the page renders), `fetchAnilistMediaByMalId` (network), `loadAnilistMedia` (cache + in-flight de-dupe), `_detailQuery` export for tests.
- `src/lib/api/schemas/anilist.schema.ts` — `AnilistMediaSchema`, `AnilistTagSchema` (no `isGeneral`).
- `src/lib/api/rate-limit.ts` — `anilistLimiter = createRateLimiter(700)`.
- `src/lib/utils/types.ts` — `mapAnilistToEnriched`, `AnilistEnriched` (characters/recs/tags/trailer/nextAiring/reviews).
- `src/lib/server/mal-env.ts` — `getMalClientId/Secret(platform)`, `jsonError`. `src/routes/auth/oauth.ts` — shared token/refresh proxy. `src/routes/api/[...path]/+server.ts` — MAL API proxy (header allowlist, dot-segment rejection).
- `src/lib/utils/review-text.ts` — safe plain-text normalization for AniList review markup.
- `src/routes/anime/[id]/+page.svelte` — `loadAnime` (MAL) + `loadAnilistData` (single call, closure-guarded `if(id!==Number(page.params.id))return`), `safeTrailerId`, tags/trailer/airing/reviews sections.
- `src/lib/cache/meta.cache.ts` — `getAnilistCache/setAnilistCache`, `purgeStaleAnilistCache` only `anilist:fetch:`.
- `src/service-worker.ts` — offline app shell (see constraint above).
- `svelte.config.js` / `src/app.html` — CSP + preconnect for AniList; YouTube-only `frame-src`.
- `tests/api/anilist.test.ts` — regression: no `isGeneral`, direct `Media(idMal)` lookup, 429 mapping, 404+null, browser headers, tag schema.
- `tests/server/oauth.test.ts`, `tests/auth/tokens.test.ts` — credential injection, missing-secret 500, refresh failure classification.
- `tests/utils/review-text.test.ts` — review image-directive removal, whitespace normalization, truncation.

## Verification Before Push

```sh
VITE_MAL_CLIENT_ID=dummy npm run check   # 0 errors
VITE_MAL_CLIENT_ID=dummy npm test        # all tests pass
VITE_MAL_CLIENT_ID=dummy npm run build   # Cloudflare production build
npm run lint                           # formatting + ESLint
# live GraphQL smoke (no isGeneral):
# python3 -c "import json,urllib.request; ... Media(idMal:53149) -> 18 chars"
```

For UI, service-worker, or navigation changes, run the production Chromium checks documented in `tests/browser/README.md`. They use isolated test storage; never seed a real user browser or account with fixtures. Inspect responsive screenshots and verify rating persistence, episode/status changes, and offline reloads. A successful build alone does not verify offline navigation.

Keep docs aligned with behavior. `README.md` explains the product, local configuration, verification, and deployment; this file defines engineering constraints. Never claim a deployment succeeded merely because a push triggered it.

Commit style: `type(scope): subject` (e.g. `fix(anilist): reject invalid trailer IDs`). Pushes to `main` trigger the Cloudflare Pages deployment.

## Dependency Policy

Use the newest versions supported by the active SvelteKit toolchain. Cloudflare Pages must use the Node version pinned in `.node-version`; keep `package.json#engines.node` aligned with it and all direct dependency engine floors. Keep TypeScript on 6.x until `@sveltejs/kit`, `svelte-check`, and `typescript-eslint` all declare TypeScript 7 support; do not add a second compiler alias.

## Context7

For library/framework/API questions, use Context7 MCP (`resolve-library-id` → `query-docs`) before answering. Prefer over web search.
