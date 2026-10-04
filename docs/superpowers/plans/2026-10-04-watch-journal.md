# Watch Journal Implementation Plan

> **For agentic workers:** Execute inline. User explicitly requested implementation and autonomous polish.

**Goal:** Ship the approved visual direction as a usable responsive AniDash UI.
**Architecture:** Reuse existing stores and network boundaries. Add journal entries and collection shelf; keep poster grid as an alternate view. Shared tokens, navigation and controls unify other routes.
**Tech Stack:** Svelte 5, SvelteKit 2, Tailwind 4, Cloudflare, IndexedDB.
**Spec:** docs/superpowers/specs/2026-10-04-watch-journal-design.md

## Global constraints

Preserve all AGENTS.md API, auth, caching, sync, offline and ordering contracts. No new runtime dependencies. Real list data only.

## Review focus

Long titles and narrow screens; unknown/finished episode totals; personal score versus community mean; empty/search-filtered lists; offline and pending sync feedback.

## Tasks

- [x] Establish browser regression for visible personal rating and journal layout; run before implementation.
- [x] Update shared colour/type/surface tokens, logo, navigation, public welcome and startup shell. Files: app.css, app.html, +layout.svelte, FluidNav.svelte, Logo.svelte, static favicon/manifest.
- [x] Add RatingSelect.svelte, EpisodeProgress.svelte, JournalEntry.svelte, AnimeJournal.svelte and CollectionShelf.svelte. Consume UserListRecord and existing setScore/setStatus/incrementEpisode/setEpisodeCount methods. Clamp visual progress, show unknown totals, use native accessible score and status selection.
- [x] Integrate journal/grid view and actual planned shelf into +page.svelte; restyle TabBar/FilterBar/SearchInput/EpisodeCounter/AnimeCard. Preserve filters and sort logic.
- [x] Run check/test/build; inspect browser at phone/tablet/desktop and fix visual defects. Verify real controls and production offline routes. Remove preview mockup and open actual local app with xdg-open.

The user subsequently requested refreshed README.md and AGENTS.md, a commit, and a push to origin/main. Complete the required verification before integrating the watch journal branch.

## Verification result

2026-10-04: final Cloudflare build, Svelte check (0 errors/warnings), ESLint, and all 100 tests across 14 files passed. Production Chromium checks passed at 320/390/820/1440px, including ratings, persistent episode edits, PTW auto-watch, status changes, filtering, grid touch targets, unknown totals, completion, long titles and settings dismissal. Offline navigation and reload passed on /, /browse and /stats; cache contained 51 same-origin shell resources and no API/auth/cross-origin resources. Independent review findings (featured status, shrinking grid controls, short view toggle targets) were fixed. Generated mockup deleted. Actual dev app launched on http://127.0.0.1:5173 with the configured public MAL client. PageSpeed score changes are not yet measured against deployment.
