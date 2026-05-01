# Generalist Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the 1🔴 and 7🟡 audit issues reported in the Generalist section of `audit.md`.

**Architecture:** We will implement minor fixes across various files including adding TTLs, backoff logic, CSRF tokens, and CSP headers to secure and stabilize the system.

**Tech Stack:** Svelte 5 (Runes), IndexedDB, Vite, TypeScript.

---

### Task 1: Replace Raw console.error with logger.error (🔴)

**Files:**
- Modify: `src/lib/auth/auth.svelte.ts`
- Modify: `src/lib/stores/userlist.svelte.ts`
- Modify: `src/lib/stores/dub.svelte.ts`

- [x] **Step 1: Replace raw console.error**
Replaced `console.error` with `logger.error` where applicable to ensure logs are handled properly in production.

### Task 2: OAuth PKCE CSRF state parameter and TTL (🟡)

**Files:**
- Modify: `src/lib/auth/pkce.ts`
- Modify: `src/lib/auth/auth.svelte.ts`
- Modify: `src/routes/auth/callback/+page.svelte`

- [x] **Step 1: Update generatePKCE to return state**
Included `state` alongside `verifier` and `challenge` for CSRF defense-in-depth.

- [x] **Step 2: Update login logic to enforce 5 min TTL**
Stored `{ verifier, state, expiresAt }` in `sessionStorage` with a 5-minute TTL. Passed `state` to the OAuth redirect URI.

- [x] **Step 3: Update callback to pass state and handleCallback to validate it**
Read `state` from URL and ensured it matches the cached value. Expired login sessions are cleared.

### Task 4: Token Storage XSS Risk & CSP (🟡)

**Files:**
- Modify: `src/lib/auth/tokens.ts`
- Modify: `svelte.config.js`

- [x] **Step 1: Document XSS Risk**
Added a comment in `src/lib/auth/tokens.ts` outlining the risks of storing tokens in `localStorage`.

- [x] **Step 2: Add CSP to svelte.config.js**
Added basic CSP directives (`script-src`, `object-src`, `base-uri`) to `svelte.config.js`.

### Task 5: Offline Sync TTL and Retry Backoff (🟡)

**Files:**
- Modify: `src/lib/stores/userlist.svelte.ts`

- [x] **Step 1: Implement 7 day TTL for Sync Queue items**
In `flushPersistentQueue`, check the `timestamp` against `Date.now()`. If it's older than 7 days, delete the item.

- [x] **Step 2: Implement Exponential Backoff**
Introduced `retryDelay` starting at 1000ms. On failure (non-400/404), wait, double the delay, and stop flushing.

### Task 6: IDB Cache UserList TTL (🟡)

**Files:**
- Modify: `src/lib/stores/userlist.svelte.ts`

- [x] **Step 1: Enforce 7 Day TTL**
In `loadFromCache`, verified `updatedAt`. If older than 7 days, remove it from the local cache.

### Task 7: Build-time Environment Validation (🟡)

**Files:**
- Modify: `vite.config.ts`

- [x] **Step 1: Check VITE_MAL_CLIENT_ID**
Added a check that logs a warning if `VITE_MAL_CLIENT_ID` is missing in non-test environments.