// ─── MAL API Client ───
// All MAL API interactions. Every call returns Result<T>.
// Responses validated through zod schemas.

import { authFetch } from './fetch';
import { createRateLimiter } from './rate-limit';
import { MAL_API_BASE, MAL_MIN_INTERVAL_MS } from './config';
import { ok, err, type Result, zodIssuesToSummaries, type Err } from './result';
import type { AppError } from './result';
import {
	MalUserSchema,
	MalUserListResponseSchema,
	MalAnimeDetailSchema,
	MalAnimeSearchResponseSchema,
	type MalUser,
	type MalUserListEntry,
	type MalAnimeDetail,
	type MalAnimeSearchResponse,
	type MalStatusUpdate,
	type MalAnimeLean
} from './schemas/mal.schema';
import type { UserListRecord, AnimeRecord } from '$lib/cache/db';

// ─── Rate Limiter ───

const malLimiter = createRateLimiter(MAL_MIN_INTERVAL_MS);

// ─── Helpers ───

import type { ZodSchema } from 'zod';

async function malGet<T>(url: string, schema: ZodSchema<T>): Promise<Result<T>> {
	const fetchResult = await malLimiter.enqueue(() => authFetch(url));

	if (!fetchResult.ok) return fetchResult as Err<AppError>;

	try {
		const data = await fetchResult.value.json();
		const parsed = schema.safeParse(data);

		if (!parsed.success) {
			return err({
				type: 'validation',
				message: 'Invalid response from MAL API',
				issues: zodIssuesToSummaries(parsed.error!.issues)
			});
		}

		return ok(parsed.data!);
	} catch (e) {
		return err({
			type: 'network',
			message: 'Failed to parse MAL API response',
			cause: e instanceof Error ? e : undefined
		});
	}
}

// ─── User Profile ───

export async function getUserProfile(): Promise<Result<MalUser>> {
	return malGet(`${MAL_API_BASE}/users/@me`, MalUserSchema);
}

// ─── User Anime List ───

const LIST_FIELDS = [
	'list_status{status,score,num_episodes_watched,updated_at}',
	'num_episodes',
	'mean',
	'main_picture',
	'genres',
	'start_season',
	'media_type',
	'status',
	'studios',
	'num_list_users',
	'num_scoring_users',
	'alternative_titles'
].join(',');

export async function getUserAnimeList(): Promise<Result<UserListRecord[]>> {
	const allEntries: UserListRecord[] = [];
	let url: string | null = `${MAL_API_BASE}/users/@me/animelist?fields=${LIST_FIELDS}&limit=1000`;

	while (url) {
		const currentUrl = url;
		const fetchResult = await malLimiter.enqueue(() => authFetch(currentUrl));
		if (!fetchResult.ok) return fetchResult as Err<AppError>;

		let data: unknown;
		try {
			data = await fetchResult.value.json();
		} catch (e) {
			return err({
				type: 'network',
				message: 'Failed to parse user list response',
				cause: e instanceof Error ? e : undefined
			});
		}

		const parsed = MalUserListResponseSchema.safeParse(data);
		if (!parsed.success) {
			return err({
				type: 'validation',
				message: 'Invalid user list response from MAL',
				issues: zodIssuesToSummaries(parsed.error.issues)
			});
		}

		const page = parsed.data;
		for (const entry of page.data) {
			allEntries.push(mapListEntryToRecord(entry));
		}

		// Next page - Rewrite MAL url to use our worker proxy
		const nextUrl = page.paging?.next;
		url = nextUrl ? nextUrl.replace('https://api.myanimelist.net/v2', MAL_API_BASE) : null;
	}

	return ok(allEntries);
}

export function mapBaseAnimeNode(node: MalAnimeLean) {
	return {
		malId: node.id,
		title: node.title,
		titleEnglish: node.alternative_titles?.en || null,
		mainPicture: node.main_picture ?? null,
		mean: node.mean ?? null,
		numEpisodes: node.num_episodes ?? 0,
		genres: node.genres ?? [],
		studios: node.studios ?? [],
		startSeason: node.start_season ?? { year: null, season: null },
		mediaType: node.media_type ?? 'unknown',
		animeStatus: node.status ?? 'unknown',
		numListUsers: node.num_list_users ?? 0,
		numScoringUsers: node.num_scoring_users ?? 0
	};
}

export function mapListEntryToRecord(entry: MalUserListEntry): UserListRecord {
	const node = entry.node;
	const ls = entry.list_status;

	return {
		...mapBaseAnimeNode(node),
		status: ls.status,
		score: ls.score,
		numWatchedEpisodes: ls.num_episodes_watched,
		isRewatching: ls.is_rewatching ?? false,
		updatedAt: ls.updated_at ?? null,
		startDate: ls.start_date ?? null,
		finishDate: ls.finish_date ?? null
	};
}

// ─── Anime Detail ───

const DETAIL_FIELDS = [
	'id',
	'title',
	'main_picture',
	'synopsis',
	'mean',
	'num_episodes',
	'genres',
	'studios',
	'related_anime',
	'recommendations',
	'start_season',
	'status',
	'media_type',
	'num_list_users',
	'num_scoring_users',
	'alternative_titles',
	'broadcast'
].join(',');

