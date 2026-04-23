// ─── Jikan v4 API Client ───
// Fallback/enrichment only — episode lists, characters, recommendations.
// All requests rate-limited to ~3 req/s.

import { jikanLimiter } from './rate-limit';
import { ok, err, type Result, zodIssuesToSummaries } from './result';
import type { AppError } from './result';
import {
	JikanCharactersResponseSchema,
	JikanRecommendationsResponseSchema,
	JikanSearchResponseSchema,
	JikanGenresResponseSchema,
	type JikanCharacterEntry,
	type JikanRecommendationEntry,
	type JikanAnime
} from './schemas/jikan.schema';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// ─── Helpers ───

import type { ZodSchema } from 'zod';

async function jikanFetch<T>(url: string, schema: ZodSchema<T>): Promise<Result<T>> {
	try {
		const data = await jikanLimiter.enqueue(async () => {
			const response = await fetch(url);

			if (response.status === 429) {
				const retryAfter = Number(response.headers.get('Retry-After') ?? 2) * 1000;
				throw Object.assign(new Error('Rate limited'), { retryAfter, status: 429 });
			}

			if (!response.ok) {
				throw Object.assign(new Error(`Jikan HTTP ${response.status}`), {
					status: response.status
				});
			}

			return response.json();
		});

		const parsed = schema.safeParse(data);
		if (!parsed.success) {
			return err({
				type: 'validation',
				message: 'Invalid response from Jikan API',
				issues: zodIssuesToSummaries(parsed.error!.issues)
			});
		}

		return ok(parsed.data!);
	} catch (e: unknown) {
		const error = e as { retryAfter?: number; status?: number; message?: string };

		if (error.status === 429 && error.retryAfter) {
			return err({
				type: 'rate_limit',
				retryAfter: error.retryAfter,
				message: 'Jikan rate limit exceeded'
			});
		}

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

	if (!result.ok) return result as Result<never>;

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

	if (!result.ok) return result as Result<never>;

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
	const searchParams = new URLSearchParams();

	if (params.q) searchParams.set('q', params.q);
	if (params.type) searchParams.set('type', params.type);
	if (params.status) searchParams.set('status', params.status);
	if (params.rating) searchParams.set('rating', params.rating);
	if (params.genres) searchParams.set('genres', params.genres);
	if (params.min_score) searchParams.set('min_score', String(params.min_score));
	if (params.max_score) searchParams.set('max_score', String(params.max_score));
	if (params.start_date) searchParams.set('start_date', params.start_date);
	if (params.end_date) searchParams.set('end_date', params.end_date);
	if (params.sort) searchParams.set('sort', params.sort);
	if (params.order_by) searchParams.set('order_by', params.order_by);
	if (params.page) searchParams.set('page', String(params.page));
	searchParams.set('limit', String(params.limit ?? 25));
	if (params.sfw) searchParams.set('sfw', 'true');

	const url = `${JIKAN_BASE}/anime?${searchParams}`;
	const result = await jikanFetch(url, JikanSearchResponseSchema);

	if (!result.ok) return result as Result<never>;

	return ok({
		anime: result.value.data,
		hasNextPage: result.value.pagination?.has_next_page ?? false,
		currentPage: params.page ?? 1
	});
}

// ─── Genres ───

export async function getAnimeGenres(): Promise<
	Result<Array<{ id: number; name: string; count: number }>>
> {
	const url = `${JIKAN_BASE}/genres/anime`;
	const result = await jikanFetch(url, JikanGenresResponseSchema);

	if (!result.ok) return result as Result<never>;

	return ok(
		result.value.data.map((g) => ({
			id: g.mal_id,
			name: g.name,
			count: g.count ?? 0
		}))
	);
}
