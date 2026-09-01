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

/** MAL v2 has no genres-listing endpoint — this static list mirrors MAL/AniList genre IDs. */
export const ANIME_GENRES: Array<{ id: number; name: string }> = [
	{ id: 1, name: 'Action' },
	{ id: 2, name: 'Adventure' },
	{ id: 5, name: 'Avant Garde' },
	{ id: 46, name: 'Award Winning' },
	{ id: 4, name: 'Comedy' },
	{ id: 8, name: 'Drama' },
	{ id: 10, name: 'Fantasy' },
	{ id: 47, name: 'Gourmet' },
	{ id: 14, name: 'Horror' },
	{ id: 7, name: 'Mystery' },
	{ id: 22, name: 'Romance' },
	{ id: 24, name: 'Sci-Fi' },
	{ id: 36, name: 'Slice of Life' },
	{ id: 30, name: 'Sports' },
	{ id: 37, name: 'Supernatural' },
	{ id: 41, name: 'Suspense' }
];

/** Genre names excluded when Safe Search is enabled. */
export const NSFW_GENRE_NAMES = ['Hentai', 'Erotica'];

/** IndexedDB meta key for the stale-while-revalidate popular grid. */
export const POPULAR_CACHE_KEY = 'browse:popular:v1';
export const POPULAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