export async function getAnimeDetail(id: number): Promise<Result<AnimeRecord>> {
	const url = `${MAL_API_BASE}/anime/${id}?fields=${DETAIL_FIELDS}`;
	const result = await malGet(url, MalAnimeDetailSchema);

	if (!result.ok) return result as Err<AppError>;

	return ok(mapDetailToRecord(result.value));
}

export function mapDetailToRecord(detail: MalAnimeDetail): AnimeRecord {
	return {
		...mapBaseAnimeNode(detail),
		synopsis: detail.synopsis ?? null,
		broadcast: detail.broadcast ?? null,
		relatedAnime:
			detail.related_anime?.map((r) => ({
				id: r.node.id,
				title: r.node.title,
				mainPicture: r.node.main_picture ?? null,
				mediaType: r.node.media_type ?? null,
				relationType: r.relation_type
			})) ?? null,
		recommendations:
			detail.recommendations?.map((r) => ({
				id: r.node.id,
				title: r.node.title,
				mainPicture: r.node.main_picture ?? null,
				mean: r.node.mean ?? null,
				numRecommendations: r.num_recommendations ?? 0
			})) ?? null,
		isDetail: true,
		cachedAt: Date.now()
	};
}

// ─── Update Anime Status ───

export async function updateAnimeStatus(
	id: number,
	update: MalStatusUpdate
): Promise<Result<void>> {
	// MAL PATCH expects form-encoded body
	const params = new URLSearchParams();
	if (update.status !== undefined) params.set('status', update.status);
	if (update.score !== undefined) params.set('score', String(update.score));
	if (update.num_watched_episodes !== undefined)
		params.set('num_watched_episodes', String(update.num_watched_episodes));
	if (update.is_rewatching !== undefined) params.set('is_rewatching', String(update.is_rewatching));

	const url = `${MAL_API_BASE}/anime/${id}/my_list_status`;
	const fetchResult = await malLimiter.enqueue(() =>
		authFetch(url, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString()
		})
	);

	if (!fetchResult.ok) return fetchResult as Err<AppError>;

	if (!fetchResult.value.ok) {
		const body = await fetchResult.value.text().catch(() => '');
		return err({
			type: 'api',
			status: fetchResult.value.status,
			message: `Failed to update anime ${id}`,
			body: body || undefined
		});
	}

	return ok(undefined);
}

// ─── Delete Anime from List ───

export async function deleteAnimeStatus(id: number): Promise<Result<void>> {
	const url = `${MAL_API_BASE}/anime/${id}/my_list_status`;
	const fetchResult = await malLimiter.enqueue(() =>
		authFetch(url, {
			method: 'DELETE'
		})
	);

	if (!fetchResult.ok) return fetchResult as Err<AppError>;

	if (!fetchResult.value.ok && fetchResult.value.status !== 404) {
		const body = await fetchResult.value.text().catch(() => '');
		return err({
			type: 'api',
			status: fetchResult.value.status,
			message: `Failed to delete anime ${id} from list`,
			body: body || undefined
		});
	}

	return ok(undefined);
}

// ─── Search ───

const SEARCH_FIELDS = [
	'id',
	'title',
	'alternative_titles',
	'main_picture',
	'mean',
	'num_episodes',
	'genres',
	'start_season',
	'media_type',
	'status',
	'studios',
	'num_list_users',
	'num_scoring_users'
].join(',');

export async function searchAnime(
	query: string,
	options?: {
		genre?: number;
		type?: string;
		status?: string;
		minScore?: number;
		sort?: string;
		offset?: number;
		limit?: number;
	}
): Promise<Result<MalAnimeSearchResponse>> {
	const params = new URLSearchParams({
		q: query,
		fields: SEARCH_FIELDS,
		limit: String(options?.limit ?? 25)
	});

	if (options?.offset) params.set('offset', String(options.offset));
	if (options?.genre) params.set('genres', String(options.genre));
	if (options?.type) params.set('type', options.type);
	if (options?.status) params.set('status', options.status);
	if (options?.minScore) params.set('min_score', String(options.minScore));
	if (options?.sort) params.set('sort', options.sort);

	const url = `${MAL_API_BASE}/anime?${params}`;
	return malGet(url, MalAnimeSearchResponseSchema);
}

// ─── Seasonal ───

export async function getSeasonal(
	year: number,
	season: string,
	options?: {
		sort?: string;
		filter?: string;
		offset?: number;
		limit?: number;
	}
): Promise<Result<MalAnimeSearchResponse>> {
	const params = new URLSearchParams({
		fields: SEARCH_FIELDS,
		limit: String(options?.limit ?? 100)
	});

	if (options?.sort) params.set('sort', options.sort);
	if (options?.filter) params.set('filter', options.filter);
	if (options?.offset) params.set('offset', String(options.offset));

	const url = `${MAL_API_BASE}/anime/season/${year}/${season}?${params}`;
	return malGet(url, MalAnimeSearchResponseSchema);
}

// ─── Ranking ───

export async function getRanking(
	rankingType: string = 'all',
	options?: {
		offset?: number;
		limit?: number;
	}
): Promise<Result<MalAnimeSearchResponse>> {
	const params = new URLSearchParams({
		ranking_type: rankingType,
		fields: SEARCH_FIELDS,
		limit: String(options?.limit ?? 100)
	});

	if (options?.offset) params.set('offset', String(options.offset));

	const url = `${MAL_API_BASE}/anime/ranking?${params}`;
	return malGet(url, MalAnimeSearchResponseSchema);
}
