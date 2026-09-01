// ─── Shared display types for browse/seasonal/search results ───
// Normalized from MAL or Jikan responses for UI consumption.

import { formatSeason } from './format';
import type { UserListRecord } from '$lib/cache/db';
import type { AnilistMedia } from '$lib/api/schemas/anilist.schema';

export interface DisplayAnime {
	malId: number;
	title: string;
	titleEnglish: string | null;
	mainPicture: string | null;
	mean: number | null;
	numEpisodes: number;
	genres: string[];
	studios: string[];
	startSeason: string | null; // "Spring 2024"
	mediaType: string;
	animeStatus: string;
	numListUsers: number;
	synopsis: string | null;
}

/** Map a user's list entry to DisplayAnime (for merging local matches into search) */
export function mapUserListRecordToDisplay(e: UserListRecord): DisplayAnime {
	return {
		malId: e.malId,
		title: e.title,
		titleEnglish: e.titleEnglish,
		mainPicture: e.mainPicture?.large ?? e.mainPicture?.medium ?? null,
		mean: e.mean,
		numEpisodes: e.numEpisodes,
		genres: e.genres.map((g) => g.name),
		studios: e.studios.map((s) => s.name),
		startSeason: e.startSeason ? formatSeason(e.startSeason.year, e.startSeason.season) : null,
		mediaType: e.mediaType,
		animeStatus: e.animeStatus,
		numListUsers: e.numListUsers,
		synopsis: null
	};
}

/** Map a MAL search result node to DisplayAnime */
export function mapMalNodeToDisplay(
	node: import('$lib/api/schemas/mal.schema').MalAnimeLean
): DisplayAnime {
	return {
		malId: node.id,
		title: node.title,
		titleEnglish: node.alternative_titles?.en || null,
		mainPicture: node.main_picture?.large ?? node.main_picture?.medium ?? null,
		mean: node.mean ?? null,
		numEpisodes: node.num_episodes ?? 0,
		genres: node.genres?.map((g) => g.name) ?? [],
		studios: node.studios?.map((s) => s.name) ?? [],
		startSeason: node.start_season
			? formatSeason(node.start_season.year ?? null, node.start_season.season ?? null)
			: null,
		mediaType: node.media_type ?? 'unknown',
		animeStatus: node.status ?? 'unknown',
		numListUsers: node.num_list_users ?? 0,
		synopsis: null
	};
}

/**
 * Fill gaps in a stale locally-cached record with fresh online data.
 * Online wins whenever it has a real value; local only backfills missing
 * fields (null / '' / 'unknown' / 0 / empty array).
 */
export function mergeLocalWithOnline(local: DisplayAnime, online: DisplayAnime): DisplayAnime {
	return {
		malId: local.malId,
		title: online.title || local.title,
		titleEnglish: online.titleEnglish ?? local.titleEnglish,
		mainPicture: online.mainPicture ?? local.mainPicture,
		mean: online.mean ?? local.mean,
		numEpisodes: online.numEpisodes || local.numEpisodes,
		genres: online.genres.length > 0 ? online.genres : local.genres,
		studios: online.studios.length > 0 ? online.studios : local.studios,
		startSeason: online.startSeason ?? local.startSeason,
		mediaType: online.mediaType !== 'unknown' ? online.mediaType : local.mediaType,
		animeStatus: online.animeStatus !== 'unknown' ? online.animeStatus : local.animeStatus,
		numListUsers: online.numListUsers || local.numListUsers,
		synopsis: online.synopsis ?? local.synopsis
	};
}

// ─── AniList mappers (no-auth, primary enrichment) ───

export function mapAnilistNodeToDisplay(node: AnilistMedia): DisplayAnime {
	// AniList is source, malId is idMal if present else Anilist id (for display only)
	const malId = node.idMal ?? node.id;
	return {
		malId,
		title: node.title.romaji ?? node.title.english ?? node.title.native ?? '',
		titleEnglish: node.title.english ?? null,
		mainPicture: node.coverImage?.extraLarge ?? node.coverImage?.large ?? node.coverImage?.medium ?? null,
		mean: node.averageScore != null ? node.averageScore / 10 : (node.meanScore != null ? node.meanScore / 10 : null),
		numEpisodes: node.episodes ?? 0,
		genres: node.genres ?? [],
		studios: node.studios?.edges.filter((e) => e.isMain).map((e) => e.node.name) ?? node.studios?.edges.map((e) => e.node.name) ?? [],
		startSeason: node.season ? formatSeason(node.seasonYear ?? null, node.season) : null,
		mediaType: (node.format ?? 'unknown').toLowerCase(),
		animeStatus: (node.status ?? 'unknown').toLowerCase(),
		numListUsers: node.popularity ?? 0,
		synopsis: node.description ?? null
	};
}

// For detail page enrichment - enriches existing Display shape plus extra fields
export interface AnilistEnriched {
	anilistId: number;
	idMal: number | null;
	tagsRanked: { name: string; rank: number | null }[];
	characters: { id: number; name: string; image: string | null; role: string | null; voiceActor: string | null; favourites: number | null }[];
	recommendations: { id: number; idMal: number | null; title: string; cover: string | null; rating: number | null }[];
	reviews: { summary: string | null; rating: number | null; body: string | null; user: string | null }[];
	nextAiring: { episode: number; airingAt: number; timeUntilAiring: number | null } | null;
	trailer: { id: string; site: string } | null;
	streamingEpisodes: { title: string | null; thumbnail: string | null }[];
}

export function mapAnilistToEnriched(media: AnilistMedia): AnilistEnriched {
	return {
		anilistId: media.id,
		idMal: media.idMal ?? null,
		tagsRanked: (media.tags ?? []).map((t) => ({ name: t.name, rank: t.rank ?? null })),
		characters: (media.characters?.edges ?? []).map((e) => ({
			id: e.node.id,
			name: e.node.name?.full ?? '',
			image: e.node.image?.large ?? null,
			role: e.role ?? null,
			voiceActor: e.voiceActors?.[0]?.name?.full ?? null,
			favourites: e.node.favourites ?? null
		})),
		recommendations: (media.recommendations?.nodes ?? [])
			.map((n) => ({
				id: n.mediaRecommendation?.id ?? 0,
				idMal: (n.mediaRecommendation as unknown as { idMal?: number | null })?.idMal ?? null,
				title: n.mediaRecommendation?.title?.romaji ?? n.mediaRecommendation?.title?.english ?? '',
				cover: n.mediaRecommendation?.coverImage?.large ?? n.mediaRecommendation?.coverImage?.medium ?? null,
				rating: n.rating ?? null
			}))
			.filter((r) => r.id !== 0),
		reviews: (media.reviews?.nodes ?? []).map((r) => ({ summary: r.summary ?? null, rating: r.rating ?? null, body: r.body ?? null, user: r.user?.name ?? null })),
		nextAiring: media.nextAiringEpisode
			? { episode: media.nextAiringEpisode.episode, airingAt: media.nextAiringEpisode.airingAt, timeUntilAiring: media.nextAiringEpisode.timeUntilAiring ?? null }
			: null,
		trailer: media.trailer?.id && media.trailer?.site ? { id: media.trailer.id, site: media.trailer.site } : null,
		streamingEpisodes: (media.streamingEpisodes ?? []).map((s) => ({ title: s.title ?? null, thumbnail: s.thumbnail ?? null }))
	};
}
