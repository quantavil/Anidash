import { describe, it, expect } from 'vitest';
import { mergeLocalWithOnline, type DisplayAnime } from '$lib/utils/types';

function makeDisplay(overrides: Partial<DisplayAnime>): DisplayAnime {
	return {
		malId: 935,
		title: 'Some Anime',
		titleEnglish: null,
		mainPicture: null,
		mean: null,
		numEpisodes: 0,
		genres: [],
		studios: [],
		startSeason: null,
		mediaType: 'unknown',
		animeStatus: 'unknown',
		numListUsers: 0,
		synopsis: null,
		...overrides
	};
}

describe('mergeLocalWithOnline', () => {
	it('fills missing cover from online data', () => {
		const local = makeDisplay({ mainPicture: null });
		const online = makeDisplay({ mainPicture: 'https://cdn.example.com/img.jpg' });

		expect(mergeLocalWithOnline(local, online).mainPicture).toBe('https://cdn.example.com/img.jpg');
	});

	it('keeps local cover when online has none', () => {
		const local = makeDisplay({ mainPicture: 'https://cdn.example.com/local.jpg' });
		const online = makeDisplay({ mainPicture: null });

		expect(mergeLocalWithOnline(local, online).mainPicture).toBe(
			'https://cdn.example.com/local.jpg'
		);
	});

	it('prefers online values for fresh fields', () => {
		const local = makeDisplay({ mean: 7.1, numEpisodes: 12, numListUsers: 100 });
		const online = makeDisplay({ mean: 8.3, numEpisodes: 26, numListUsers: 200_000 });

		const merged = mergeLocalWithOnline(local, online);
		expect(merged.mean).toBe(8.3);
		expect(merged.numEpisodes).toBe(26);
		expect(merged.numListUsers).toBe(200_000);
	});

	it('backfills from local when online lacks the field', () => {
		const local = makeDisplay({
			titleEnglish: 'Local Title',
			genres: ['Action'],
			studios: ['Studio A'],
			startSeason: 'Spring 2002',
			mediaType: 'tv',
			animeStatus: 'finished_airing',
			synopsis: 'Local synopsis'
		});
		const online = makeDisplay({});

		const merged = mergeLocalWithOnline(local, online);
		expect(merged.titleEnglish).toBe('Local Title');
		expect(merged.genres).toEqual(['Action']);
		expect(merged.studios).toEqual(['Studio A']);
		expect(merged.startSeason).toBe('Spring 2002');
		expect(merged.mediaType).toBe('tv');
		expect(merged.animeStatus).toBe('finished_airing');
		expect(merged.synopsis).toBe('Local synopsis');
	});

	it('treats empty-string title and unknown media/status as missing', () => {
		const local = makeDisplay({ title: 'Local Title' });
		const online = makeDisplay({ title: '', mediaType: 'unknown', animeStatus: 'unknown' });

		const merged = mergeLocalWithOnline(local, online);
		expect(merged.title).toBe('Local Title');
		expect(merged.mediaType).toBe('unknown');
		expect(merged.animeStatus).toBe('unknown');
	});

	it('always keeps the local malId', () => {
		const local = makeDisplay({ malId: 1 });
		const online = makeDisplay({ malId: 999 });

		expect(mergeLocalWithOnline(local, online).malId).toBe(1);
	});
});
