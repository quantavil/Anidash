import { describe, it, expect } from 'vitest';
import {
	EMPTY_FILTERS,
	activeFilterCount,
	buildFacetOptions,
	facetOfDisplay,
	filtersFromUrl,
	filtersToPairs,
	matchesFilters,
	type AnimeFilters
} from '#lib/utils/filters.js';
import { sortDisplay } from '#lib/utils/sort.js';
import type { DisplayAnime } from '#lib/utils/types.js';

const mk = (o: Partial<DisplayAnime> & { malId: number }): DisplayAnime => ({
	title: `T${o.malId}`,
	titleEnglish: null,
	mainPicture: null,
	mean: 7,
	numEpisodes: 12,
	genres: ['Action'],
	studios: ['Bones'],
	startSeason: 'Spring 2020',
	mediaType: 'tv',
	animeStatus: 'finished_airing',
	numListUsers: 100,
	synopsis: null,
	...o
});
const f = (p: Partial<AnimeFilters>): AnimeFilters => ({ ...EMPTY_FILTERS, ...p });
const hit = (p: Partial<AnimeFilters>, a: DisplayAnime, inList = false) =>
	matchesFilters(f(p), facetOfDisplay(a), { inList: () => inList });

describe('matchesFilters', () => {
	it('matches everything with empty filters', () => {
		expect(hit({}, mk({ malId: 1 }))).toBe(true);
	});
	it('genre all vs any, and exclusion', () => {
		const a = mk({ malId: 1, genres: ['Action', 'Comedy'] });
		expect(hit({ genres: ['Action', 'Drama'] }, a)).toBe(false);
		expect(hit({ genres: ['Action', 'Drama'], genreMode: 'any' }, a)).toBe(true);
		expect(hit({ exclude: ['Comedy'] }, a)).toBe(false);
	});
	it('types, airing, studio, score', () => {
		const a = mk({ malId: 1, mediaType: 'movie', mean: 8.1 });
		expect(hit({ types: ['tv'] }, a)).toBe(false);
		expect(hit({ types: ['movie'], minScore: 8 }, a)).toBe(true);
		expect(hit({ minScore: 8.5 }, a)).toBe(false);
		expect(hit({ minScore: 1 }, mk({ malId: 2, mean: null }))).toBe(false);
		expect(hit({ studio: 'Mappa' }, a)).toBe(false);
		expect(hit({ airing: ['currently_airing'] }, a)).toBe(false);
	});
	it('year range excludes unknown start', () => {
		const tba = mk({ malId: 1, startSeason: 'TBA' });
		expect(hit({ yearFrom: 2019, yearTo: 2021 }, mk({ malId: 2 }))).toBe(true);
		expect(hit({ yearFrom: 2021 }, mk({ malId: 2 }))).toBe(false);
		expect(hit({ yearFrom: 2000 }, tba)).toBe(false);
		expect(hit({}, tba)).toBe(true);
	});
	it('episode ranges treat unknown count as non-matching for a max', () => {
		expect(hit({ epsMin: 1, epsMax: 13 }, mk({ malId: 1, numEpisodes: 12 }))).toBe(true);
		expect(hit({ epsMin: 14, epsMax: 26 }, mk({ malId: 1, numEpisodes: 12 }))).toBe(false);
		expect(hit({ epsMax: 13 }, mk({ malId: 1, numEpisodes: 0 }))).toBe(false);
		expect(hit({ epsMin: 27 }, mk({ malId: 1, numEpisodes: 100 }))).toBe(true);
	});
	it('hideListed consults list membership', () => {
		expect(hit({ hideListed: true }, mk({ malId: 1 }), true)).toBe(false);
		expect(hit({ hideListed: true }, mk({ malId: 1 }), false)).toBe(true);
	});
});

describe('url round trip', () => {
	it('serialises and parses the same filters', () => {
		const orig = f({
			types: ['tv', 'movie'],
			genres: ['Action', 'Slice of Life'],
			genreMode: 'any',
			exclude: ['Ecchi'],
			studio: 'Bones',
			minScore: 7.5,
			yearFrom: 2010,
			maxScore: 9,
			epsMax: 13,
			unrated: true
		});
		const url = new URL('http://x/');
		for (const { key, value } of filtersToPairs(orig)) if (value) url.searchParams.set(key, value);
		expect(filtersFromUrl(url)).toEqual({ ...orig, myMin: 0, hideListed: false });
		expect(activeFilterCount(orig)).toBe(8);
	});
	it('ignores junk numbers', () => {
		const u = new URL('http://x/?min=abc&from=-5&emax=1e9');
		const p = filtersFromUrl(u);
		expect([p.minScore, p.yearFrom, p.epsMax]).toEqual([0, 0, 10000]);
	});
});

describe('facets and sorting', () => {
	it('keeps selected values even with zero matches', () => {
		const o = buildFacetOptions([facetOfDisplay(mk({ malId: 1 }))], f({ exclude: ['Horror'] }));
		expect(o.genres.map((g) => g.name)).toEqual(['Action', 'Horror']);
	});
	it('sinks missing values to the bottom in either direction', () => {
		const items = [
			mk({ malId: 1, mean: null }),
			mk({ malId: 2, mean: 6 }),
			mk({ malId: 3, mean: 9 })
		];
		expect(sortDisplay(items, 'mean', 'desc').map((a) => a.malId)).toEqual([3, 2, 1]);
		expect(sortDisplay(items, 'mean', 'asc').map((a) => a.malId)).toEqual([2, 3, 1]);
	});
	it('sorts by release chronologically', () => {
		const items = [
			mk({ malId: 1, startSeason: 'Fall 2020' }),
			mk({ malId: 2, startSeason: 'Winter 2021' }),
			mk({ malId: 3, startSeason: 'Spring 2020' })
		];
		expect(sortDisplay(items, 'start', 'desc').map((a) => a.malId)).toEqual([2, 1, 3]);
	});
});
