// ─── MAL API Client ───
// All MAL API interactions. Every call returns Result<T>.
// Responses validated through zod schemas.

import type { ZodType } from 'zod';

import { authFetch } from './fetch';
import { createRateLimiter } from './rate-limit';
import { buildSearchParams } from './params';
import { MAL_API_BASE, MAL_MIN_INTERVAL_MS } from './config';
import { ok, err, type Result, zodIssuesToSummaries, type Err } from './result';
import type { AppError } from './result';
import {
	MalUserListResponseSchema,
	MalAnimeDetailSchema,
	MalAnimeSearchResponseSchema,
	type MalUserListEntry,
	type MalAnimeDetail,
	type MalAnimeSearchResponse,
	type MalStatusUpdate,
	type MalAnimeLean
} from './schemas/mal.schema';
import type { UserListRecord, DetailedAnimeRecord } from '$lib/cache/db';

// ─── Rate Limiter ───

const malLimiter = createRateLimiter(MAL_MIN_INTERVAL_MS);

// ─── Helpers ───

async function malGet<T>(url: string, schema: ZodType<T>): Promise<Result<T>> {
	const fetchResult = await malLimiter.enqueue(() => authFetch(url));

	if (!fetchResult.ok) return fetchResult as Err<AppError>;

	try {
		const data = await fetchResult.value.json();
		const parsed = schema.safeParse(data);

		if (!parsed.success) {
			return err({
				type: 'validation',
				message: 'Invalid response from MAL API',
				issues: zodIssuesToSummaries(parsed.error.issues)
			});
		}

		return ok(parsed.data);
	} catch (e) {
		return err({
			type: 'network',
			message: 'Failed to parse MAL API response',
			cause: e instanceof Error ? e : undefined
		});
	}
}

// ─── User Anime List ───

const BASE_FIELDS = [
	'main_picture',
	'mean',
	'num_episodes',
	'genres',
	'start_season',
	'media_type',
	'status',
	'studios',
	'num_list_users',
	'num_scoring_users',
	'alternative_titles'
];

const LIST_FIELDS = [
	'list_status{status,score,num_episodes_watched,updated_at}',
	...BASE_FIELDS
].join(',');

export async function getUserAnimeList(): Promise<Result<UserListRecord[]>> {
	const allEntries: UserListRecord[] = [];
	let url: string | null = `${MAL_API_BASE}/users/@me/animelist?fields=${LIST_FIELDS}&limit=1000`;

	while (url) {
		const currentUrl = url;
		let fetchResult = await malLimiter.enqueue(() => authFetch(currentUrl));
		if (!fetchResult.ok) {
			const isTransient =
				fetchResult.error.type === 'network' ||
				(fetchResult.error.type === 'api' &&
					(fetchResult.error.status === 429 || fetchResult.error.status >= 500));
			if (isTransient) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				fetchResult = await malLimiter.enqueue(() => authFetch(currentUrl));
			}
			if (!fetchResult.ok) return fetchResult as Err<AppError>;
		}

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
		mainPicture: node.main_picture
			? {
					medium: node.main_picture.medium ?? null,
					large: node.main_picture.large ?? null
				}
			: null,
		mean: node.mean ?? null,
		numEpisodes: node.num_episodes ?? 0,
		genres: node.genres ?? [],
		studios: node.studios ?? [],
		startSeason: {
			year: node.start_season?.year ?? null,
			season: node.start_season?.season ?? null
		},
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
		score: ls.score ?? 0,
		numWatchedEpisodes: ls.num_episodes_watched ?? 0,
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

export async function getAnimeDetail(id: number): Promise<Result<DetailedAnimeRecord>> {
	const url = `${MAL_API_BASE}/anime/${id}?fields=${DETAIL_FIELDS}`;
	const result = await malGet(url, MalAnimeDetailSchema);

	if (!result.ok) return result as Err<AppError>;

	return ok(mapDetailToRecord(result.value));
}

export function mapDetailToRecord(detail: MalAnimeDetail): DetailedAnimeRecord {
	return {
		...mapBaseAnimeNode(detail),
		synopsis: detail.synopsis ?? null,
		broadcast: detail.broadcast?.day_of_the_week
			? {
					day_of_the_week: detail.broadcast.day_of_the_week,
					start_time: detail.broadcast.start_time ?? undefined
				}
			: null,
		relatedAnime:
			detail.related_anime?.map((r) => ({
				id: r.node.id,
				title: r.node.title,
				mainPicture: r.node.main_picture
					? {
							medium: r.node.main_picture.medium ?? null,
							large: r.node.main_picture.large ?? null
						}
					: null,
				mediaType: r.node.media_type ?? null,
				relationType: r.relation_type ?? 'unknown'
			})) ?? null,
		recommendations:
			detail.recommendations?.map((r) => ({
				id: r.node.id,
				title: r.node.title,
				mainPicture: r.node.main_picture
					? {
							medium: r.node.main_picture.medium ?? null,
							large: r.node.main_picture.large ?? null
						}
					: null,
				mean: r.node.mean ?? null,
				numRecommendations: r.num_recommendations ?? 0
			})) ?? null,
		type: 'detail',
		cachedAt: Date.now()
	};
}

// ─── Update Anime Status ───

export async function updateAnimeStatus(
	id: number,
	update: MalStatusUpdate
): Promise<Result<void>> {
	const params = buildSearchParams({
		status: update.status,
		score: update.score,
		num_watched_episodes: update.num_watched_episodes,
		is_rewatching: update.is_rewatching
	});

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

const SEARCH_FIELDS = ['id', 'title', ...BASE_FIELDS].join(',');

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
	const params = buildSearchParams({
		q: query,
		fields: SEARCH_FIELDS,
		limit: options?.limit ?? 25,
		offset: options?.offset,
		genres: options?.genre,
		type: options?.type,
		status: options?.status,
		min_score: options?.minScore,
		sort: options?.sort
	});

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
	const params = buildSearchParams({
		fields: SEARCH_FIELDS,
		limit: options?.limit ?? 100,
		sort: options?.sort,
		filter: options?.filter,
		offset: options?.offset
	});

	const url = `${MAL_API_BASE}/anime/season/${year}/${season}?${params}`;
	return malGet(url, MalAnimeSearchResponseSchema);
}

// ─── Ranking / Popular ───

export async function getRanking(
	rankingType: string = 'bypopularity',
	options?: {
		offset?: number;
		limit?: number;
	}
): Promise<Result<MalAnimeSearchResponse>> {
	const params = buildSearchParams({
		ranking_type: rankingType,
		fields: SEARCH_FIELDS,
		limit: options?.limit ?? 25,
		offset: options?.offset
	});

	const url = `${MAL_API_BASE}/anime/ranking?${params}`;
	return malGet(url, MalAnimeSearchResponseSchema);
}
