# AGENTS.md — AniDash Engineering Contract

## Stack
Svelte 5 (Runes) + SvelteKit 2 + adapter-cloudflare + Tailwind v4 + IndexedDB + Vitest + Zod + Cloudflare Pages. MAL API v2 is source-of-truth for auth, list sync, search/seasonal/ranking. AniList GraphQL `https://graphql.anilist.co` is **sole enrichment** (no Jikan).

## Non-Negotiable Constraints
- **No fallback**: AniList detail is `Media(idMal: Int type:ANIME)` direct. If `null` → empty, never `Page{media(search)}` title fallback. No Jikan, no backward compat, no dead aliases.
- **Single enrichment budget**: detail charas/recs/tags/trailer/airing count as one AniList fetch. Use `anilistLimiter` 700ms (90/min → 30/min degraded). Never fire parallel AniList calls for same `malId`.
- **Browser headers**: `fetch(ANILIST_GQL)` must send only `Content-Type` + `Accept`. `User-Agent` is forbidden in browser fetch. CSP `connect-src` + `preconnect` must include `https://graphql.anilist.co` (`svelte.config.js`, `src/app.html`).
- **Validation**: All AniList responses Zod-validated (`AnilistMediaSchema`, `AnilistPageMediaSchema`). Surface `rate_limit` with `retryAfter` ms, not generic `api` 429.
- **Cache**: `anilist:fetch:{malId}` 7d TTL via `purgeStaleAnilistCache()`; `browse:popular:v1` + `seasonal:YYYY:season` are single-key SWR (24h), not GC'd by the AniList purger. Do not broaden prefix.
- **Trailer**: YouTube embed only if `site==='youtube'` + `id` passes `^[a-zA-Z0-9_-]{11}$` (trim + regex) → `safeTrailerId`. Prevents `?autoplay` injection.
- **Synopsis**: Render MAL `anime.synopsis` as plain `{}`. AniList `description` (HTML) is never `{@html}`'d — no DOMPurify needed.
- **Tab default**: `TabBar` + `+page.svelte` default `watching` (empty URL param = `watching` via `getUrlParam` `??` + `setUrlParam` delete).
- **Query correctness**: AniList `MediaTag` has `isAdult` not `isGeneral`. Never query `isGeneral` (400). Tags query is `tags{name rank isAdult}`.

## File Map
- `src/lib/api/anilist.ts` — `gqlFetch` (429→`rate_limit`), `MEDIA_DETAIL_QUERY`, `PAGE_QUERY` (`$sort:MediaSort` not array), `fetchAnilistMediaByMalId`, `_detailQuery/_pageQuery` exports for tests.
- `src/lib/api/schemas/anilist.schema.ts` — `AnilistMediaSchema`, `AnilistTagSchema` (no `isGeneral`), `AnilistPageMediaSchema`.
- `src/lib/api/rate-limit.ts` — `anilistLimiter = createRateLimiter(700)`.
- `src/lib/utils/types.ts` — `mapAnilistToEnriched`, `AnilistEnriched` (characters/recs/tags/trailer/nextAiring/reviews).
- `src/routes/anime/[id]/+page.svelte` — `loadAnime` (MAL) + `loadAnilistData` (single call, closure-guarded `if(id!==Number(page.params.id))return`), `safeTrailerId`, tags/trailer/airing/reviews sections.
- `src/lib/cache/meta.cache.ts` — `purgeStaleAnilistCache` only `anilist:fetch:`.
- `svelte.config.js` / `src/app.html` — CSP + preconnect for AniList.
- `tests/api/anilist.test.ts` — regression: no `isGeneral`, sort var type, 429 mapping, tag schema.

## Verification Before Push
```sh
VITE_MAL_CLIENT_ID=dummy npm run check   # 0 errors
VITE_MAL_CLIENT_ID=dummy npm test        # 72 passed (12 files)
# live GraphQL smoke (no isGeneral):
# python3 -c "import json,urllib.request; ... Media(idMal:53149) -> 18 chars"
```
Commit style: `type(scope): subject` (e.g. `fix(anilist): isGeneral GraphQL error + remove User-Agent`). Squash worktree `feat/anilist-noauth` → `main` → `git push origin main` (Cloudflare Pages auto-deploy).

## Context7
For library/framework/API questions, use Context7 MCP (`resolve-library-id` → `query-docs`) before answering. Prefer over web search.
