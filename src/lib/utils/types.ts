// ─── Shared display types for browse/seasonal/search results ───
// Normalized from MAL or Jikan responses for UI consumption.

import { formatSeason, capitalize } from './format';

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

/** Map a MAL search result node to DisplayAnime */
export function mapMalNodeToDisplay(
	node: import('$lib/api/schemas/mal.schema').MalAnimeLean
): DisplayAnime {
	return {
		malId: node.id,
		title: node.title,
		titleEnglish: null,
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

/** Map a Jikan anime result to DisplayAnime */
export function mapJikanToDisplay(
	anime: import('$lib/api/schemas/jikan.schema').JikanAnime
): DisplayAnime {
	return {
		malId: anime.mal_id,
		title: anime.title,
		titleEnglish: anime.title_english ?? null,
		mainPicture:
			anime.images?.webp?.large_image_url ??
			anime.images?.webp?.image_url ??
			anime.images?.jpg?.large_image_url ??
			anime.images?.jpg?.image_url ??
			null,
		mean: anime.score ?? null,
		numEpisodes: anime.episodes ?? 0,
		genres: anime.genres?.map((g) => g.name) ?? [],
		studios: anime.studios?.map((s) => s.name) ?? [],
		startSeason:
			anime.season && anime.year
				? `${capitalize(anime.season)} ${anime.year}`
				: anime.year
					? String(anime.year)
					: null,
		mediaType: anime.type ?? 'unknown',
		animeStatus: anime.status ?? 'unknown',
		numListUsers: anime.members ?? 0,
		synopsis: anime.synopsis ?? null
	};
}
