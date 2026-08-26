# Project: AniDash

## Overview

AniDash is a personal anime tracker powered by MyAnimeList and Jikan APIs, providing a dark-minimal aesthetic dashboard, responsive client-side routing, offline support, and a same-origin SvelteKit proxy (on Cloudflare Pages) to interact securely with MAL OAuth.

## Structure

anidash/
├── static/ # Static assets, icons, manifest
├── src/
│ ├── lib/
│ │ ├── api/ # Fetch wrappers, Config, Zod Schemas for Jikan/MAL
│ │ ├── auth/ # PKCE generation, Bearer Tokens, Svelte Auth Store
│ │ ├── cache/ # IDB wrapper, Cache handlers
│ │ ├── stores/ # Svelte 5 Runes states for Sync and UserList
│ │ ├── ui/ # Resusable Svelte UI components (Cards, Modals)
│ │ └── utils/ # Debounce, String Formats, Online wrapper
│ └── routes/ # SvelteKit App Pages (+page.svelte, +layout.svelte)
│ ├── api/ # Cloudflare Pages Functions proxying MAL API
│ └── auth/ # OAuth token exchange routes
├── package.json
└── vite.config.ts

## APIs & Fallbacks

- **MyAnimeList (MAL) API v2**: The primary source of truth for ALL browse/search data. Handles User Auth, List Syncing (Read/Update entries), Search, Seasonal, Ranking, and the popular landing grid. Uses the same-origin SvelteKit proxy to bypass CORS. MAL v2 requires `q` (min 2 chars) on `/anime`; blank-query browsing uses `/anime/ranking` (`bypopularity`/`tv`/`movie`/`ova`/`special`, supports `sfw` + offset pagination).
- **Jikan API (v4)**: Used ONLY for characters and community recommendations on the anime detail page — the two things MAL v2 doesn't provide. All Jikan search/browse fallback chains were removed (2026-08). Note: "Episodes list" feature was removed as Jikan commonly rate-limits or fails for movies.
- **Memory/IndexedDB Fallback**: All UI updates and API fetches are cached optimistically to `idb`. This serves as local offline memory. When modifying a list item, changes hit IndexedDB instantly, and sync to MAL is debounced in the background. If sync fails, the store reverts safely to the cached data in IDB.
- **Popular grid SWR**: The default Browse landing payload is cached in the IDB meta store (`browse:popular:v1`, 24h TTL) and painted instantly; a silent background revalidation refreshes it when stale.

## Conventions

- Svelte 5 runes (`$state`, `$derived`, `$effect`) are used everywhere instead of legacy stores.
- The `Result<T, E>` pattern is the standard mechanism for propagating API, Cache, and Authorization errors instead of throwing exceptions.
- API requests use `zod` for parsing and validation.

## Dependencies & Setup

- Core: SvelteKit, Vite, TypeScript, Tailwind CSS v4
- Validation: Zod
- Components/UI: lucide-svelte, svelte-sonner (native `<dialog>` primitive for modals — bits-ui removed)
- Storage: idb
- Fonts: `@fontsource-variable/outfit` (self-hosted)
- Deploy Target: Cloudflare Pages (Frontend + Backend Proxy). `adapter-cloudflare` handles build output.

## Critical Information

- Jikan API rate limit is strictly 3 req/second. Exceeding risks ban. A shared limiter is installed inside `lib/api/jikan.ts`.
- MyAnimeList API v2 supports native list item removal via `DELETE /v2/anime/{anime_id}/my_list_status`. This allows for permanent list deletion sync.
- The application proxies ALL MyAnimeList API traffic (both OAuth and generic `/v2` endpoints) via internal SvelteKit routes (`/api/*` and `/auth/*`) because MAL does not send `Access-Control-Allow-Origin` headers. These routes run as Cloudflare Pages Functions.

## Insights

- Using background sync limits loading delays and manages offline edits well.
- IDB stale caching paired with SWR handles large list loads much quicker than direct server syncs.
- Adopting a high-contrast "Ethereal Glass" UI (glassmorphism buttons, backdrop-blur components, hover animations) universally elevates the aesthetic of personal dashboards.
- Matching application filtering and sorting (e.g. MAL Rating, MAL standard status categories) ensures a familiar experience for legacy MyAnimeList users.
- **Schema Integrity**: Extending base Zod schemas (MAL/Jikan) to include `num_list_users` and `num_scoring_users` ensures that community statistics are available across all reactive templates without extra fetch overhead.
- **Native MAL English Titles**: MAL provides English titles natively via the `alternative_titles` field when requested in the `fields` query parameter. This eliminates the need for a secondary fallback API (like Jikan) just to resolve English names, improving performance and reducing rate-limit concerns.
- **Virtualized Rendering (Infinite Scroll)**: `AnimeGrid` uses `IntersectionObserver` to progressively render chunks of 40, preventing main-thread blocking on large lists (e.g. "Completed" with 500+ items).
- **Offline Sync Queue**: A discrete `syncQueue` IndexedDB store (DB_VERSION 2) sequesters offline/failed mutations, re-attempted sequentially on `navigator.onLine` or `flushPersistentQueue`. Payloads for the same anime are merged so a later edit never drops an earlier queued one.
- **Package Manager**: Use `bun` rather than `npm` for installing dependencies and running scripts to ensure lockfile consistency and speed.

## Blunders

