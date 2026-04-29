import { describe, it, expect } from 'vitest';
import { mapBaseAnimeNode, mapListEntryToRecord, mapDetailToRecord } from '$lib/api/mal';
import type { MalAnimeLean, MalUserListEntry, MalAnimeDetail } from '$lib/api/schemas/mal.schema';

describe('MAL API Mappers', () => {
	it('should correctly map base anime node fields', () => {
		const rawNode: MalAnimeLean = {
			id: 123,
			title: 'Test Anime',
			main_picture: { medium: 'med.jpg', large: 'large.jpg' },
			alternative_titles: { en: 'English Title' },
			mean: 8.5,
			num_episodes: 12,
			genres: [{ id: 1, name: 'Action' }],
			studios: [{ id: 1, name: 'Studio Test' }],
			start_season: { year: 2023, season: 'fall' },
			media_type: 'tv',
			status: 'finished_airing',
			num_list_users: 1000,
			num_scoring_users: 500
		};

		const result = mapBaseAnimeNode(rawNode);

		expect(result).toEqual({
			malId: 123,
			title: 'Test Anime',
			titleEnglish: 'English Title',
			mainPicture: { medium: 'med.jpg', large: 'large.jpg' },
			mean: 8.5,
			numEpisodes: 12,
			genres: [{ id: 1, name: 'Action' }],
			studios: [{ id: 1, name: 'Studio Test' }],
			startSeason: { year: 2023, season: 'fall' },
			mediaType: 'tv',
			animeStatus: 'finished_airing',
			numListUsers: 1000,
			numScoringUsers: 500
		});
	});

	it('should handle missing optional fields gracefully in base node mapping', () => {
		const minimalNode: MalAnimeLean = {
			id: 404,
			title: 'Minimal Anime'
		};

		const result = mapBaseAnimeNode(minimalNode);

		expect(result).toEqual({
			malId: 404,
			title: 'Minimal Anime',
			titleEnglish: null,
			mainPicture: null,
			mean: null,
			numEpisodes: 0,
			genres: [],
			studios: [],
			startSeason: { year: null, season: null },
			mediaType: 'unknown',
			animeStatus: 'unknown',
			numListUsers: 0,
			numScoringUsers: 0
		});
	});

	it('should correctly map a user list entry', () => {
		const rawEntry: MalUserListEntry = {
			node: {
				id: 1,
				title: 'List Anime'
			},
			list_status: {
				status: 'watching',
				score: 9,
				num_episodes_watched: 5,
				is_rewatching: false,
				updated_at: '2023-01-01T12:00:00Z',
				start_date: '2023-01-01'
			}
		};

		const result = mapListEntryToRecord(rawEntry);

		expect(result).toMatchObject({
			malId: 1,
			title: 'List Anime',
			status: 'watching',
			score: 9,
			numWatchedEpisodes: 5,
			isRewatching: false,
			updatedAt: '2023-01-01T12:00:00Z',
			startDate: '2023-01-01',
			finishDate: null
		});
	});

	it('should correctly map detailed anime properties', () => {
		const rawDetail: MalAnimeDetail = {
			id: 99,
			title: 'Detailed Anime',
			synopsis: 'A detailed story.',
			broadcast: { day_of_the_week: 'monday', start_time: '23:00' },
			related_anime: [
				{
					node: { id: 100, title: 'Sequel' },
					relation_type: 'sequel',
					relation_type_formatted: 'Sequel'
				}
			],
			recommendations: [
				{
					node: { id: 200, title: 'Rec Anime', mean: 8.0 },
					num_recommendations: 50
				}
			]
		};

		const result = mapDetailToRecord(rawDetail);

		expect(result).toMatchObject({
			malId: 99,
			title: 'Detailed Anime',
			synopsis: 'A detailed story.',
			broadcast: { day_of_the_week: 'monday', start_time: '23:00' },
			relatedAnime: [
				{
					id: 100,
					title: 'Sequel',
					mainPicture: null,
					mediaType: null,
					relationType: 'sequel'
				}
			],
			recommendations: [
				{
					id: 200,
					title: 'Rec Anime',
					mainPicture: null,
					mean: 8.0,
					numRecommendations: 50
				}
			],
			isDetail: true
		});

		// Ensure cachedAt is populated
		expect(result.cachedAt).toBeGreaterThan(0);
	});
});
