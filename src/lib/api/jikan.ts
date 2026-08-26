// ─── Jikan API Client ───
// Jikan is used ONLY for data MAL v2 doesn't provide: characters and
// community recommendations (anime detail page). All search/browse traffic
// goes through the MAL worker proxy — see mal.ts.

import type { ZodType } from 'zod';

import { getDB } from '$lib/cache/db';
import { logger } from '$lib/utils/logger';
import { jikanLimiter } from './rate-limit';
import { ok, err, type Result, zodIssuesToSummaries } from './result';
import {
	JikanCharactersResponseSchema,
	JikanRecommendationsResponseSchema,
	type JikanCharacterEntry,
	type JikanRecommendationEntry
} from './schemas/jikan.schema';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Jikan 504/429s are often transient within seconds — retry twice with growing pauses.
const RETRY_DELAYS_MS = [1000, 3000];

async function jikanFetch<T>(url: string, schema: ZodType<T>): Promise<Result<T>> {
	const cacheKey = `jikan:fetch:${url}`;
	let stale: T | undefined;

	try {
		const db = await getDB();
		const cached = await db.get('meta', cacheKey);

		if (cached) {
			const parsed = schema.safeParse(cached.value);
			if (parsed.success) {
				if (Date.now() - cached.updatedAt < CACHE_TTL_MS) return ok(parsed.data);
				// Expired but parseable — keep as a fallback in case the fetch fails.
				stale = parsed.data;
			}
		}
	} catch (e) {
		logger.warn('Failed to read Jikan cache:', e);
	}

	try {
		let response = await jikanLimiter.enqueue(() => fetch(url));

		for (const delay of RETRY_DELAYS_MS) {
			if (response.status !== 429 && response.status < 500) break;
			await new Promise((resolve) => setTimeout(resolve, delay));
			response = await jikanLimiter.enqueue(() => fetch(url));
		}

		if (!response.ok) {
			return stale !== undefined
				? ok(stale)
				: err({ type: 'network', message: `Jikan HTTP ${response.status}` });
		}

		const parsed = schema.safeParse(await response.json());
		if (!parsed.success) {
			return stale !== undefined
				? ok(stale)
				: err({
						type: 'validation',
						message: 'Invalid response from Jikan API',
						issues: zodIssuesToSummaries(parsed.error.issues)
					});
		}

		try {
			const db = await getDB();
			await db.put('meta', { key: cacheKey, value: parsed.data, updatedAt: Date.now() });
		} catch (cacheError) {
			logger.warn('Failed to write Jikan cache:', cacheError);
		}

		return ok(parsed.data);
	} catch (e: unknown) {
		if (stale !== undefined) return ok(stale);
		const error = e as { message?: string };
		return err({ type: 'network', message: error.message || 'Jikan request failed' });
	}
}

// ─── Characters ───

export async function getCharacters(
	malId: number,
	page: number = 1
): Promise<Result<{ characters: JikanCharacterEntry[]; hasNextPage: boolean }>> {
	const url = `${JIKAN_BASE}/anime/${malId}/characters?page=${page}`;
	const result = await jikanFetch(url, JikanCharactersResponseSchema);

	if (!result.ok) return result;

	return ok({
		characters: result.value.data,
		hasNextPage: result.value.pagination?.has_next_page ?? false
	});
}

// ─── Recommendations ───

export async function getRecommendations(
	malId: number
): Promise<Result<JikanRecommendationEntry[]>> {
	const url = `${JIKAN_BASE}/anime/${malId}/recommendations`;
	const result = await jikanFetch(url, JikanRecommendationsResponseSchema);

	if (!result.ok) return result;

	return ok(result.value.data);
}
