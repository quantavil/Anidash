import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnilistMediaSchema, AnilistTagSchema } from '$lib/api/schemas/anilist.schema';
import { mapAnilistToEnriched } from '$lib/utils/types';
import { _detailQuery, fetchAnilistMediaByMalId } from '$lib/api/anilist';

describe('AnilistMediaSchema', () => {
	const sample = {
		id: 16498,
		idMal: 16498,
		tags: [{ name: 'Survival', rank: 80, isAdult: false }],
		nextAiringEpisode: null,
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
			nodes: [
				{
					rating: 2862,
					mediaRecommendation: {
						id: 11757,
						idMal: 11757,
						title: { romaji: 'Sword Art Online' },
						coverImage: { large: 'https://example.test/c.jpg' }
					}
				}
			]
		},
		reviews: { nodes: [{ summary: 'Great', rating: 85, body: '...', user: { name: 'x' } }] },
		trailer: { id: 'LHtd', site: 'youtube' }
	};

	it('parses the detail query shape', () => {
		expect(AnilistMediaSchema.safeParse(sample).success).toBe(true);
	});

	it('keeps the recommendation MAL id so rows can link to /anime/{idMal}', () => {
		const enriched = mapAnilistToEnriched(AnilistMediaSchema.parse(sample));
		expect(enriched.recommendations[0]).toMatchObject({ id: 11757, idMal: 11757 });
	});

	it('tag schema does not require isGeneral (regression for 400)', () => {
		const parsed = AnilistTagSchema.safeParse({
			name: 'Survival',
			rank: 80,
			isAdult: false,
			isGeneral: true
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) expect((parsed.data as Record<string, unknown>).isGeneral).toBeUndefined();
	});
});

describe('AniList GraphQL query regression', () => {
	it('MEDIA_DETAIL_QUERY must not contain isGeneral (causes 400)', () => {
		expect(_detailQuery).not.toContain('isGeneral');
		expect(_detailQuery).toContain('tags{name rank isAdult}');
	});

	it('is a direct Media(idMal) lookup, never a title search', () => {
		expect(_detailQuery).toContain('Media(idMal:$malId type:ANIME)');
		expect(_detailQuery).not.toContain('search');
	});
});

describe('AniList response mapping', () => {
	const originalFetch = globalThis.fetch;
	beforeEach(() => vi.restoreAllMocks());
	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	function stubResponse(res: Partial<Response> & { json?: () => Promise<unknown> }) {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res as Response));
	}

	it('maps 429 with Retry-After to rate_limit AppError', async () => {
		stubResponse({
			ok: false,
			status: 429,
			headers: new Headers({
				'Retry-After': '5',
				'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60)
			})
		});
		const res = await fetchAnilistMediaByMalId(16498);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.error.type).toBe('rate_limit');
			if (res.error.type === 'rate_limit') expect(res.error.retryAfter).toBe(5000);
		}
	});

	it('maps 429 without headers to 60s fallback', async () => {
		stubResponse({ ok: false, status: 429, headers: new Headers() });
		const res = await fetchAnilistMediaByMalId(16498);
		expect(res.ok).toBe(false);
		if (!res.ok && res.error.type === 'rate_limit') expect(res.error.retryAfter).toBe(60_000);
	});

	it('treats AniList 404 + {data:{Media:null}} as "no entry", not an error', async () => {
		stubResponse({
			ok: false,
			status: 404,
			headers: new Headers(),
			json: async () => ({
				errors: [{ message: 'Not Found.', status: 404 }],
				data: { Media: null }
			})
		});
		const res = await fetchAnilistMediaByMalId(999999999);
		expect(res).toEqual({ ok: true, value: null });
	});

	it('surfaces other non-2xx statuses as api errors', async () => {
		stubResponse({
			ok: false,
			status: 500,
			headers: new Headers(),
			json: async () => ({ errors: [{ message: 'boom' }] })
		});
		const res = await fetchAnilistMediaByMalId(1);
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error).toMatchObject({ type: 'api', status: 500, message: 'boom' });
	});

	it('only sends Content-Type and Accept headers from the browser', async () => {
		stubResponse({
			ok: true,
			status: 200,
			headers: new Headers(),
			json: async () => ({ data: { Media: null } })
		});
		await fetchAnilistMediaByMalId(2);
		const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
		expect(Object.keys(init.headers as Record<string, string>).sort()).toEqual([
			'Accept',
			'Content-Type'
		]);
	});
});
