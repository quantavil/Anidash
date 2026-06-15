export const STORAGE_KEYS = {
	HAS_SYNCED_THIS_SESSION: 'anidash_has_synced_this_session',
	SEEN_LOGIN_PROMPT: 'anidash_seen_login_prompt',
	PKCE_VERIFIER: 'anidash_pkce_verifier',
	TOKENS: 'anidash_tokens',
	REFRESH_LOCK: 'anidash_refresh_lock',
	USER_PROFILE: 'anidash_user_profile',
	DUB_MODE: 'anidash_dub_mode',
	MIRRORS: 'anidash-mirrors',
	PREFER_ENGLISH: 'anidash_prefer_english',
	PTW_FILTERS: 'anidash_ptw_filters'
} as const;

export const MEDIA_TYPE_FILTER_OPTIONS = [
	{ value: '', label: 'All' },
	{ value: 'tv', label: 'TV' },
	{ value: 'movie', label: 'Movie' },
	{ value: 'ova', label: 'OVA' },
	{ value: 'special', label: 'Special' },
	{ value: 'ona', label: 'ONA' }
] as const;
