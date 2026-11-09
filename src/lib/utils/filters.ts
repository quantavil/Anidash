// ─── Shared anime filtering ───
// One filter model for My List, Browse and Seasonal. MAL's v2 API cannot filter by
// genre/type/score (only q/limit/offset/fields), so every filter runs client-side over
// the rows already loaded. State round-trips through URL params so views are shareable.

import type { UserListRecord } from '$lib/cache/db';
import type { DisplayAnime } from './types';

export interface AnimeFilters {
	types: string[];
	genres: string[];
	/** `all`: must have every selected genre. `any`: at least one. */
	genreMode: 'all' | 'any';
	exclude: string[];
	/** MAL airing status: currently_airing | finished_airing | not_yet_aired */
	airing: string[];
	studio: string;
	/** Minimum MAL mean score; 0 = off. */
	minScore: number;
	/** Start year range; 0 = open. */
	yearFrom: number;
	yearTo: number;
	/** Episode count range; 0 = open. Unknown (0-episode) titles never match an active range. */
	epsMin: number;
	epsMax: number;
	/** List-only: minimum of MY score; 0 = off. */
	myMin: number;
	/** List-only: only entries I have not rated. */
	unrated: boolean;
	/** Browse-only: hide titles already on my list. */
	hideListed: boolean;
}

export const EMPTY_FILTERS: AnimeFilters = Object.freeze({
	types: [],
	genres: [],
	genreMode: 'all',
	exclude: [],
	airing: [],
	studio: '',
	minScore: 0,
	yearFrom: 0,
	yearTo: 0,
	epsMin: 0,
	epsMax: 0,
	myMin: 0,
	unrated: false,
	hideListed: false
}) as AnimeFilters;

/** The value each filter needs about one title, independent of its source shape. */
export interface Facet {
	malId: number;
	mediaType: string;
	genres: string[];
	studios: string[];
	mean: number | null;
	year: number | null;
	/** year*4 + season index; 0 when unknown. Used for chronological sorting. */
	startKey: number;
	animeStatus: string;
	numEpisodes: number;
	myScore: number;
}

const SEASON_INDEX: Record<string, number> = { winter: 0, spring: 1, summer: 2, fall: 3 };

function startKeyOf(year: number | null, season: string | null): number {
	if (!year) return 0;
	return year * 4 + (SEASON_INDEX[(season ?? '').toLowerCase()] ?? 0);
}

export function facetOfRecord(e: UserListRecord): Facet {
	const year = e.startSeason?.year ?? null;
	return {
		malId: e.malId,
		mediaType: e.mediaType.toLowerCase(),
		genres: e.genres.map((g) => g.name),
		studios: e.studios.map((s) => s.name),
		mean: e.mean,
		year,
		startKey: startKeyOf(year, e.startSeason?.season ?? null),
		animeStatus: e.animeStatus,
		numEpisodes: e.numEpisodes,
		myScore: e.score
	};
}

/** DisplayAnime carries its start season as "Spring 2024" / "2024" / "TBA". */
export function facetOfDisplay(a: DisplayAnime): Facet {
	const m = /^(?:(\w+)\s+)?(\d{4})$/.exec(a.startSeason ?? '');
	const year = m ? Number(m[2]) : null;
	return {
		malId: a.malId,
		mediaType: a.mediaType.toLowerCase(),
		genres: a.genres,
		studios: a.studios,
		mean: a.mean,
		year,
		startKey: startKeyOf(year, m?.[1] ?? null),
		animeStatus: a.animeStatus,
		numEpisodes: a.numEpisodes,
		myScore: 0
	};
}

export function matchesFilters(
	f: AnimeFilters,
	x: Facet,
	ctx: { inList?: (malId: number) => boolean } = {}
): boolean {
	if (f.types.length > 0 && !f.types.includes(x.mediaType)) return false;

	if (f.genres.length > 0) {
		const has = (g: string) => x.genres.includes(g);
		if (f.genreMode === 'all' ? !f.genres.every(has) : !f.genres.some(has)) return false;
	}
	if (f.exclude.length > 0 && f.exclude.some((g) => x.genres.includes(g))) return false;

	if (f.airing.length > 0 && !f.airing.includes(x.animeStatus)) return false;
	if (f.studio && !x.studios.includes(f.studio)) return false;
	if (f.minScore > 0 && (x.mean ?? 0) < f.minScore) return false;

	if (f.yearFrom > 0 && (x.year === null || x.year < f.yearFrom)) return false;
	if (f.yearTo > 0 && (x.year === null || x.year > f.yearTo)) return false;

	if (f.epsMin > 0 && x.numEpisodes < f.epsMin) return false;
	if (f.epsMax > 0 && (x.numEpisodes === 0 || x.numEpisodes > f.epsMax)) return false;

	if (f.myMin > 0 && x.myScore < f.myMin) return false;
	if (f.unrated && x.myScore !== 0) return false;
	if (f.hideListed && ctx.inList?.(x.malId)) return false;

	return true;
}

