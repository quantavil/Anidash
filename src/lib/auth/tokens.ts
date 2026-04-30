// ─── Token persistence & refresh ───
// Tokens live in localStorage. Refresh is proxied through the Worker.

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

		const body = (await response.json()) as unknown;
		const bodyPartial = body as { ok?: boolean; error?: string };

		if (!response.ok || !bodyPartial.ok) {
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
