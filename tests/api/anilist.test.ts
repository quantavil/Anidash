import { describe, it, expect } from 'vitest';
import { AnilistMediaSchema } from '$lib/api/schemas/anilist.schema';

describe('AnilistMediaSchema', () => {
	it('parses live Media(16498) shape', async () => {
		const sample = {
			id: 16498,
			idMal: 16498,
			title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan', native: '進撃の巨人' },
			coverImage: { extraLarge: 'https://...', large: 'https://...' },
			bannerImage: 'https://...',
			format: 'TV',
			status: 'FINISHED',
			episodes: 25,
			duration: 24,
			season: 'SPRING',
			seasonYear: 2013,
			genres: ['Action', 'Drama'],
			synonyms: ['AoT'],
			tags: [{ name: 'Survival', rank: 80 }],
			averageScore: 85,
			popularity: 1049188,
			nextAiringEpisode: null,
			relations: {
				edges: [{ relationType: 'SEQUEL', node: { id: 25777, type: 'ANIME', title: { romaji: 'S2' } } }]
			},
			characters: {
				edges: [
					{
						role: 'MAIN',
						node: { id: 40882, name: { full: 'Eren Yeager' }, image: { large: '' } },
						voiceActors: [{ name: { full: 'Yuki Kaji' }, languageV2: 'JAPANESE' }]
					}
				]
			},
			recommendations: {
				nodes: [{ rating: 2862, mediaRecommendation: { id: 11757, title: { romaji: 'Sword Art Online' } } }]
			},
			reviews: { nodes: [{ summary: 'Great', rating: 85, body: '...' }] },
			trailer: { id: 'LHtd', site: 'youtube' }
		};
		const parsed = AnilistMediaSchema.safeParse(sample);
		expect(parsed.success).toBe(true);
	});
});