/** Number of independent filters in effect (drives the badge and "clear" affordance). */
export function activeFilterCount(f: AnimeFilters): number {
	return [
		f.types.length > 0,
		f.genres.length > 0,
		f.exclude.length > 0,
		f.airing.length > 0,
		f.studio !== '',
		f.minScore > 0,
		f.yearFrom > 0 || f.yearTo > 0,
		f.epsMin > 0 || f.epsMax > 0,
		f.myMin > 0,
		f.unrated,
		f.hideListed
	].filter(Boolean).length;
}

// ─── Facets (what the panel offers) ───

export interface FacetOptions {
	genres: { name: string; count: number }[];
	studios: { name: string; count: number }[];
	years: { min: number; max: number } | null;
}

function countBy(values: Iterable<string>): { name: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
	return [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Options present in the loaded rows, always including anything already selected. */
export function buildFacetOptions(facets: Facet[], f: AnimeFilters): FacetOptions {
	const genres = countBy(facets.flatMap((x) => x.genres));
	for (const g of [...f.genres, ...f.exclude]) {
		if (!genres.some((o) => o.name === g)) genres.push({ name: g, count: 0 });
	}
	const studios = countBy(facets.flatMap((x) => x.studios));
	if (f.studio && !studios.some((o) => o.name === f.studio)) {
		studios.push({ name: f.studio, count: 0 });
	}
	const years = facets.map((x) => x.year).filter((y): y is number => y !== null);
	return {
		genres,
		studios,
		years: years.length ? { min: Math.min(...years), max: Math.max(...years) } : null
	};
}

// ─── URL round trip ───

const num = (v: string | null, max: number): number => {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};
const list = (v: string | null): string[] =>
	v
		? [
				...new Set(
					v
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean)
				)
			]
		: [];

export const FILTER_PARAM_KEYS = [
	'type',
	'genre',
	'gm',
	'xg',
	'air',
	'studio',
	'min',
	'from',
	'to',
	'emin',
	'emax',
	'my',
	'unrated',
	'hide'
] as const;

export function filtersFromUrl(url: URL): AnimeFilters {
	const p = url.searchParams;
	return {
		types: list(p.get('type')).map((t) => t.toLowerCase()),
		genres: list(p.get('genre')),
		genreMode: p.get('gm') === 'any' ? 'any' : 'all',
		exclude: list(p.get('xg')),
		airing: list(p.get('air')),
		studio: p.get('studio') ?? '',
		minScore: num(p.get('min'), 10),
		yearFrom: num(p.get('from'), 2100),
		yearTo: num(p.get('to'), 2100),
		epsMin: num(p.get('emin'), 10000),
		epsMax: num(p.get('emax'), 10000),
		myMin: num(p.get('my'), 10),
		unrated: p.get('unrated') === '1',
		hideListed: p.get('hide') === '1'
	};
}

/** Pairs for `setUrlParams`; empty values delete the param. */
export function filtersToPairs(f: AnimeFilters): Array<{ key: string; value: string }> {
	const n = (v: number) => (v > 0 ? String(v) : '');
	return [
		{ key: 'type', value: f.types.join(',') },
		{ key: 'genre', value: f.genres.join(',') },
		{ key: 'gm', value: f.genreMode === 'any' && f.genres.length > 1 ? 'any' : '' },
		{ key: 'xg', value: f.exclude.join(',') },
		{ key: 'air', value: f.airing.join(',') },
		{ key: 'studio', value: f.studio },
		{ key: 'min', value: n(f.minScore) },
		{ key: 'from', value: n(f.yearFrom) },
		{ key: 'to', value: n(f.yearTo) },
		{ key: 'emin', value: n(f.epsMin) },
		{ key: 'emax', value: n(f.epsMax) },
		{ key: 'my', value: n(f.myMin) },
		{ key: 'unrated', value: f.unrated ? '1' : '' },
		{ key: 'hide', value: f.hideListed ? '1' : '' }
	];
}

export const CLEAR_FILTER_PAIRS = FILTER_PARAM_KEYS.map((key) => ({ key, value: '' }));

export function pickRandom<T>(items: readonly T[]): T | null {
	return items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null;
}
