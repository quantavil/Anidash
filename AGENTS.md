# AGENTS.md — AniDash 0.1.1 Engineering Contract

## Stack

Svelte 5 (Runes) + SvelteKit 2 + adapter-cloudflare + Tailwind v4 + IndexedDB + Vitest + Zod + Cloudflare Pages. MAL API v2 is source-of-truth for auth, list sync, search/seasonal/ranking. AniList GraphQL `https://graphql.anilist.co` is **sole enrichment** (no Jikan).

## Non-Negotiable Constraints

- **No fallback**: AniList detail is `Media(idMal: Int type:ANIME)` direct. If `null` → empty, never `Page{media(search)}` title fallback. No Jikan, no backward compat, no dead aliases.
- **Single enrichment budget**: detail charas/recs/tags/trailer/airing count as one AniList fetch. Use `anilistLimiter` 700ms (90/min → 30/min degraded). Never fire parallel AniList calls for same `malId`.
- **Browser headers**: `fetch(ANILIST_GQL)` must send only `Content-Type` + `Accept`. `User-Agent` is forbidden in browser fetch. CSP `connect-src` + `preconnect` must include `https://graphql.anilist.co` (`svelte.config.js`, `src/app.html`).
- **Validation**: All AniList responses Zod-validated (`AnilistMediaSchema`, `AnilistPageMediaSchema`). Surface `rate_limit` with `retryAfter` ms, not generic `api` 429.
- **Cache**: `anilist:fetch:{malId}` 7d TTL via `purgeStaleAnilistCache()`; `browse:popular:v1` + `seasonal:YYYY:season` are single-key SWR (24h), not GC'd by the AniList purger. Do not broaden prefix.
- **Trailer**: YouTube embed only if `site==='youtube'` + `id` passes `^[a-zA-Z0-9_-]{11}$` (trim + regex) → `safeTrailerId`. Prevents `?autoplay` injection. CSP `frame-src` must remain restricted to `https://www.youtube.com`.
- **Untrusted text**: Render MAL `anime.synopsis` as plain `{}`. AniList `description` (HTML) is never `{@html}`'d. AniList review bodies pass through `formatReviewExcerpt()` and remain plain text; do not add an HTML/DOMPurify rendering path.
- **Tab default**: `TabBar` + `+page.svelte` default `watching` (empty URL param = `watching` via `getUrlParam` `??` + `setUrlParam` delete).
- **Query correctness**: AniList `MediaTag` has `isAdult` not `isGeneral`. Never query `isGeneral` (400). Tags query is `tags{name rank isAdult}`.

## File Map

- `src/lib/api/anilist.ts` — `gqlFetch` (429→`rate_limit`), `MEDIA_DETAIL_QUERY`, `PAGE_QUERY` (`$sort:MediaSort` not array), `fetchAnilistMediaByMalId`, `_detailQuery/_pageQuery` exports for tests.
- `src/lib/api/schemas/anilist.schema.ts` — `AnilistMediaSchema`, `AnilistTagSchema` (no `isGeneral`), `AnilistPageMediaSchema`.
- `src/lib/api/rate-limit.ts` — `anilistLimiter = createRateLimiter(700)`.
- `src/lib/utils/types.ts` — `mapAnilistToEnriched`, `AnilistEnriched` (characters/recs/tags/trailer/nextAiring/reviews).
- `src/lib/utils/review-text.ts` — safe plain-text normalization for AniList review markup.
- `src/routes/anime/[id]/+page.svelte` — `loadAnime` (MAL) + `loadAnilistData` (single call, closure-guarded `if(id!==Number(page.params.id))return`), `safeTrailerId`, tags/trailer/airing/reviews sections.
- `src/lib/cache/meta.cache.ts` — `purgeStaleAnilistCache` only `anilist:fetch:`.
- `svelte.config.js` / `src/app.html` — CSP + preconnect for AniList; YouTube-only `frame-src`.
- `tests/api/anilist.test.ts` — regression: no `isGeneral`, sort var type, 429 mapping, tag schema.
- `tests/utils/review-text.test.ts` — review image-directive removal, whitespace normalization, truncation.

## Verification Before Push

```sh
VITE_MAL_CLIENT_ID=dummy npm run check   # 0 errors
VITE_MAL_CLIENT_ID=dummy npm test        # 79 passed (13 files)
VITE_MAL_CLIENT_ID=dummy npm run build   # Cloudflare production build
# live GraphQL smoke (no isGeneral):
# python3 -c "import json,urllib.request; ... Media(idMal:53149) -> 18 chars"
```

Commit style: `type(scope): subject` (e.g. `fix(anilist): reject invalid trailer IDs`). Pushes to `main` trigger the Cloudflare Pages deployment.

## Dependency Policy

Use the newest versions supported by the active SvelteKit toolchain. Keep TypeScript on 6.x until `@sveltejs/kit`, `svelte-check`, and `typescript-eslint` all declare TypeScript 7 support; do not add a second compiler alias.

## Context7

For library/framework/API questions, use Context7 MCP (`resolve-library-id` → `query-docs`) before answering. Prefer over web search.
