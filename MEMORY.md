# Project: AniDash

## Overview
AniDash is a personal anime tracker powered by MyAnimeList and Jikan APIs, providing a dark-minimal aesthetic dashboard, responsive client-side routing, offline support, and Cloudflare Worker-based backend to interact securely with MAL OAuth.

## Structure
anidash/
├── static/           # Static assets, icons, manifest
├── src/
│   ├── lib/
│   │   ├── api/      # Fetch wrappers, Config, Zod Schemas for Jikan/MAL
│   │   ├── auth/     # PKCE generation, Bearer Tokens, Svelte Auth Store
│   │   ├── cache/    # IDB wrapper, Cache handlers
│   │   ├── stores/   # Svelte 5 Runes states for Sync and UserList
│   │   ├── ui/       # Resusable Svelte UI components (Cards, Modals)
│   │   └── utils/    # Debounce, String Formats, Online wrapper
│   └── routes/       # SvelteKit App Pages (+page.svelte, +layout.svelte)
│       ├── api/      # Cloudflare Pages Functions proxying MAL API
│       └── auth/     # OAuth token exchange routes
├── package.json
└── vite.config.ts

## APIs & Fallbacks

- **MyAnimeList (MAL) API v2**: The primary source of truth. Handles User Auth, List Syncing (Read/Update entries), Search, Seasonal, and Ranking. Uses worker proxy to bypass CORS.
- **Jikan API (v4)**: Unofficial community fallback data. Used to fetch richer details not natively found in MAL v2 without hassle, such as Characters and Community Recommendations. Note: "Episodes list" feature was removed as Jikan commonly rate-limits or fails for movies.
- **Memory/IndexedDB Fallback**: All UI updates and API fetches are cached optimistically to `idb`. This serves as local offline memory. When modifying a list item, changes hit IndexedDB instantly, and sync to MAL is debounced in the background. If sync fails, the store reverts safely to the cached data in IDB.

## Conventions
- Svelte 5 runes (`$state`, `$derived`, `$effect`) are used everywhere instead of legacy stores.
- The `Result<T, E>` pattern is the standard mechanism for propagating API, Cache, and Authorization errors instead of throwing exceptions.
- API requests use `zod` for parsing and validation.

## Dependencies & Setup
- Core: SvelteKit, Vite, TypeScript, Tailwind CSS v4
- Validation: Zod
- Components/UI: bits-ui, lucide-svelte, svelte-sonner
- Storage: idb
- Deploy Target: Cloudflare Pages (Frontend + Backend Proxy). `adapter-cloudflare` handles build output.

## Critical Information
- Jikan API rate limit is strictly 3 req/second. Exceeding risks ban. A shared limiter is installed inside `lib/api/jikan.ts`.
- MyAnimeList API v2 supports native list item removal via `DELETE /v2/anime/{anime_id}/my_list_status`. This allows for permanent list deletion sync.
- The application proxies ALL MyAnimeList API traffic (both OAuth and generic `/v2` endpoints) via internal SvelteKit routes (`/api/*` and `/auth/*`) because MAL does not send `Access-Control-Allow-Origin` headers. These routes run as Cloudflare Pages Functions.

## Insights
- Using background sync limits loading delays and manages offline edits well.
- IDB stale caching paired with SWR handles large list loads much quicker than direct server syncs.

## Blunders
- [2026-04-18] Accidental `onclick` StopPropagation syntax error in Svelte 5 → ROOT CAUSE: Using Svelte 4 `|stopPropagation` modifier instead of `(e) => e.stopPropagation()` inline binding → FIX: Handled properly via explicit event callback syntax.
- [2026-04-19] `invalid_grant` during MAL login & CORS `Failed to fetch` on API → ROOT CAUSE: MAL strictly requires PKCE `plain` method (not `S256`). Also, `api.myanimelist.net` explicitly blocks browser CORS. Additionally, MAL API returns fully qualified `next` URLs for pagination which bypasses the proxy → FIX: Configured PKCE to `plain` (128 chars). Rewrote Worker to proxy `/api/*` and explicitly allow `GET`/`Authorization` CORS headers. Replaced `api.myanimelist.net` with our proxy in `page.paging.next` strings.
- [2026-04-19] `Failed to load recommendations` error → ROOT CAUSE: Jikan v4 `/anime/{id}/recommendations` schema mismatch. The code expected `entry` to be an array, but it is a single object. UI was also incorrectly indexing `rec.entry[0]` → FIX: Updated Zod schema to expect single object entries and added `votes` field for extra context. Refined UI logic to remove array indexing.
- [2026-04-19] Incorrect assumption: "MAL has no DELETE API" → ROOT CAUSE: Previous community knowledge/v1 behavior suggested setting status to 'plan_to_watch' as a workaround. Proper research confirmed `DELETE /v2/anime/{id}/my_list_status` exists in the v2 reference → FIX: Implemented proper DELETE verb in the MAL client and synchronized list removal.
- [2026-04-19] Svelte 5 a11y warnings in `RatingStars` → ROOT CAUSE: Using `onclick` on a `role="slider"` without an `onkeydown` handler for keyboard navigation → FIX: Implemented ArrowKey navigation and added `svelte-ignore` for non-interactive element interactions where appropriate.
- [2026-04-19] Missing dub icon in seasonal section → ROOT CAUSE: `SearchResultCard.svelte` didn't implement the `dubStore` check like `AnimeCard.svelte` did → FIX: Imported `dubStore` and `Mic` icon, added glass-badge overlay to `SearchResultCard`. Also updated episode counter buttons to be larger and match the glassmorphism aesthetic.
