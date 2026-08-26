// ─── Shared display types for browse/seasonal/search results ───
// Normalized from MAL or Jikan responses for UI consumption.

import { formatSeason } from './format';
import type { UserListRecord } from '$lib/cache/db';

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
