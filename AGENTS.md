# AGENTS.md — AniDash 0.1.3 Engineering Contract

## Stack

Svelte 5 (Runes) + SvelteKit 2 + adapter-cloudflare + Tailwind v4 + IndexedDB + Vitest + Zod + Cloudflare Pages. MAL API v2 is source-of-truth for auth, list sync, search/seasonal/ranking. AniList GraphQL `https://graphql.anilist.co` is **sole enrichment** (no Jikan).

## Interface

The original AniDash interface is restored from `c8baa61`: black/violet surfaces, floating navigation, poster/list layouts, and detail controls with native 1–10 rating buttons. Discovery actions are compact rows with full-width format/genre filters. Keep the current illustrated welcome screen (`StoryWindow.svelte`) with its inline login and public Browse link. Do not restore the retired journal redesign. Verify responsive screens at 320, 390, 820, and 1440px using isolated browser storage.

## Non-Negotiable Constraints

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

## File Map

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
VITE_MAL_CLIENT_ID=dummy bun run check   # 0 errors
VITE_MAL_CLIENT_ID=dummy bun run test        # all pass (14 files)
VITE_MAL_CLIENT_ID=dummy bun run build   # Cloudflare production build
# live GraphQL smoke (no isGeneral):
# python3 -c "import json,urllib.request; ... Media(idMal:53149) -> 18 chars"
```

Commit style: `type(scope): subject` (e.g. `fix(anilist): reject invalid trailer IDs`). Pushes to `main` trigger the Cloudflare Pages deployment.

## Dependency Policy

Use Bun 1.4.2 (`packageManager` and `bun.lock`) for installation and script commands. Run `bun install --frozen-lockfile` and `bun run test` (Vitest), not `bun test`. Keep the Node runtime for tools that declare it.

Use the newest versions supported by the active SvelteKit toolchain. Cloudflare Pages must use the Node version pinned in `.node-version`; keep `package.json#engines.node` aligned with it and all direct dependency engine floors. Keep TypeScript on 6.x until `@sveltejs/kit`, `svelte-check`, and `typescript-eslint` all declare TypeScript 7 support; do not add a second compiler alias.

## Context7

For library/framework/API questions, use Context7 MCP (`resolve-library-id` → `query-docs`) before answering. Prefer over web search.
