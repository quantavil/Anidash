# Project: AniDash

## Overview

AniDash is a personal anime tracker powered by MyAnimeList and Jikan APIs, providing a dark-minimal aesthetic dashboard, responsive client-side routing, offline support, and Cloudflare Worker-based backend to interact securely with MAL OAuth.

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
├── vite.config.ts
└── audit-report.md # Codebase audit report for design issues, bugs, and redundancies

### Structural Changes
- Created `src/lib/ui/SearchInput.svelte` to unify search inputs and resolve design inconsistencies / DRY violations (2026-06-14).
- Created `src/lib/ui/CharacterDetailModal.svelte` to show character details dialog (2026-06-14).
- Removed deprecated `userListStore.markCompleted` and unified logic via `setStatus` (2026-06-14).


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
- Adopting a high-contrast "Ethereal Glass" UI (glassmorphism buttons, backdrop-blur components, hover animations) universally elevates the aesthetic of personal dashboards.
- Matching application filtering and sorting (e.g. MAL Rating, MAL standard status categories) ensures a familiar experience for legacy MyAnimeList users.
- **Schema Integrity**: Extending base Zod schemas (MAL/Jikan) to include `num_list_users` and `num_scoring_users` ensures that community statistics are available across all reactive templates without extra fetch overhead.
- **Micro-Copy Density**: Using short-form formatting (K/M) for large member counts maintains a clean interface even on small mobile screens.
- **Native MAL English Titles**: Discovered that MAL provides English titles natively via the `alternative_titles` field when requested in the `fields` query parameter. This eliminates the need for a secondary fallback API (like Jikan) just to resolve English names, greatly improving performance and reducing rate-limit concerns.
- **Glassmorphic Widgets**: Implementing interactive "Roulette" and "Surprise" glassmorphic widgets on empty states (like the Browse page) turns a dead-end UI into an engaging discovery feature without cluttering the main navigation.
- **Virtualized Rendering (Infinite Scroll)**: Added infinite scrolling to `AnimeGrid` to prevent main-thread blocking when rendering large lists (e.g., "Completed" tab with 500+ items). Uses `IntersectionObserver` to progressively render chunks of 40.
- **Fused Filtering Logic**: Optimized `+page.svelte` by consolidating chained filter calls into a single `O(N)` pass, reducing intermediate array allocations and GC pressure during user interaction.
- **Offline Sync Queue**: Implemented a discrete `syncQueue` IndexedDB store (DB_VERSION 2) to natively sequester offline or failed user mutations. Ensures offline mutations are maintained optimistically and re-attempted sequentially upon resolving `navigator.onLine` or triggering `flushPersistentQueue`.
- **Zero-Dependency Visuals**: Implemented score and media format distribution charts using pure CSS/Svelte logic, maintaining high performance and small bundle size while providing premium analytics.
- **NSFW Search Visibility**: Removed the hardcoded `sfw: true` filter parameter in Jikan search queries to allow mature and explicit (NSFW) anime results to appear in Browse.
- **ScoreInput Component**: Added custom 5-star (10-point scale) drag-and-tap rating input with native SVG linearGradient, borderless container, and unified button styles.

## Blunders

- [2026-04-23] Severe lag/freeze on tab switching → ROOT CAUSE: Synchronously rendering hundreds of anime cards blocked the main thread. → FIX: Implemented infinite scroll with `IntersectionObserver` in `AnimeGrid.svelte` and optimized store counts via `.reduce`.
- [2026-04-19] `invalid_grant` during MAL login & CORS `Failed to fetch` on API → ROOT CAUSE: MAL strictly requires PKCE `plain` method (not `S256`). Also, `api.myanimelist.net` explicitly blocks browser CORS. Additionally, MAL API returns fully qualified `next` URLs for pagination which bypasses the proxy → FIX: Configured PKCE to `plain` (128 chars). Rewrote Worker to proxy `/api/*` and explicitly allow `GET`/`Authorization` CORS headers. Replaced `api.myanimelist.net` with our proxy in `page.paging.next` strings.
- [2026-04-23] Deleted anime returning on next sync → ROOT CAUSE: `removeFromList` caught MAL deletion errors (like rate-limits) but swallowed them, returning `ok()` without queueing a retry. → FIX: Failed deletions are now queued to `syncQueue` with `payload: { _delete: true }` to ensure eventual consistency.
- [2026-05-02] Empty Anime List on Load → ROOT CAUSE: Implemented a 7-day TTL purge in `userListStore.loadFromCache` using `updatedAt`, incorrectly assuming it represented the cache date. It actually represents the last MAL modification date, causing all anime untouched for 7 days to be deleted. → FIX: Removed the TTL purge logic from `loadFromCache`. List freshness is maintained by `syncStore.fullSync()`.
- [2026-06-14] Invalid HTML nested interactive buttons → ROOT CAUSE: Interactive `EpisodeCounter` `<button>` elements nested inside top-level `<a>` container. → FIX: Converted container to `div` and utilized absolute stretched `<a>` overlays alongside `z-index` layering for distinct click targets.
- [2026-06-14] Rating coercion & touch conflicts on mobile → ROOT CAUSE: API/IndexedDB returned scores as strings, failing strict `===` checks. Touch events fired simulated clicks that toggled scores back to 0. → FIX: Cast score to number (`$derived(Number(score))`) and added `e.preventDefault()` to touch handlers.
- [2026-06-14] Mirror dropdown links not working on click → ROOT CAUSE: Synchronously changing preferred domain rearranged DOM links, cancelling browser navigation. Also hover styles conflicted with click intent. → FIX: Deferred state changes with `setTimeout` and removed `lg:group-hover:flex` class.
- [2026-06-14] Browse page UI/UX issues (double borders, bad mobile spacing, missing SFW toggle) → ROOT CAUSE: Flex-wrap and grid layouts stretched on mobile, standard selects caused border clutter, and SFW filter was missing UI switch. → FIX: Refactored filters panel to stack on mobile, added custom chevron dropdown style to remove double borders, added custom SFW switch, and pre-populated landing page.
- [2026-06-14] Home page list search bar narrow & double border on focus → ROOT CAUSE: `sm:max-w-xs` limited search width on desktop, and focus ring didn't change border-color, causing double outline. → FIX: Changed to `sm:max-w-md` and updated focus state to transition border and ring together.
- [2026-06-14] Search bars design inconsistencies & DRY violations → ROOT CAUSE: Home list search and Browse search were implemented separately with different roundings, heights, and borders. Also focus outlines drew double borders. → FIX: Created unified `SearchInput` component with `rounded-full`, soft border-ring transition, and refactored both pages to use it.
- [2026-06-14] UI elements (search bars, filters, buttons) had redundant double focus rings → ROOT CAUSE: Tailwind `focus:ring` classes were used alongside default outlines or other borders. → FIX: Globally removed `focus:ring` and `focus-visible:ring` classes from SearchInput, Browse filters, Login button, StatusBadge, RatingStars, and Anime characters lists, standardizing on a clean `focus:outline-none focus:bg-white/10` aesthetic.
- [2026-06-14] Infinite scroll on browse page loaded excessively → ROOT CAUSE: `IntersectionObserver` loaded automatically on scroll. → FIX: Replaced `IntersectionObserver` sentinel with an explicit "Show More" pagination button to give users control over limits.
