// ─── Token persistence & refresh ───
// Tokens live in localStorage. Refresh is proxied through the Worker.

import { ok, err, type Result } from '$lib/api/result';

export interface TokenData {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // epoch ms
}

const STORAGE_KEY = 'anidash_tokens';

// ─── Storage ───

export const tokens = {
	get(): TokenData | null {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			return JSON.parse(raw) as TokenData;
		} catch {
			return null;
		}
	},

	set(data: TokenData): void {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	},

	clear(): void {
		localStorage.removeItem(STORAGE_KEY);
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

// Mutex: prevent concurrent refresh calls
let refreshPromise: Promise<Result<void>> | null = null;

/** Refresh the access token via the Worker proxy. Deduplicates concurrent calls. */
export async function refreshTokens(): Promise<Result<void>> {
	// If a refresh is already in flight, wait for it
	if (refreshPromise) return refreshPromise;

	refreshPromise = doRefresh();
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

		const body = (await response.json()) as any;

		if (!response.ok || !body.ok) {
			tokens.clear();
			return err({ type: 'auth', message: body.error || 'Token refresh failed' });
		}

		// MAL may or may not return a new refresh_token
		tokens.set({
			accessToken: body.access_token,
			refreshToken: body.refresh_token ?? data.refreshToken,
			expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000
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
