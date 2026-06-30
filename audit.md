# AniDash Codebase Audit Report


---

## 🔴 Critical Issues

### B-02 · Two sources of truth for token-refresh lock (TOCTOU race)
* **File:** [tokens.ts](file:///home/quantavil/Documents/Project/anidash/src/lib/auth/tokens.ts#L78-L89)
* **Status:** (Fixed)
* **Details:** Lock checks via local reading and writing to `localStorage` across separate tabs/processes are subject to a time-of-check to time-of-use (TOCTOU) race. If two tabs concurrently check the lock status before either has written, both can believe they acquired the lock and trigger simultaneous token refresh calls, causing MyAnimeList token rotation to invalidate the session.

### B-03 · `flushPendingSyncs` on `beforeunload` is a no-op
* **File:** [+layout.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/+layout.svelte#L93-L96)
* **Status:** (Fixed)
* **Details:** `flushPendingSyncs` invokes an async function that returns a Promise. During page teardown (`beforeunload`), the browser does not await queued microtasks (like IndexedDB writes or active fetch requests), meaning the operations are terminated instantly and pending changes from the last debounce window are lost.

### B-04 · Login page only displays `access_denied`; other errors are dropped
* **File:** [login/+page.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/login/+page.svelte#L23-L27)
* **Status:** (Fixed)
* **Details:** While the callback page redirects with diverse error parameters (e.g. `no_code_or_state`, token exchange failures, etc.), the login page only renders an alert if `errorCode === 'access_denied'`. All other error types are silently ignored.

### B-05 · Login page lets authenticated users re-authenticate
* **File:** [login/+page.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/login/+page.svelte)
* **Status:** (Fixed)
* **Details:** Already authenticated users who navigate back or land on `/login` are not redirected to `/` and can trigger a new MAL login flow, causing unnecessary roundtrips and potentially invalidating existing session tokens.

### B-06 · `pendingSyncs.delete(malId)` deletes the wrong sync on rapid edits
* **File:** [userlist.svelte.ts](file:///home/quantavil/Documents/Project/anidash/src/lib/stores/userlist.svelte.ts#L148-L189)
* **Status:** (Fixed)
* **Details:** Once a debounced sync starts executing, it yields control at async boundaries. If a user performs a rapid mutation, `cancelPendingSync` deletes the old sync from the map and starts a new one. However, the first async function continues running in the background and eventually calls `pendingSyncs.delete(malId)`, which deletes the *newer* sync from the map, leaving the new sync uncancelable.

---

## 🟠 Moderate Issues

### B-07 · `season` URL param not validated → `prevSeason(undefined)` crashes
* **File:** [seasonal/+page.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/seasonal/+page.svelte#L21) and [season.ts](file:///home/quantavil/Documents/Project/anidash/src/lib/utils/season.ts)
* **Status:** (Fixed)
* **Details:** If an invalid season string is passed (e.g. `/seasonal?season=invalid`), `seasonIndex` returns `-1`, causing `prevSeason` to return `{ year, season: undefined }`. When `capitalize(prev.season)` is called in the template, it throws a runtime TypeError and crashes the renderer.

### B-08 · `doRefresh` clears tokens on transient 5xx / 429
* **File:** [tokens.ts](file:///home/quantavil/Documents/Project/anidash/src/lib/auth/tokens.ts#L197-L200)
* **Status:** (Fixed)
* **Details:** If the refresh request to the proxy Worker fails with a transient 5xx server error or a 429 rate limit error, the condition `!response.ok` clears the user's tokens, logging them out on minor backend failures.

### B-09 · `api/[...path]` proxy sends both Bearer token AND `X-MAL-CLIENT-ID`
* **File:** [+server.ts](file:///home/quantavil/Documents/Project/anidash/src/routes/api/%5B...path%5D/+server.ts#L17-L18)
* **Status:** (Fixed)
* **Details:** Sending both headers simultaneously is redundant. For authenticated requests, sending `X-MAL-CLIENT-ID` alongside a Bearer token can cause MAL to apply stricter client-credentials rate limits instead of user-specific limits.

### B-10 · API proxy has no rate limiting
* **File:** [+server.ts](file:///home/quantavil/Documents/Project/anidash/src/routes/api/%5B...path%5D/+server.ts)
* **Status:** (Fixed)
* **Details:** The backend proxy has no rate-limiting checks per client IP, meaning a compromised or misbehaving client can flood requests, potentially causing MAL to temporarily ban the application server IP.

---

## 🟡 Minor Issues

### B-11 · RecommenderWidgets roulette interval leaks on navigation
* **File:** [RecommenderWidgets.svelte](file:///home/quantavil/Documents/Project/anidash/src/lib/ui/RecommenderWidgets.svelte)
* **Status:**  (Fixed)
* **Details:** PTW roulette interval had no cleanup and leaked active routing calls when navigating away before it finished. (This has been resolved).

### B-12 · Character/Recommendations errors silently swallowed
* **File:** [id/+page.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/anime/%5Bid%5D/+page.svelte)
* **Status:** (Fixed)
* **Details:** Failures inside `loadCharacters` update `charactersError` but this variable is never bound/read in the markup template, hiding errors from the user.

### B-13 · `addToList` silently sends incomplete payload when status='completed' but detail fetch fails
* **File:** [userlist.svelte.ts](file:///home/quantavil/Documents/Project/anidash/src/lib/stores/userlist.svelte.ts#L312-L321)
* **Status:** (Fixed)
* **Details:** If detail fetching fails, `finalEpisodes` defaults to 0 and the payload is sent without `num_watched_episodes`, causing MAL to record a completed status with 0 watched episodes.

### B-14 · `dubStore.init()` can refetch forever if dubInfo is empty
* **File:** [dub.svelte.ts](file:///home/quantavil/Documents/Project/anidash/src/lib/stores/dub.svelte.ts#L76-L79)
* **Status:** (Fixed)
* **Details:** If the cached/fetched dub info has size 0, `#initPromise` is set to null, causing every call to re-trigger fetches and database operations.

### B-15 · `connection.svelte.ts` `wasOffline` timer is unmanaged
* **File:** [connection.svelte.ts](file:///home/quantavil/Documents/Project/anidash/src/lib/utils/connection.svelte.ts#L12-L21)
* **Status:** (Fixed)
* **Details:** The unmanaged `setTimeout` doesn't clear previous timers and can overwrite/flicker state if rapid offline/online changes occur.

### B-16 · Toaster position collides with mobile bottom nav
* **File:** [+layout.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/+layout.svelte#L131-L133)
* **Status:** (Fixed)
* **Details:** Toast popups positioned at `bottom-right` overlay and block access to the fixed bottom navigation tab bar on mobile devices.


### B-18 · Login prompt modal: no Escape key, no focus trap
* **File:** [+layout.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/+layout.svelte#L170-L205)
* **Status:** (Fixed)
* **Details:** The custom login overlay has no keyboard key handlers (`Escape`), focus target initialization, or accessibility focus trap, making it inaccessible for keyboard and screen reader users.

### B-19 · Browse page empty state shows briefly on initial load
* **File:** [browse/+page.svelte](file:///home/quantavil/Documents/Project/anidash/src/routes/browse/+page.svelte#L33)
* **Status:** (Fixed)
* **Details:** `loading` initializes to `false` and is updated to `` inside `$effect` (after mount). This causes the empty state to render for a brief fraction of a second before switching to the skeleton loader.

---

## 🎨 Redundancy, UX & SLOP Issues

* **UX-05 · `AnimeCard.svelte` `will-change-transform` always applied** (Fixed): Applying it permanently creates compositing layers for every card on the grid.
* **UX-06 · `stats/+page.svelte` "Days Watched" formula is incorrect** (Fixed): The formula incorrectly divides by 10 instead of 24.
* **SLOP-02 · `app.d.ts` `Promise<any>` instead of `Promise<unknown>`** (Fixed): 
* **SLOP-03 · `tokens.ts` cross-tab refresh lock coordination complexity**: .

---

