// ─── Metadata cache (IndexedDB) ───
// Stores: lastSync timestamp, browse/seasonal grids, AniList detail cache.

import { getDB, type MetaRecord } from './db';
import { AnilistMediaSchema, type AnilistMedia } from '$lib/api/schemas/anilist.schema';
import type { DisplayAnime } from '$lib/utils/types';

// ─── Keys ───

const KEY_LAST_SYNC = 'lastSync';

// ─── Private Base Helper ───

async function getMetaRecord(key: string): Promise<MetaRecord | null> {
	const db = await getDB();
	return (await db.get('meta', key)) ?? null;
}

async function putMetaRecord(key: string, value: unknown): Promise<void> {
	const db = await getDB();
	await db.put('meta', { key, value: JSON.parse(JSON.stringify(value)), updatedAt: Date.now() });
}

// ─── Last Sync ───

export async function getLastSync(): Promise<number | null> {
	const record = await getMetaRecord(KEY_LAST_SYNC);
	return typeof record?.value === 'number' ? record.value : null;
}

export async function setLastSync(timestamp: number): Promise<void> {
	const db = await getDB();
	await db.put('meta', { key: KEY_LAST_SYNC, value: timestamp, updatedAt: Date.now() });
}

// ─── Browse Popular (stale-while-revalidate) ───

/** Returns the cached popular grid, or null when absent/invalid. */
export async function getPopularCache(
	key: string
): Promise<{ value: DisplayAnime[]; updatedAt: number } | null> {
	const record = await getMetaRecord(key);
	if (!record || !Array.isArray(record.value)) return null;
	return { value: record.value as DisplayAnime[], updatedAt: record.updatedAt };
}

export async function setPopularCache(key: string, animeList: DisplayAnime[]): Promise<void> {
	await putMetaRecord(key, animeList);
}

// ─── Seasonal Cache ───

export async function getSeasonalCache(
	key: string
): Promise<{ value: DisplayAnime[]; updatedAt: number } | null> {
	const record = await getMetaRecord(key);
	if (!record || !Array.isArray(record.value)) return null;
	return { value: record.value as DisplayAnime[], updatedAt: record.updatedAt };
}

export async function setSeasonalCache(key: string, animeList: DisplayAnime[]): Promise<void> {
	await putMetaRecord(key, animeList);
}

// ─── AniList detail cache (7d TTL, GC'd by purgeStaleAnilistCache) ───

const ANILIST_CACHE_PREFIX = 'anilist:fetch:';
const MAX_ANILIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Fresh cached AniList media for a MAL id. `{ media: null }` is a cached "AniList has
 * no entry"; `null` means miss/stale/invalid. Entries are re-validated so a schema
 * change silently invalidates old records.
 */
export async function getAnilistCache(
	malId: number
): Promise<{ media: AnilistMedia | null } | null> {
	const record = await getMetaRecord(`${ANILIST_CACHE_PREFIX}${malId}`);
	if (!record || Date.now() - record.updatedAt > MAX_ANILIST_TTL_MS) return null;

	const value = record.value as { media?: unknown } | null;
	if (value?.media === null) return { media: null };
	const parsed = AnilistMediaSchema.safeParse(value?.media);
	return parsed.success ? { media: parsed.data } : null;
}

export async function setAnilistCache(malId: number, media: AnilistMedia | null): Promise<void> {
	await putMetaRecord(`${ANILIST_CACHE_PREFIX}${malId}`, { media });
}

// ─── Maintenance ───

/** Delete stale AniList cache records. Returns count purged. */
export async function purgeStaleAnilistCache(): Promise<number> {
	const db = await getDB();
	const tx = db.transaction('meta', 'readwrite');
	const threshold = Date.now() - MAX_ANILIST_TTL_MS;
	let purged = 0;

	let cursor = await tx.store.openCursor();
	while (cursor) {
		const { key, updatedAt } = cursor.value;
		if (typeof key === 'string' && key.startsWith(ANILIST_CACHE_PREFIX) && updatedAt < threshold) {
			await cursor.delete();
			purged++;
		}
		cursor = await cursor.continue();
	}

	await tx.done;
	return purged;
}
