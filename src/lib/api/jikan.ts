import type { ZodType } from 'zod';

import { getDB } from '$lib/cache/db';
import { logger } from '$lib/utils/logger';
import { jikanLimiter } from './rate-limit';
import { buildSearchParams } from './params';
import { ok, err, type Result, zodIssuesToSummaries } from './result';
import {
	JikanCharactersResponseSchema,
	JikanRecommendationsResponseSchema,
	JikanSearchResponseSchema,
	JikanGenresResponseSchema,
	type JikanCharacterEntry,
	type JikanRecommendationEntry,
	type JikanAnime
} from './schemas/jikan.schema';
import { searchAnime as malSearchAnime, getRanking as malGetRanking } from './mal';
import type { MalAnimeLean } from './schemas/mal.schema';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

function mapMalLeanToJikanAnime(node: MalAnimeLean): JikanAnime {
	return {
		mal_id: node.id,
		title: node.title,
		title_english: node.alternative_titles?.en ?? null,
		images: {
			jpg: {
				image_url: node.main_picture?.medium ?? null,
				large_image_url: node.main_picture?.large ?? node.main_picture?.medium ?? null
			},
			webp: {
				image_url: node.main_picture?.medium ?? null,
				large_image_url: node.main_picture?.large ?? node.main_picture?.medium ?? null
			}
		},
		score: node.mean ?? null,
		episodes: node.num_episodes ?? 0,
		genres: node.genres?.map((g) => ({ mal_id: g.id, name: g.name })) ?? [],
		studios: node.studios?.map((s) => ({ mal_id: s.id, name: s.name })) ?? [],
		season: node.start_season?.season ?? null,
		year: node.start_season?.year ?? null,
		type: node.media_type ?? 'unknown',
		status: node.status ?? 'unknown',
		members: node.num_list_users ?? 0,
		synopsis: null
	};
}

const DEFAULT_ANIME_GENRES = [
	{ id: 1, name: 'Action', count: 0 },
	{ id: 2, name: 'Adventure', count: 0 },
	{ id: 5, name: 'Avant Garde', count: 0 },
	{ id: 46, name: 'Award Winning', count: 0 },
	{ id: 4, name: 'Comedy', count: 0 },
	{ id: 8, name: 'Drama', count: 0 },
	{ id: 10, name: 'Fantasy', count: 0 },
	{ id: 47, name: 'Gourmet', count: 0 },
	{ id: 14, name: 'Horror', count: 0 },
	{ id: 7, name: 'Mystery', count: 0 },
	{ id: 22, name: 'Romance', count: 0 },
	{ id: 24, name: 'Sci-Fi', count: 0 },
	{ id: 36, name: 'Slice of Life', count: 0 },
	{ id: 30, name: 'Sports', count: 0 },
	{ id: 37, name: 'Supernatural', count: 0 },
	{ id: 41, name: 'Suspense', count: 0 }
];

function getTTLForUrl(url: string): number {
	if (url.includes('/genres/anime')) {
		return 7 * 24 * 60 * 60 * 1000; // 7 days
	}
	if (url.includes('/characters') || url.includes('/recommendations')) {
		return 24 * 60 * 60 * 1000; // 24 hours
	}
	if (url.includes('/anime?')) {
		try {
			const parsedUrl = new URL(url);
			const q = parsedUrl.searchParams.get('q');
			if (q && q.trim().length > 0) {
				return 1 * 60 * 60 * 1000; // 1 hour for active search queries
			}
		} catch {
			// fallback if URL parsing fails
		}
		return 4 * 60 * 60 * 1000; // 4 hours for popular / empty search
	}
	return 1 * 60 * 60 * 1000; // 1 hour default
}

async function jikanFetch<T>(url: string, schema: ZodType<T>): Promise<Result<T>> {
	const cacheKey = `jikan:fetch:${url}`;
	const ttl = getTTLForUrl(url);

	try {
		const db = await getDB();
		const cached = await db.get('meta', cacheKey);
		const now = Date.now();

		if (cached && now - cached.updatedAt < ttl) {
			const parsed = schema.safeParse(cached.value);
			if (parsed.success) {
				return ok(parsed.data);
			}
		}
	} catch (e) {
		logger.warn('Failed to read Jikan cache:', e);
	}

	try {
		let response = await jikanLimiter.enqueue(() => fetch(url));

		if (response.status === 429 || response.status === 504 || response.status >= 500) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			response = await jikanLimiter.enqueue(() => fetch(url));
		}

		if (response.status === 429) {
			const retryAfter = Number(response.headers.get('Retry-After') ?? 2) * 1000;
			return err({
				type: 'rate_limit',
				retryAfter,
				message: 'Jikan rate limit exceeded'
			});
		}

		if (!response.ok) {
			return err({
				type: 'network',
				message: `Jikan HTTP ${response.status}`
			});
		}

		const data = await response.json();

		const parsed = schema.safeParse(data);
		if (!parsed.success) {
			return err({
				type: 'validation',
				message: 'Invalid response from Jikan API',
				issues: zodIssuesToSummaries(parsed.error.issues)
			});
		}

		try {
			const db = await getDB();
			await db.put('meta', {
				key: cacheKey,
				value: parsed.data,
				updatedAt: Date.now()
			});
		} catch (cacheError) {
			logger.warn('Failed to write Jikan cache:', cacheError);
		}

		return ok(parsed.data);
	} catch (e: unknown) {
		const error = e as { message?: string };
		return err({
			type: 'network',
			message: error.message || 'Jikan request failed'
		});
	}
}

