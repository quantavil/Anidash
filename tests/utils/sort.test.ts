import { describe, it, expect } from 'vitest';
import { sortEntries } from '#lib/utils/sort.js';
import type { UserListRecord } from '#lib/cache/db.js';

describe('sort utils', () => {
	const sampleEntries: UserListRecord[] = [
		{
			malId: 1,
			title: 'Attack on Titan',
			titleEnglish: 'Attack on Titan',
			mainPicture: null,
			mean: 8.5,
			numEpisodes: 25,
			genres: [],
			studios: [],
			startSeason: null,
			mediaType: 'tv',
			animeStatus: 'finished_airing',
			numListUsers: 1000,
			numScoringUsers: 500,
			status: 'watching',
			score: 8,
			numWatchedEpisodes: 10,
			isRewatching: false,
			updatedAt: '2024-01-01T00:00:00Z',
			startDate: null,
			finishDate: null
		},
		{
			malId: 2,
			title: 'Bleach',
			titleEnglish: 'Bleach',
			mainPicture: null,
			mean: 7.9,
			numEpisodes: 20,
			genres: [],
			studios: [],
			startSeason: null,
			mediaType: 'tv',
			animeStatus: 'finished_airing',
			numListUsers: 1000,
			numScoringUsers: 500,
			status: 'watching',
			score: 10,
			numWatchedEpisodes: 20,
			isRewatching: false,
			updatedAt: '2024-01-05T00:00:00Z',
			startDate: null,
			finishDate: null
		},
		{
			malId: 3,
			title: 'Clannad',
			titleEnglish: 'Clannad',
			mainPicture: null,
			mean: 9.0,
			numEpisodes: 24,
			genres: [],
			studios: [],
			startSeason: null,
			mediaType: 'tv',
			animeStatus: 'finished_airing',
			numListUsers: 1000,
			numScoringUsers: 500,
			status: 'completed',
			score: 8,
			numWatchedEpisodes: 5,
			isRewatching: false,
			updatedAt: '2024-01-03T00:00:00Z',
			startDate: null,
			finishDate: null
		}
	];

	it('sorts by title alphabetically', () => {
		const sorted = sortEntries(sampleEntries, 'title');
		expect(sorted.map((e) => e.title)).toEqual(['Attack on Titan', 'Bleach', 'Clannad']);
	});

	it('sorts by score descending, with mean score as tie-breaker', () => {
		const sorted = sortEntries(sampleEntries, 'score');
		expect(sorted.map((e) => e.malId)).toEqual([2, 3, 1]);
	});

	it('sorts by mean score descending', () => {
		const sorted = sortEntries(sampleEntries, 'mean');
		expect(sorted.map((e) => e.malId)).toEqual([3, 1, 2]);
	});

	it('sorts by updatedAt descending', () => {
		const sorted = sortEntries(sampleEntries, 'updated');
		expect(sorted.map((e) => e.malId)).toEqual([2, 3, 1]);
	});

	it('sorts by progress percentage descending', () => {
		const sorted = sortEntries(sampleEntries, 'progress');
		// Bleach is 20/20 (100%), AoT is 10/25 (40%), Clannad is 5/24 (~21%)
		expect(sorted.map((e) => e.malId)).toEqual([2, 1, 3]);
	});
});

describe('sort direction', () => {
	const e = (malId: number, title: string, numEpisodes: number) =>
		({
			malId,
			title,
			titleEnglish: null,
			mainPicture: null,
			mean: null,
			numEpisodes,
			genres: [],
			studios: [],
			startSeason: null,
			mediaType: 'tv',
			animeStatus: 'finished_airing',
			numListUsers: 0,
			numScoringUsers: 0,
			status: 'completed',
			score: 0,
			numWatchedEpisodes: 0,
			isRewatching: false,
			updatedAt: null,
			startDate: null,
			finishDate: null
		}) as UserListRecord;
	const rows = [e(1, 'B', 12), e(2, 'A', 0), e(3, 'C', 24)];

	it('reverses natural order on request', () => {
		expect(sortEntries(rows, 'title', 'desc').map((r) => r.title)).toEqual(['C', 'B', 'A']);
	});
	it('keeps entries without data last in both directions', () => {
		expect(sortEntries(rows, 'episodes', 'desc').map((r) => r.malId)).toEqual([3, 1, 2]);
		expect(sortEntries(rows, 'episodes', 'asc').map((r) => r.malId)).toEqual([1, 3, 2]);
	});
});
