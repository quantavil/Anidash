// ─── Token persistence & refresh ───
// Tokens live in localStorage. Refresh is proxied through the Worker.
// Note: Storing tokens in localStorage exposes them to Cross-Site Scripting (XSS) attacks.
// Ensure strong Content-Security-Policy (CSP) headers and sanitize all user input.

import { ok, err, type Result, zodIssuesToSummaries } from '$lib/api/result';
import { MalTokenResponseSchema } from '$lib/api/schemas/mal.schema';
import { STORAGE_KEYS } from '$lib/constants';

export interface TokenData {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // epoch ms
}

// ─── Storage ───

export const tokens = {
	get(): TokenData | null {
		try {
			const raw = localStorage.getItem(STORAGE_KEYS.TOKENS);
			if (!raw) return null;
			return JSON.parse(raw) as TokenData;
		} catch {
			return null;
		}
	},

	set(data: TokenData): void {
		localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(data));
	},

	clear(): void {
		localStorage.removeItem(STORAGE_KEYS.TOKENS);
	},

	/** Get just the access token, or null */
	getAccessToken(): string | null {
		return tokens.get()?.accessToken ?? null;
	}
};

// ─── Refresh Logic ───

/** True if token expires within 1 hour */
export function needsRefresh(): boolean {
	const data = tokens.get();
	if (!data) return false;
	return Date.now() > data.expiresAt - 3_600_000;
}

/** True if token is already expired */
export function isExpired(): boolean {
	const data = tokens.get();
	if (!data) return true;
	return Date.now() >= data.expiresAt;
}

// ─── Cross-Tab Refresh Coordination ───
// MAL rotates refresh tokens on exchange. If two tabs refresh concurrently,
// the second request uses an invalidated token and logs the user out.
// We use a localStorage-based lock to coordinate across tabs.

const LOCK_TTL_MS = 15_000; // 15 seconds — max time a refresh should take
let refreshPromise: Promise<Result<void>> | null = null;

interface RefreshLock {
	ts: number;     // when the lock was acquired
	tabId: string;  // unique tab identifier
}

const TAB_ID = typeof crypto !== 'undefined'
	? crypto.randomUUID()
	: Math.random().toString(36).slice(2);

function getRefreshLock(): RefreshLock | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.REFRESH_LOCK);
		if (!raw) return null;
		return JSON.parse(raw) as RefreshLock;
	} catch {
		return null;
	}
}

function acquireLock(): boolean {
	const existing = getRefreshLock();
	// If another tab holds a fresh lock, don't compete
	if (existing && existing.tabId !== TAB_ID && Date.now() - existing.ts < LOCK_TTL_MS) {
		return false;
	}
	localStorage.setItem(
		STORAGE_KEYS.REFRESH_LOCK,
		JSON.stringify({ ts: Date.now(), tabId: TAB_ID })
	);
	return true;
}

function releaseLock(): void {
	const existing = getRefreshLock();
	// Only release our own lock
	if (existing?.tabId === TAB_ID) {
		localStorage.removeItem(STORAGE_KEYS.REFRESH_LOCK);
	}
}

/** Wait for another tab to finish refreshing (polls localStorage for new tokens). */
async function waitForOtherTabRefresh(originalExpiresAt: number): Promise<Result<void>> {
	const maxWait = LOCK_TTL_MS;
	const pollInterval = 200;
	let waited = 0;

	while (waited < maxWait) {
		await new Promise((r) => setTimeout(r, pollInterval));
		waited += pollInterval;

		// Check if tokens were updated by the other tab
		const current = tokens.get();
		if (current && current.expiresAt > originalExpiresAt) {
			return ok(undefined); // Other tab refreshed successfully
		}

		// Check if the lock was released (other tab finished)
		const lock = getRefreshLock();
		if (!lock || Date.now() - lock.ts >= LOCK_TTL_MS) {
			break; // Lock expired or released — we can try ourselves
		}
	}

	// Other tab may have failed; try refreshing ourselves
	return doRefresh();
}

/** Refresh the access token via the Worker proxy. Deduplicates concurrent calls. */
export async function refreshTokens(): Promise<Result<void>> {
	// If a refresh is already in flight in this tab, wait for it
	if (refreshPromise) return refreshPromise;

	const currentTokens = tokens.get();
	const originalExpiresAt = currentTokens?.expiresAt ?? 0;

	// Try to acquire the cross-tab lock
	if (!acquireLock()) {
		// Another tab is refreshing — wait for it
		refreshPromise = waitForOtherTabRefresh(originalExpiresAt);
		const result = await refreshPromise;
		refreshPromise = null;
		return result;
	}

	// Check if tokens were ALREADY refreshed (by another tab between needsRefresh() and now)
	const freshCheck = tokens.get();
	if (freshCheck && freshCheck.expiresAt > originalExpiresAt) {
		releaseLock();
		return ok(undefined);
	}

	refreshPromise = doRefresh().finally(() => releaseLock());
	const result = await refreshPromise;
	refreshPromise = null;
	return result;
}

async function doRefresh(): Promise<Result<void>> {
	const data = tokens.get();
	if (!data?.refreshToken) {
		return err({ type: 'auth', message: 'No refresh token available' });
	}

	const workerUrl = import.meta.env.VITE_WORKER_URL || '';

	try {
		const response = await fetch(`${workerUrl}/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refresh_token: data.refreshToken })
		});

		const body = (await response.json()) as unknown;
		const bodyPartial = body as { error?: string };

		if (!response.ok) {
			tokens.clear();
			return err({ type: 'auth', message: bodyPartial.error || 'Token refresh failed' });
		}

		// Validate token response
		const parsed = MalTokenResponseSchema.safeParse(body);
		if (!parsed.success) {
			tokens.clear();
			return err({
				type: 'validation',
				message: 'Invalid token response from server',
				issues: zodIssuesToSummaries(parsed.error.issues)
			});
		}

		const tokenData = parsed.data;

		// MAL may or may not return a new refresh_token
		tokens.set({
			accessToken: tokenData.access_token,
			refreshToken: tokenData.refresh_token ?? data.refreshToken,
			expiresAt: Date.now() + tokenData.expires_in * 1000
		});

		return ok(undefined);
	} catch (e) {
		return err({
			type: 'network',
			message: 'Network error during token refresh',
			cause: e instanceof Error ? e : undefined
		});
	}
}
