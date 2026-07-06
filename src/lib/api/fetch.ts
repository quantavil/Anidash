// ─── Authenticated fetch wrapper ───
// Attaches Bearer token, handles proactive + reactive refresh.

import { tokens, needsRefresh, refreshTokens } from '$lib/auth/tokens';
import { ok, err, type Result } from '$lib/api/result';

/**
 * Authenticated fetch — returns Result<Response>.
 * - Proactively refreshes token if expiring within 1hr
 * - Reactively retries once on 401
 * - Catches network errors into Result
 */
export async function authFetch(url: string, options?: RequestInit): Promise<Result<Response>> {
	const method = (options?.method ?? 'GET').toUpperCase();

	// Proactive refresh (no-op when there are no tokens)
	if (needsRefresh()) {
		const refreshed = await refreshTokens();
		if (!refreshed.ok) {
			return err(refreshed.error);
		}
	}

	const token = tokens.getAccessToken();
	if (!token) {
		// Unauthenticated GETs are allowed — the proxy injects the MAL client id so
		// public data (search, seasonal) works for logged-out visitors. Mutations don't.
		if (method === 'GET') {
			const res = await safeFetch(url, options);
			if (!res.ok) return res;
			return toResult(res.value);
		}
		return err({ type: 'auth', message: 'Not authenticated' });
	}

	// Initial request
	const result = await safeFetch(url, withAuthHeader(options, token));

	if (!result.ok) return result;

	// Reactive: on 401, refresh and retry once
	if (result.value.status === 401) {
		const refreshed = await refreshTokens();
		if (!refreshed.ok) {
			return err(refreshed.error);
		}

		const newToken = tokens.getAccessToken();
		if (!newToken) {
			return err({ type: 'auth', message: 'Not authenticated after refresh' });
		}

		const retry = await safeFetch(url, withAuthHeader(options, newToken));
		if (!retry.ok) return retry;
		return toResult(retry.value);
	}

	// Other non-OK statuses
	return toResult(result.value);
}

/** Map an HTTP Response to a Result, converting non-OK statuses to an api error. */
async function toResult(response: Response): Promise<Result<Response>> {
	if (response.ok) return ok(response);
	const body = await response.text().catch(() => '');
	return err({
		type: 'api',
		status: response.status,
		message: response.statusText || `HTTP ${response.status}`,
		body: body || undefined
	});
}

/** Fetch that catches network errors into Result */
async function safeFetch(url: string, options?: RequestInit): Promise<Result<Response>> {
	try {
		const response = await fetch(url, options);
		return ok(response);
	} catch (e) {
		return err({
			type: 'network',
			message: e instanceof Error ? e.message : 'Network error',
			cause: e instanceof Error ? e : undefined
		});
	}
}

/** Clone options with Authorization header */
function withAuthHeader(options: RequestInit | undefined, token: string): RequestInit {
	return {
		...options,
		headers: {
			...options?.headers,
			Authorization: `Bearer ${token}`
		}
	};
}
