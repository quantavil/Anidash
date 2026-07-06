import { describe, it, expect } from 'vitest';
import { matchesFuzzy, getSearchKeyword } from '../../src/lib/utils/search';

describe('Fuzzy Search Matching Logic', () => {
	const anime = {
		title: 'Boku no Kokoro no Yabai Yatsu',
		titleEnglish: 'The Dangers in My Heart'
	};

	it('should match exact Romaji title', () => {
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'Boku no Kokoro')).toBe(true);
	});

	it('should match exact English title', () => {
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'The Dangers in My Heart')).toBe(true);
	});

	it('should match fuzzy query with words from English title', () => {
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'danger heart')).toBe(true);
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'dangers my heart')).toBe(true);
	});

	it('should match fuzzy query with words from Romaji title', () => {
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'boku kokoro')).toBe(true);
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'yabai kokoro')).toBe(true);
	});

	it('should match case insensitively', () => {
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'DANGERS HEART')).toBe(true);
	});

	it('should not match query with words not in either title', () => {
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'danger love')).toBe(false);
		expect(matchesFuzzy(anime.title, anime.titleEnglish, 'boku love')).toBe(false);
	});
});

describe('Search Keyword Extraction', () => {
	it('should return empty string for empty query', () => {
		expect(getSearchKeyword('')).toBe('');
		expect(getSearchKeyword('   ')).toBe('');
	});

	it('should return single word unchanged', () => {
		expect(getSearchKeyword('danger')).toBe('danger');
		expect(getSearchKeyword('heart')).toBe('heart');
	});

	it('should return longest significant word for multi-word queries', () => {
		expect(getSearchKeyword('danger heart')).toBe('danger');
		expect(getSearchKeyword('the dangers in my heart')).toBe('dangers');
		expect(getSearchKeyword('boku no kokoro')).toBe('kokoro');
	});

	it('should fall back to first word if all are stop words', () => {
		expect(getSearchKeyword('the in my')).toBe('the');
	});
});

describe('Browse Page Fuzzy Merging & De-duplication', () => {
	const userList = [
		{
			malId: 52578,
			title: 'Boku no Kokoro no Yabai Yatsu',
			titleEnglish: 'The Dangers in My Heart'
		},
		{ malId: 1, title: 'Cowboy Bebop', titleEnglish: 'Cowboy Bebop' }
	];

	function getFilteredResults(
		query: string,
		onlineResults: { malId: number; title: string; titleEnglish: string | null }[]
	) {
		if (!query.trim()) return onlineResults;

		const localMatches = userList
			.filter((e) => matchesFuzzy(e.title, e.titleEnglish, query))
			.map((e) => ({
				malId: e.malId,
				title: e.title,
				titleEnglish: e.titleEnglish
			}));

		const localIds = new Set(localMatches.map((m) => m.malId));
		const uniqueOnline = onlineResults.filter((r) => !localIds.has(r.malId));

		return [...localMatches, ...uniqueOnline];
	}

	it('should return online results unchanged if query is empty', () => {
		const online = [{ malId: 2, title: 'Naruto', titleEnglish: 'Naruto' }];
		expect(getFilteredResults('', online)).toEqual(online);
	});

	it('should merge and prioritize matching local list entries', () => {
		const online = [
			{ malId: 3, title: 'Go! Go! Loser Ranger!', titleEnglish: 'Go! Go! Loser Ranger!' }
		];
		const merged = getFilteredResults('danger heart', online);

		expect(merged.length).toBe(2);
		expect(merged[0].malId).toBe(52578); // The Dangers in My Heart from local list
		expect(merged[1].malId).toBe(3); // Online result
	});

	it('should de-duplicate entries that appear in both local and online results', () => {
		const online = [
			{
				malId: 52578,
				title: 'Boku no Kokoro no Yabai Yatsu',
				titleEnglish: 'The Dangers in My Heart'
			},
			{ malId: 3, title: 'Go! Go! Loser Ranger!', titleEnglish: 'Go! Go! Loser Ranger!' }
		];
		const merged = getFilteredResults('danger heart', online);

		expect(merged.length).toBe(2);
		expect(merged[0].malId).toBe(52578); // Local version preferred/de-duplicated
		expect(merged[1].malId).toBe(3);
	});
});