- [2026-04-23] Severe lag/freeze on tab switching → ROOT CAUSE: Synchronously rendering hundreds of anime cards blocked the main thread. → FIX: Implemented infinite scroll with `IntersectionObserver` in `AnimeGrid.svelte` and optimized store counts via `.reduce`.
- [2026-04-19] `invalid_grant` during MAL login & CORS `Failed to fetch` on API → ROOT CAUSE: MAL strictly requires PKCE `plain` method (not `S256`). Also, `api.myanimelist.net` explicitly blocks browser CORS. Additionally, MAL API returns fully qualified `next` URLs for pagination which bypasses the proxy → FIX: Configured PKCE to `plain` (128 chars). Rewrote Worker to proxy `/api/*` and explicitly allow `GET`/`Authorization` CORS headers. Replaced `api.myanimelist.net` with our proxy in `page.paging.next` strings.

- [2026-06-14] Rating coercion & touch conflicts on mobile → ROOT CAUSE: API/IndexedDB returned scores as strings, failing strict `===` checks. Touch events fired simulated clicks that toggled scores back to 0. → FIX: Cast score to number (`$derived(Number(score))`) and added `e.preventDefault()` to touch handlers.
- [2026-06-14] Infinite scroll on browse page loaded excessively → ROOT CAUSE: `IntersectionObserver` loaded automatically on scroll. → FIX: Replaced `IntersectionObserver` sentinel with an explicit "Show More" pagination button to give users control over limits.
- [2026-06-15] Cloudflare Pages build failed with missing VITE_MAL_CLIENT_ID → ROOT CAUSE: Fixing the Wrangler Pages output warning in wrangler.toml caused Cloudflare Pages to use the config file instead of falling back to the Dashboard's settings, wiping out dashboard-configured environment variables. → FIX: Reverted wrangler.toml to its original state (invalid for Pages) to restore Dashboard environment settings fallback.
- [2026-06-15] Auto-logout when opening app offline → ROOT CAUSE: Fails fetchUserProfile/refreshTokens due to lack of connection, entering the token-failed catch blocks which deleted stored tokens and DB. → FIX: Checks if the failure type is 'network' (offline) and bypasses the logout/clearing logic.
- [2026-06-29] Failed to store user profile in IndexedDB → ROOT CAUSE: authStore.user is a Svelte 5 reactive Proxy, which the structured clone algorithm cannot clone. → FIX: Wrapped authStore.user in $state.snapshot() before caching, and deep-cloned it via JSON serialization in setCachedProfile.
- [2026-07-25] Search Anime failed on blank/query search → ROOT CAUSE: Jikan API v4 endpoint returned 504 BadResponseException ("Jikan failed to connect to MyAnimeList") or 400 for <3 char queries, with no API fallback mechanism. → FIX: Added automatic MyAnimeList API v2 (`searchAnime` & `getRanking`) fallback in `jikan.ts` when Jikan returns an error/rate-limit, and enabled 1-2 char query support.
- [2026-08-26] Browse took 4-7s to show popular anime → ROOT CAUSE: cold/stale Jikan popular cache (4h TTL) + Jikan 504/429 → 1s sleep retry → second failure → slow MAL ranking fallback, all while `loading` blocked the grid; dub-mode also awaited a multi-MB GitHub JSON before searching. → FIX: Made the MAL worker proxy the primary browse source (ranking for landing, search with `order_by`/`sort`/`sfw`/genres/type for queries), added stale-while-revalidate popular cache (instant paint, silent 24h revalidation), made dub filtering reactive instead of blocking, replaced genre fetch with a static list (MAL v2 has no genres endpoint), and deleted all Jikan search/fallback machinery.
- [2026-08-26] Modal/dropdown fragmentation & bits-ui single-purpose dependency → ROOT CAUSE: four hand-rolled modal implementations plus bits-ui Dialog used in one file and DropdownMenu in StatusBadge. → FIX: Introduced native `<dialog>` primitive (`lib/ui/Dialog.svelte`, focus-managed, scroll-locked, `@starting-style` animations) and migrated AddToListModal, CharacterDetailModal, ConfirmDialog, PTW filters; rewrote StatusBadge menu as a lightweight popover; removed bits-ui entirely. Self-hosted Outfit via `@fontsource-variable/outfit` (removes render-blocking Google Fonts import).
- [2026-08-26] "Failed to load characters" on detail page → ROOT CAUSE: Jikan upstream 504 ("Jikan failed to connect to MyAnimeList") — verified live, persistent across retries; the app discarded expired cache on failure and offered no retry. → FIX: `jikan.ts` now serves stale cache as fallback when a fetch fails (characters persist through outages), retries 504/429 twice with 1s→3s backoff, and the detail page shows Retry buttons for characters/recommendations errors.
- [2026-08-26] In-list anime showed no cover image in Browse → ROOT CAUSE: browse preferred locally-cached records over online results for listed anime, and the user's fullSync had been failing silently (`+layout.svelte` ignored the failure), leaving old records with `mainPicture: null`. Current sync code/MAL API are correct — data was just never repaired. → FIX: `mergeLocalWithOnline()` enriches local matches with the fresh online node (online wins, local backfills gaps), a self-heal effect persists repaired covers back to IndexedDB, and layout now toasts "Sync failed — showing cached data" so stale data is never silent.
- [2026-08-26] Card covers flashed in then went permanently blank after typing a search (fixed by page refresh) → ROOT CAUSE: `ImageWithFallback` relied solely on the img `load` event to flip `loaded` (opacity-0 → 100). During rapid keyed-each re-renders the load event of already-cached images gets lost — verified live on prod: 20/25 imgs `complete:true` + decoded but stuck at `opacity-0` with shimmer showing; re-setting `src` re-fires the event (why refresh fixed it). → FIX: the reset `$effect` now syncs from the element (`imgEl.complete` / `naturalWidth`) instead of trusting the event alone — self-heals any lost event and paints cached images instantly with no shimmer flash.
