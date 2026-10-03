import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tokens, parseAndSetTokens, needsRefresh, refreshTokens } from '$lib/auth/tokens';

const storage = new Map<string, string>();
const localStorageMock = {
	getItem: (key: string) => storage.get(key) ?? null,
	setItem: (key: string, value: string) => storage.set(key, value),
	removeItem: (key: string) => storage.delete(key),
	clear: () => storage.clear()
};

Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true
});

describe('tokens auth storage and refresh helpers', () => {
	beforeEach(() => {
		storage.clear();
	});

	it('returns null when no tokens are stored', () => {
		expect(tokens.get()).toBeNull();
		expect(tokens.getAccessToken()).toBeNull();
		expect(needsRefresh()).toBe(false);
	});

	it('parses valid token response and persists into storage', () => {
		const rawResponse = {
			token_type: 'Bearer',
			expires_in: 3600,
			access_token: 'test_access_token_123',
			refresh_token: 'test_refresh_token_456'
		};

		const result = parseAndSetTokens(rawResponse);
		expect(result.ok).toBe(true);

		const stored = tokens.get();
		expect(stored).toBeDefined();
		expect(stored?.accessToken).toBe('test_access_token_123');
		expect(stored?.refreshToken).toBe('test_refresh_token_456');
		expect(stored?.expiresAt).toBeGreaterThan(Date.now());
		expect(tokens.getAccessToken()).toBe('test_access_token_123');
	});

	it('handles missing refresh_token by utilizing fallbackRefreshToken', () => {
		const rawResponse = {
			token_type: 'Bearer',
			expires_in: 3600,
			access_token: 'new_access_token'
		};

		const result = parseAndSetTokens(rawResponse, 'existing_refresh_token');
		expect(result.ok).toBe(true);

		const stored = tokens.get();
		expect(stored?.accessToken).toBe('new_access_token');
		expect(stored?.refreshToken).toBe('existing_refresh_token');
	});

	it('clears storage and returns validation error on invalid response', () => {
		const invalidResponse = {
			something_wrong: true
		};

		const result = parseAndSetTokens(invalidResponse);
		expect(result.ok).toBe(false);
		expect(tokens.get()).toBeNull();
	});

	it('correctly calculates needsRefresh based on expiry window', () => {
		tokens.set({
			accessToken: 'token',
			refreshToken: 'refresh',
			expiresAt: Date.now() + 7_200_000 // 2 hours in future
		});
		expect(needsRefresh()).toBe(false);

		tokens.set({
			accessToken: 'token',
			refreshToken: 'refresh',
			expiresAt: Date.now() + 1_800_000 // 30 minutes in future (within 1h threshold)
		});
		expect(needsRefresh()).toBe(true);
	});
});

describe('refreshTokens failure classification', () => {
	beforeEach(() => {
		storage.clear();
		tokens.set({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 1000 });
	});
	afterEach(() => vi.unstubAllGlobals());

	function stubRefresh(status: number, body: unknown) {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
		);
	}

	it('keeps the session when our own endpoint rate-limits the refresh (429)', async () => {
		stubRefresh(429, { ok: false, error: 'Rate limit exceeded' });
		const res = await refreshTokens();
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error.type).toBe('network');
		expect(tokens.get()).not.toBeNull();
	});

	it('keeps the session when MAL rejects the client (misconfigured secret)', async () => {
		stubRefresh(401, { error: 'invalid_client' });
		const res = await refreshTokens();
		expect(res.ok).toBe(false);
		expect(tokens.get()).not.toBeNull();
	});

	it('keeps the session on server errors', async () => {
		stubRefresh(500, {
			ok: false,
			error: 'MAL credentials not configured in platform environment'
		});
		await refreshTokens();
		expect(tokens.get()).not.toBeNull();
	});

	it('ends the session when the refresh token itself is rejected', async () => {
		stubRefresh(400, { error: 'invalid_grant' });
		const res = await refreshTokens();
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error.type).toBe('auth');
		expect(tokens.get()).toBeNull();
	});

	it('stores rotated tokens on success', async () => {
		stubRefresh(200, {
			token_type: 'Bearer',
			expires_in: 3600,
			access_token: 'new',
			refresh_token: 'new_r'
		});
		const res = await refreshTokens();
		expect(res.ok).toBe(true);
		expect(tokens.get()).toMatchObject({ accessToken: 'new', refreshToken: 'new_r' });
	});
});
