export const STORAGE_KEYS = {
	HAS_SYNCED_THIS_SESSION: 'anidash_has_synced_this_session',
	PKCE_VERIFIER: 'anidash_pkce_verifier',
	TOKENS: 'anidash_tokens',
	REFRESH_LOCK: 'anidash_refresh_lock',
	USER_PROFILE: 'anidash_user_profile',
	DUB_MODE: 'anidash_dub_mode',
	MIRRORS: 'anidash-mirrors',
	PREFER_ENGLISH: 'anidash_prefer_english'
} as const;

/** IndexedDB meta key for the stale-while-revalidate popular grid. */
export const POPULAR_CACHE_KEY = 'browse:popular:v2';
export const POPULAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
