// ─── AniList GraphQL API (no-auth) ───
// Public queries only. Single endpoint, Zod-validated.

import { anilistLimiter } from './rate-limit';
import { AnilistMediaSchema, AnilistPageMediaSchema, type AnilistMedia } from './schemas/anilist.schema';
import { ok, err, type Result, zodIssuesToSummaries } from './result';
import type { AppError } from './result';

const ANILIST_GQL = 'https://graphql.anilist.co';

async function gqlFetch<T>(query: string, variables: Record<string, unknown>, schema: import('zod').ZodType<T>): Promise<Result<T>> {
	const fetchResult = await anilistLimiter.enqueue(async () => {
		try {
			const res = await fetch(ANILIST_GQL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({ query, variables })
			});
			if (!res.ok) {
				// Map HTTP errors to AppError
				if (res.status === 429) {
					const retryAfter = res.headers.get('Retry-After');
					const reset = res.headers.get('X-RateLimit-Reset');
					return { ok: false as const, status: 429, retryAfter, reset } as const;
				}
				const text = await res.text().catch(() => '');
				return { ok: false as const, status: res.status, text } as const;
			}
			return { ok: true as const, res } as const;
		} catch (e) {
			return { ok: false as const, error: e } as const;
		}
	});

	// Handle limiter-wrapped result cases
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const r: any = fetchResult;
	if (r && r.ok === false && typeof r.status === 'number') {
		if (r.status === 429) {
			return err({ type: 'api', message: 'AniList rate limited', status: 429 } as AppError);
		}
		return err({ type: 'api', message: `AniList HTTP ${r.status}`, status: r.status } as AppError);
	}
	if (r && r.ok === false && r.error) {
		return err({ type: 'network', message: r.error instanceof Error ? r.error.message : 'Network error' } as AppError);
	}
	const response: Response = r.res;

	let json: unknown;
	try {
		json = await response.json();
	} catch (e) {
		return err({ type: 'network', message: 'Failed to parse AniList response', cause: e instanceof Error ? e : undefined } as AppError);
	}

	// AniList returns {data, errors}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data = (json as any)?.data as unknown;
	// If top-level has no data but has errors, surface
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (!(json as any)?.data && (json as any)?.errors) {
		return err({ type: 'api', message: (json as any).errors[0]?.message ?? 'AniList GraphQL error', status: 400 } as AppError);
	}

	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		return err({
			type: 'validation',
			message: 'Invalid response from AniList API',
			issues: zodIssuesToSummaries(parsed.error.issues)
		} as AppError);
	}
	return ok(parsed.data);
}

// ─── Detail by MAL ID (primary, no fallback) ───
const MEDIA_DETAIL_QUERY = `
query($malId:Int){
  Media(idMal:$malId type:ANIME){
    id idMal title{romaji english native} description
    coverImage{extraLarge large medium color} bannerImage
    format status episodes duration season seasonYear isAdult
    genres synonyms tags{name rank isAdult}
    averageScore meanScore popularity favourites trending
    nextAiringEpisode{episode airingAt timeUntilAiring}
    trailer{id site} externalLinks{site url} streamingEpisodes{title thumbnail url}
    studios{edges{isMain node{name}}}
    relations{edges{relationType node{id type format title{romaji english} coverImage{large medium}}}}
    characters(perPage:25 sort:FAVOURITES_DESC){edges{role node{id name{full} image{large} favourites} voiceActors(language:JAPANESE){id name{full} languageV2}}}
    recommendations(perPage:6 sort:RATING_DESC){nodes{rating mediaRecommendation{id idMal title{romaji english} coverImage{large medium} format averageScore}}}
    reviews(perPage:6 sort:RATING_DESC){nodes{summary rating ratingAmount body user{name avatar{large}}}}
    airingSchedule(perPage:8){nodes{episode airingAt}}
  }
}
`;

export async function fetchAnilistMediaByMalId(malId: number): Promise<Result<AnilistMedia | null>> {
	const result = await gqlFetch<{ Media: AnilistMedia | null }>(
		MEDIA_DETAIL_QUERY,
		{ malId },
		// Inline schema for {Media}
		(await import('zod')).z.object({ Media: AnilistMediaSchema.nullable() })
	);
	if (!result.ok) return result as unknown as Result<AnilistMedia | null>;
	// unwrap
	return ok(result.value.Media);
}

// ─── Page (trending / search) ───
const PAGE_QUERY = `
query($page:Int $perPage:Int $search:String $sort:MediaSort){
  Page(page:$page perPage:$perPage){
    pageInfo{total currentPage lastPage hasNextPage perPage}
    media(search:$search type:ANIME sort:$sort isAdult:false){
      id idMal title{romaji english native} coverImage{extraLarge large medium} bannerImage
      format status episodes duration season seasonYear
      genres averageScore meanScore popularity favourites trending
      nextAiringEpisode{episode airingAt}
      studios{edges{isMain node{name}}}
    }
  }
}
`;

export async function fetchAnilistTrending(page = 1, perPage = 25): Promise<Result<{ media: AnilistMedia[]; hasNextPage: boolean }>> {
	const res = await gqlFetch(PAGE_QUERY, { page, perPage, sort: 'POPULARITY_DESC' }, AnilistPageMediaSchema);
	if (!res.ok) return res as unknown as Result<{ media: AnilistMedia[]; hasNextPage: boolean }>;
	return ok({ media: res.value.Page.media, hasNextPage: !!res.value.Page.pageInfo?.hasNextPage });
}

export async function searchAnilist(search: string, page = 1, perPage = 25): Promise<Result<{ media: AnilistMedia[]; hasNextPage: boolean }>> {
	const res = await gqlFetch(PAGE_QUERY, { page, perPage, search, sort: 'POPULARITY_DESC' }, AnilistPageMediaSchema);
	if (!res.ok) return res as unknown as Result<{ media: AnilistMedia[]; hasNextPage: boolean }>;
	return ok({ media: res.value.Page.media, hasNextPage: !!res.value.Page.pageInfo?.hasNextPage });
}

// re-export for tests
export const _pageQuery = PAGE_QUERY;
export const _detailQuery = MEDIA_DETAIL_QUERY;
