// ─── AniList GraphQL API (no-auth) ───
// Sole enrichment source for the detail page. Single endpoint, Zod-validated.

import { z, type ZodType } from 'zod';

import { anilistLimiter } from './rate-limit';
import { AnilistMediaSchema, type AnilistMedia } from './schemas/anilist.schema';
import { ok, err, type Result, zodIssuesToSummaries } from './result';
import { getAnilistCache, setAnilistCache } from '$lib/cache/meta.cache';
import { logger } from '$lib/utils/logger';

const ANILIST_GQL = 'https://graphql.anilist.co';
const DEFAULT_RETRY_AFTER_MS = 60_000;

/** Retry delay from Retry-After (seconds) or X-RateLimit-Reset (epoch seconds). */
function retryAfterMs(headers: Headers): number {
	const retry = parseInt(headers.get('Retry-After') ?? '', 10);
	if (!Number.isNaN(retry)) return retry * 1000;

	const reset = parseInt(headers.get('X-RateLimit-Reset') ?? '', 10);
	if (!Number.isNaN(reset)) {
		const wait = reset * 1000 - Date.now();
		if (wait > 0) return wait;
	}
	return DEFAULT_RETRY_AFTER_MS;
}

interface GqlEnvelope {
	data?: unknown;
	errors?: { message?: string }[];
}

async function gqlFetch<T>(
	query: string,
	variables: Record<string, unknown>,
	schema: ZodType<T>
): Promise<Result<T>> {
	const fetched = await anilistLimiter.enqueue(
		async (): Promise<Result<{ status: number; ok: boolean; body: GqlEnvelope | null }>> => {
			try {
				// Browser fetch: only Content-Type + Accept (User-Agent is forbidden).
				const res = await fetch(ANILIST_GQL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
					body: JSON.stringify({ query, variables })
				});
				if (res.status === 429) {
					return err({
						type: 'rate_limit',
						retryAfter: retryAfterMs(res.headers),
						message: 'AniList rate limited'
					});
				}
				const body = (await res.json().catch(() => null)) as GqlEnvelope | null;
				return ok({ status: res.status, ok: res.ok, body });
			} catch (e) {
				return err({
					type: 'network',
					message: e instanceof Error ? e.message : 'Network error',
					cause: e instanceof Error ? e : undefined
				});
			}
		}
	);
	if (!fetched.ok) return fetched;

	const { status, ok: httpOk, body } = fetched.value;

	// AniList answers an unknown Media with HTTP 404 *and* `data:{Media:null}`; that is a
	// valid "no result", not a failure. Any other non-2xx is an error.
	const hasData = body?.data != null;
	if (!httpOk && !(status === 404 && hasData)) {
		return err({
			type: 'api',
			status,
			message: body?.errors?.[0]?.message ?? `AniList HTTP ${status}`
		});
	}
	if (!hasData) {
		return err({
			type: 'api',
			status,
			message: body?.errors?.[0]?.message ?? 'AniList GraphQL error'
		});
	}

	const parsed = schema.safeParse(body?.data);
	if (!parsed.success) {
		return err({
			type: 'validation',
			message: 'Invalid response from AniList API',
			issues: zodIssuesToSummaries(parsed.error.issues)
		});
	}
	return ok(parsed.data);
}

// ─── Detail by MAL ID (direct lookup, no title-search fallback) ───
// Requests exactly the fields the detail page renders — one call per anime.
const MEDIA_DETAIL_QUERY = `
query($malId:Int){
  Media(idMal:$malId type:ANIME){
    id idMal
    tags{name rank isAdult}
    nextAiringEpisode{episode airingAt}
    trailer{id site}
    characters(perPage:25 sort:FAVOURITES_DESC){edges{role node{id name{full} image{large} favourites} voiceActors(language:JAPANESE){id name{full} languageV2}}}
    recommendations(perPage:6 sort:RATING_DESC){nodes{rating mediaRecommendation{id idMal title{romaji english} coverImage{large medium}}}}
    reviews(perPage:6 sort:RATING_DESC){nodes{summary rating body user{name}}}
  }
}
`;

const MediaResponseSchema = z.object({ Media: AnilistMediaSchema.nullable() });

/** Network fetch. `null` value = AniList has no entry for this MAL id. */
export async function fetchAnilistMediaByMalId(
	malId: number
): Promise<Result<AnilistMedia | null>> {
	const result = await gqlFetch(MEDIA_DETAIL_QUERY, { malId }, MediaResponseSchema);
	if (!result.ok) return result;
	return ok(result.value.Media);
}

// ─── Cached + de-duplicated access (what the UI should call) ───

const inflight = new Map<number, Promise<Result<AnilistMedia | null>>>();

/**
 * Detail enrichment with a 7-day IndexedDB cache (`anilist:fetch:{malId}`) and a
 * single in-flight request per MAL id, so revisits and rapid navigation never
 * spend extra AniList budget.
 */
export function loadAnilistMedia(malId: number): Promise<Result<AnilistMedia | null>> {
	const pending = inflight.get(malId);
	if (pending) return pending;

	const request = (async (): Promise<Result<AnilistMedia | null>> => {
		const cached = await getAnilistCache(malId).catch(() => null);
		if (cached) return ok(cached.media);

		const result = await fetchAnilistMediaByMalId(malId);
		if (result.ok) {
			await setAnilistCache(malId, result.value).catch((e) =>
				logger.warn('Failed to cache AniList media:', e)
			);
		}
		return result;
	})().finally(() => inflight.delete(malId));

	inflight.set(malId, request);
	return request;
}

// re-export for tests
export const _detailQuery = MEDIA_DETAIL_QUERY;
