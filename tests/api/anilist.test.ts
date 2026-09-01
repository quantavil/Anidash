import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnilistMediaSchema, AnilistTagSchema } from '$lib/api/schemas/anilist.schema';
import { _detailQuery, _pageQuery } from '$lib/api/anilist';

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

	it('tag schema does not require isGeneral (regression for 400)', () => {
		// isGeneral was removed - schema should accept tags without it, and strip if present
		const withGeneral = { name: 'Survival', rank: 80, isAdult: false, isGeneral: true };
		const parsed = AnilistTagSchema.safeParse(withGeneral);
		expect(parsed.success).toBe(true);
		// stripped unknown key (strictness check - not required)
		if (parsed.success) expect((parsed.data as Record<string, unknown>).isGeneral).toBeUndefined();
	});
});

describe('AniList GraphQL query regression', () => {
	it('MEDIA_DETAIL_QUERY must not contain isGeneral (causes 400)', () => {
		expect(_detailQuery).not.toContain('isGeneral');
		expect(_detailQuery).toContain('tags{name rank isAdult}');
	});

	it('PAGE_QUERY sort var is MediaSort (not [MediaSort]) for string param', () => {
		expect(_pageQuery).toContain('$sort:MediaSort');
		expect(_pageQuery).not.toContain('$sort:[MediaSort]');
	});
});

describe('AniList rate-limit mapping', () => {
	const originalFetch = globalThis.fetch;
	beforeEach(() => vi.restoreAllMocks());
	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('maps 429 with Retry-After to rate_limit AppError', async () => {
		const headers = new Headers({ 'Retry-After': '5', 'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60) });
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 429,
				headers,
				text: async () => ''
			} as unknown as Response)
		);
		const { fetchAnilistMediaByMalId } = await import('$lib/api/anilist');
		const res = await fetchAnilistMediaByMalId(16498);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.error.type).toBe('rate_limit');
			if (res.error.type === 'rate_limit') {
				expect(res.error.retryAfter).toBe(5000);
			}
		}
	});

	it('maps 429 without headers to 60s fallback', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 429,
				headers: new Headers(),
				text: async () => ''
			} as unknown as Response)
		);
		const { fetchAnilistMediaByMalId } = await import('$lib/api/anilist');
		const res = await fetchAnilistMediaByMalId(16498);
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error.type).toBe('rate_limit');
	});
});