// ─── Characters ───

export async function getCharacters(
	malId: number,
	page: number = 1
): Promise<Result<{ characters: JikanCharacterEntry[]; hasNextPage: boolean }>> {
	const url = `${JIKAN_BASE}/anime/${malId}/characters?page=${page}`;
	const result = await jikanFetch(url, JikanCharactersResponseSchema);

	if (!result.ok) return result;

	return ok({
		characters: result.value.data,
		hasNextPage: result.value.pagination?.has_next_page ?? false
	});
}

// ─── Recommendations ───

export async function getRecommendations(
	malId: number
): Promise<Result<JikanRecommendationEntry[]>> {
	const url = `${JIKAN_BASE}/anime/${malId}/recommendations`;
	const result = await jikanFetch(url, JikanRecommendationsResponseSchema);

	if (!result.ok) return result;

	return ok(result.value.data);
}
// ─── Search Anime (Jikan — richer filtering than MAL) ───

export interface JikanSearchParams {
	q?: string;
	type?: string;
	status?: string;
	rating?: string;
	genres?: string; // comma-separated genre IDs
	min_score?: number;
	max_score?: number;
	start_date?: string; // yyyy-mm-dd
	end_date?: string;
	sort?: string; // asc, desc
	order_by?: string; // score, popularity, title, start_date
	page?: number;
	limit?: number;
	sfw?: boolean;
}

export async function searchAnime(params: JikanSearchParams = {}): Promise<
	Result<{
		anime: JikanAnime[];
		hasNextPage: boolean;
		currentPage: number;
	}>
> {
	const page = params.page ?? 1;
	const limit = params.limit ?? 25;
	const offset = (page - 1) * limit;

	// For short queries (1-2 chars), Jikan API returns 400. Direct to MAL search.
	if (params.q && params.q.trim().length > 0 && params.q.trim().length < 3) {
		const malResult = await malSearchAnime(params.q.trim(), {
			limit,
			offset,
			type: params.type
		});
		if (malResult.ok) {
			const anime = malResult.value.data.map((item) => mapMalLeanToJikanAnime(item.node));
			return ok({
				anime,
				hasNextPage: malResult.value.paging?.next ? true : false,
				currentPage: page
			});
		}
		return err(malResult.error);
	}

	const searchParams = buildSearchParams({
		q: params.q,
		type: params.type,
		status: params.status,
		rating: params.rating,
		genres: params.genres,
		min_score: params.min_score,
		max_score: params.max_score,
		start_date: params.start_date,
		end_date: params.end_date,
		sort: params.sort,
		order_by: params.order_by,
		page: params.page,
		limit,
		sfw: params.sfw ? 'true' : undefined
	});

	const url = `${JIKAN_BASE}/anime?${searchParams}`;
	const result = await jikanFetch(url, JikanSearchResponseSchema);

	if (result.ok) {
		return ok({
			anime: result.value.data,
			hasNextPage: result.value.pagination?.has_next_page ?? false,
			currentPage: page
		});
	}

	// ─── Fallback to MAL API if Jikan fails (e.g. 504, 429, network error) ───
	logger.warn('Jikan search failed, falling back to MAL API:', result.error);

	if (params.q && params.q.trim().length > 0) {
		const malResult = await malSearchAnime(params.q.trim(), {
			limit,
			offset,
			type: params.type
		});

		if (malResult.ok) {
			const anime = malResult.value.data.map((item) => mapMalLeanToJikanAnime(item.node));
			return ok({
				anime,
				hasNextPage: malResult.value.paging?.next ? true : false,
				currentPage: page
			});
		}
	} else {
		// Blank query fallback -> fetch popular anime from MAL ranking
		const malResult = await malGetRanking('bypopularity', {
			limit,
			offset
		});

		if (malResult.ok) {
			const anime = malResult.value.data.map((item) => mapMalLeanToJikanAnime(item.node));
			return ok({
				anime,
				hasNextPage: malResult.value.paging?.next ? true : false,
				currentPage: page
			});
		}
	}

	return result;
}

// ─── Genres ───

export async function getAnimeGenres(): Promise<
	Result<Array<{ id: number; name: string; count: number }>>
> {
	const url = `${JIKAN_BASE}/genres/anime`;
	const result = await jikanFetch(url, JikanGenresResponseSchema);

	if (result.ok) {
		return ok(
			result.value.data.map((g) => ({
				id: g.mal_id,
				name: g.name,
				count: g.count ?? 0
			}))
		);
	}

	// Fallback to default MAL anime genres if Jikan fails
	return ok(DEFAULT_ANIME_GENRES);
}

