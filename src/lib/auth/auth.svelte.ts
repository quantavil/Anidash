// ─── Auth Store (Svelte 5 Runes) ───
// Manages authentication state, login flow, callback handling.

import { goto } from '$app/navigation';
import { generatePKCE } from './pkce';
import { tokens, refreshTokens } from './tokens';
import { authFetch } from '$lib/api/fetch';
import { MAL_API_BASE } from '$lib/api/config';
import { ok, err, type Result } from '$lib/api/result';
import { MalUserSchema, MalTokenResponseSchema, type MalUser } from '$lib/api/schemas/mal.schema';
import { zodIssuesToSummaries } from '$lib/api/result';
import { STORAGE_KEYS } from '$lib/constants';
import { logger } from '$lib/utils/logger';

const AUTH_ROUTES = ['/login', '/auth/callback'];

function createAuthStore() {
	let user = $state<MalUser | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isExchanging = $state(false);

	const isAuthenticated = $derived(user !== null);
	const userId = $derived(user?.id ?? null);

	// ─── Initialize ───

	async function init(): Promise<void> {
		isLoading = true;
		error = null;

		const storedTokens = tokens.get();
		if (!storedTokens) {
			isLoading = false;
			return;
		}

		// Optimistic Cache load
		if (typeof window !== 'undefined') {
			const cachedUser = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
			if (cachedUser) {
				try {
					user = JSON.parse(cachedUser);
					isLoading = false; // Immediately let UI render
				} catch {
					localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
				}
			}
		}

		// Background revalidation (non-blocking)
		fetchUserProfile().then(async (result) => {
			if (result.ok) {
				user = result.value;
			} else {
				// Try refreshing the token if profile fetch failed (possible token expired)
				const refreshed = await refreshTokens();
				if (refreshed.ok) {
					const retry = await fetchUserProfile();
					if (retry.ok) {
						user = retry.value;
					} else {
						logger.warn('Profile fetch failed after refresh:', retry.error);
					}
				} else {
					// Refresh failed — clear tokens, force logout/re-login
					logout();
				}
			}
			isLoading = false;
		});
	}

	// ─── Fetch User Profile ───

	async function fetchUserProfile(): Promise<Result<MalUser>> {
		const result = await authFetch(`${MAL_API_BASE}/users/@me?fields=anime_statistics`);
		if (!result.ok) return result;

		try {
			const data = await result.value.json();
			const parsed = MalUserSchema.safeParse(data);

			if (!parsed.success) {
				return err({
					type: 'validation',
					message: 'Invalid user profile data from MAL',
					issues: zodIssuesToSummaries(parsed.error.issues)
				});
			}

			// Save to cache
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(parsed.data));
			}

			return ok(parsed.data);
		} catch (e) {
			return err({
				type: 'network',
				message: 'Failed to parse user profile response',
				cause: e instanceof Error ? e : undefined
			});
		}
	}

	// ─── Login ───

	async function login(): Promise<void> {
		error = null;

		try {
			const { verifier, challenge, state } = await generatePKCE();
			const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

			sessionStorage.setItem(
				STORAGE_KEYS.PKCE_VERIFIER,
				JSON.stringify({ verifier, state, expiresAt })
			);

			const clientId = import.meta.env.VITE_MAL_CLIENT_ID;
			if (!clientId) {
				error = 'MAL Client ID not configured';
				return;
			}

			const redirectUri = `${window.location.origin}/auth/callback`;
			const params = new URLSearchParams({
				response_type: 'code',
				client_id: clientId,
				code_challenge: challenge,
				state,
				redirect_uri: redirectUri
			});

			window.location.href = `https://myanimelist.net/v1/oauth2/authorize?${params}`;
		} catch (e) {
			error = 'Failed to initiate login';
			logger.error('Login error:', e);
		}
	}

	let exchangePromise: Promise<Result<void>> | null = null;

	async function handleCallback(code: string, returnedState: string): Promise<Result<void>> {
		if (exchangePromise) return exchangePromise;

		exchangePromise = (async () => {
			isExchanging = true;
			error = null;

			const storedData = sessionStorage.getItem(STORAGE_KEYS.PKCE_VERIFIER);
			if (!storedData) {
				isExchanging = false;
				return err({
					type: 'auth',
					message: 'Missing login session data — please try logging in again'
				});
			}

			let verifier, state, expiresAt;
			try {
				({ verifier, state, expiresAt } = JSON.parse(storedData));
			} catch (e) {
				sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
				isExchanging = false;
				return err({ type: 'auth', message: 'Corrupted login session data' });
			}

			if (Date.now() > expiresAt) {
				sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
				isExchanging = false;
				return err({ type: 'auth', message: 'Login session expired — please try again' });
			}

			if (state !== returnedState) {
				sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
				isExchanging = false;
				return err({ type: 'auth', message: 'CSRF token mismatch' });
			}

			// Clean up PKCE early for security
			sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);

			// Use default local worker if not configured to prevent crashes in local dev
			const workerUrl = import.meta.env.VITE_WORKER_URL || '';

			try {
				const redirectUri = `${window.location.origin}/auth/callback`;

				const response = await fetch(`${workerUrl}/auth/token`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						code,
						code_verifier: verifier,
						redirect_uri: redirectUri
					})
				});

				const body = (await response.json()) as unknown;
				const bodyPartial = body as { error?: string };

				if (!response.ok) {
					isExchanging = false;
					return err({
						type: 'api',
						status: response.status,
						message: bodyPartial.error || 'Token exchange failed'
					});
				}

				// Validate token response
				const parsed = MalTokenResponseSchema.safeParse(body);
				if (!parsed.success) {
					isExchanging = false;
					return err({
						type: 'validation',
						message: 'Invalid token response from server',
						issues: zodIssuesToSummaries(parsed.error.issues)
					});
				}

				const tokenData = parsed.data;
				tokens.set({
					accessToken: tokenData.access_token,
					refreshToken: tokenData.refresh_token ?? '',
					expiresAt: Date.now() + tokenData.expires_in * 1000
				});

				// Fetch user profile
				const userResult = await fetchUserProfile();
				if (userResult.ok) {
					user = userResult.value;
				}

				isExchanging = false;
				return ok(undefined);
			} catch (e) {
				isExchanging = false;
				return err({
					type: 'network',
					message: 'Network error during authentication',
					cause: e instanceof Error ? e : undefined
				});
			}
		})();
		const res = await exchangePromise;
		exchangePromise = null;
		return res;
	}

	// ─── Logout ───

	async function logout(): Promise<void> {
		tokens.clear();
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
		}
		user = null;
		error = null;

		try {
			const { userListStore } = await import('$lib/stores/userlist.svelte');
			userListStore.clear();
		} catch {}

		// Clear IndexedDB
		try {
			const { deleteDB } = await import('$lib/cache/db');
			await deleteDB();
		} catch {
			// IDB deletion can fail if locked — not critical
		}

		goto('/login');
	}

	// ─── Auth Guard ───

	function isAuthRoute(pathname: string): boolean {
		return AUTH_ROUTES.some((route) => pathname.startsWith(route));
	}

	return {
		get user() {
			return user;
		},
		get isLoading() {
			return isLoading;
		},
		get isAuthenticated() {
			return isAuthenticated;
		},
		get userId() {
			return userId;
		},
		get error() {
			return error;
		},
		get isExchanging() {
			return isExchanging;
		},

		init,
		login,
		handleCallback,
		logout,
		isAuthRoute,
		fetchUserProfile
	};
}

export const authStore = createAuthStore();
