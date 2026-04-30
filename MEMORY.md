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

## Blunders

- [2026-04-23] Severe lag/freeze on tab switching → ROOT CAUSE: Synchronously rendering hundreds of anime cards blocked the main thread. → FIX: Implemented infinite scroll with `IntersectionObserver` in `AnimeGrid.svelte` and optimized store counts via `.reduce`.
- [2026-04-22] Empty UI on first load after login callback → ROOT CAUSE: Data loading (cache load, sync) was inside an `onMount` block that was conditionally skipped if `isAuthenticated` was false when the layout initially mounted (before token exchange). → FIX: Moved data loading logic to a reactive `$effect` that watches `authStore.isAuthenticated` and triggers automatically.
- [2026-04-20] Redundant state in AnimeTitle component → ROOT CAUSE: Used unnecessary `flipped` and `key` state variables for transitions when `showingEnglish` was already reactive. → FIX: Removed redundant variables and used `{#key showingEnglish}` directly for transition.
- [2026-04-20] Navigation logic duplication in AnimeDetail page → ROOT CAUSE: Both `onMount` and `$effect` had duplicate anime loading logic, causing potential double-fetch on mount. → FIX: Consolidated into single `$effect` that handles both initial mount and route changes, removed `onMount` call.
- [2026-04-20] Race condition in RecommenderWidgets → ROOT CAUSE: Silent onMount fetch for seasonal anime could conflict with user clicks before completion, causing duplicate API calls. → FIX: Added `initializing` state to prevent button interaction during onMount fetch.
- [2026-04-20] Retry button passing Event object → ROOT CAUSE: After refactoring `loadAnime` to require `id` parameter, Retry button still passed raw Event object. → FIX: Updated button to call `loadAnime(malId)`.
- [2026-04-20] Removed unnecessary "Discover Anime" text → ROOT CAUSE: Browse page had redundant descriptive text when widgets already provided guidance. → FIX: Removed emoji, title, and description text, kept only RecommenderWidgets component.
- [2026-04-20] Widget cursor and poster issues → ROOT CAUSE: Widgets lacked pointer cursor on hover and had no anime poster images. → FIX: Added `cursor-pointer` class and implemented poster fetching from PTW list and seasonal API with proper data structure handling.
- [2026-04-20] Over-engineered Jikan fallback for English titles → ROOT CAUSE: Assumed MAL didn't provide English titles natively and built a complex Jikan fetch/cache fallback. → FIX: Discovered MAL supports `alternative_titles.en` via the `fields` parameter. Refactored the entire data layer to use the native MAL field and completely removed the Jikan title integration.
- [2026-04-18] Accidental `onclick` StopPropagation syntax error in Svelte 5 → ROOT CAUSE: Using Svelte 4 `|stopPropagation` modifier instead of `(e) => e.stopPropagation()` inline binding → FIX: Handled properly via explicit event callback syntax.
- [2026-04-19] `invalid_grant` during MAL login & CORS `Failed to fetch` on API → ROOT CAUSE: MAL strictly requires PKCE `plain` method (not `S256`). Also, `api.myanimelist.net` explicitly blocks browser CORS. Additionally, MAL API returns fully qualified `next` URLs for pagination which bypasses the proxy → FIX: Configured PKCE to `plain` (128 chars). Rewrote Worker to proxy `/api/*` and explicitly allow `GET`/`Authorization` CORS headers. Replaced `api.myanimelist.net` with our proxy in `page.paging.next` strings.
- [2026-04-19] `Failed to load recommendations` error → ROOT CAUSE: Jikan v4 `/anime/{id}/recommendations` schema mismatch. The code expected `entry` to be an array, but it is a single object. UI was also incorrectly indexing `rec.entry[0]` → FIX: Updated Zod schema to expect single object entries and added `votes` field for extra context. Refined UI logic to remove array indexing.
- [2026-04-19] Incorrect assumption: "MAL has no DELETE API" → ROOT CAUSE: Previous community knowledge/v1 behavior suggested setting status to 'plan_to_watch' as a workaround. Proper research confirmed `DELETE /v2/anime/{id}/my_list_status` exists in the v2 reference → FIX: Implemented proper DELETE verb in the MAL client and synchronized list removal.
- [2026-04-19] Svelte 5 a11y warnings in `RatingStars` → ROOT CAUSE: Using `onclick` on a `role="slider"` without an `onkeydown` handler for keyboard navigation → FIX: Implemented ArrowKey navigation and added `svelte-ignore` for non-interactive element interactions where appropriate.
- [2026-04-19] Missing dub icon in seasonal section → ROOT CAUSE: `SearchResultCard.svelte` didn't implement the `dubStore` check like `AnimeCard.svelte` did → FIX: Imported `dubStore` and `Mic` icon, added glass-badge overlay to `SearchResultCard`. Also updated episode counter buttons to be larger and match the glassmorphism aesthetic.
- [2026-04-23] Schema mismatch/type error in `AppError` → ROOT CAUSE: Attempted to access `.status` on a union type where not all members (like `'network'`) had that property. → FIX: Implemented strict type narrowing by checking `type === 'api'` before status access.
- [2026-04-23] Leftover 'Generating...' debug artifact in `AnimeGrid.svelte` → ROOT CAUSE: Incomplete removal of debug string after implementing vitualized grid. → FIX: Manually removed the string literal from the component markup.
- [2026-04-23] Score distribution graph not visible in stats → ROOT CAUSE: Flex container used `items-end` without defined height context, preventing percentage heights from rendering. → FIX: Changed parent to `items-stretch` and added `h-full` to children.
- [2026-04-23] Global schedule page empty/unreliable → ROOT CAUSE: Relying on Jikan for full schedules was buggy and often empty. → FIX: Removed `/schedule` route entirely and integrated native MAL `broadcast` data directly into the anime detail page.
- [2026-04-23] Empty/broken cards appearing in user list randomly → ROOT CAUSE: `addToList` wrote a blank skeleton entry `title: ''` to IDB/memory _before_ waiting for the detail fetch to complete. If detail failed, the empty entry was stuck. → FIX: Added fallback params to `addToList`. Callers now provide title and picture from the search card, guaranteeing an entry is never blank.
- [2026-04-23] Deleted anime returning on next sync → ROOT CAUSE: `removeFromList` caught MAL deletion errors (like rate-limits) but swallowed them, returning `ok()` without queueing a retry. → FIX: Failed deletions are now queued to `syncQueue` with `payload: { _delete: true }` to ensure eventual consistency.
- [2026-04-25] Infinite scroll collapses back to 40 items on episode increment → ROOT CAUSE: `$effect` tracked deep reactive `entries` array directly instead of distinct filter bounds. → FIX: Bound `AnimeGrid` reset strictly to a custom `resetKey` built from filter state.
- [2026-04-25] Screen readers fail and invalid HTML generated on AnimeCard → ROOT CAUSE: Interactive `EpisodeCounter` `<button>` elements nested inside top-level `<a>` container. → FIX: Converted container to `div` and utilized absolute stretched `<a>` overlays alongside `z-index` layering for distinct click targets.
- [2026-04-25] Search bar triggers routing on every keystroke → ROOT CAUSE: `oninput` handler lacked debounce logic. → FIX: Added standard 250ms `setTimeout` to input handler prior to executing `goto`.
- [2026-04-26] Codebase redundancy in UI styling and API mapping → ROOT CAUSE: Hardcoded inline string arrays for Status Badges and duplicated object-mapping in `mal.ts`. → FIX: Centralized Tailwind mapping records to `format.ts` and extracted `mapBaseAnimeNode` to DRY out API parsing.
- [2026-04-30] Audit Finding: Authentication Type Safety (`as any`) → ROOT CAUSE: Bypassed Zod parsing during MAL OAuth token exchange using `as any`, risking runtime crashes on schema changes. → FIX: Upgraded to `unknown` casting and enforced `MalTokenResponseSchema.safeParse` to guarantee type safety.
- [2026-04-30] Audit Finding: Event Propagation in RatingStars → ROOT CAUSE: `e.stopPropagation()` on the container did not prevent nested `<a>` tags from triggering navigation when rating stars were clicked inside AnimeCards. → FIX: Applied explicit `e.preventDefault()` and `e.stopPropagation()` to individual star `onclick` and `onkeydown` handlers.
- [2026-04-30] Audit Finding: Hardcoded Session Keys → ROOT CAUSE: Session storage keys for sync state and PKCE were hardcoded strings scattered across components. → FIX: Extracted keys to a centralized `STORAGE_KEYS` map in `src/lib/constants.ts`.
- [2026-04-30] Audit Finding: Residual console.warn in production → ROOT CAUSE: Debugging `console.warn` statements left in cache and store files. → FIX: Created an environment-aware `logger` utility (`src/lib/utils/logger.ts`) and replaced all raw console warnings with `logger.warn` to silence production logs.
- [2026-04-30] Audit Verification: Stale State in `userListStore` (False Positive) → INSIGHT: Svelte 5 `$state` proxy natively drops stale keys when the object is reassigned (`entries = newEntries`). No manual reconciliation is needed.
