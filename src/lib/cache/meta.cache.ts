// ─── Metadata cache (IndexedDB) ───
// Stores: lastSync timestamp, userProfile, seasonal anime cache.

import { getDB, type MetaRecord } from './db';
import type { MalUser } from '$lib/api/schemas/mal.schema';
import type { DisplayAnime } from '$lib/utils/types';

// ─── Keys ───

const KEY_LAST_SYNC = 'lastSync';
const KEY_USER_PROFILE = 'userProfile';

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

// ─── User Profile ───

export async function setCachedProfile(profile: MalUser): Promise<void> {
	await putMetaRecord(KEY_USER_PROFILE, profile);
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

// ─── Maintenance ───

// The meta store accumulates one record per distinct Jikan request URL. TTL is only
// checked on read, so without this these records grow without bound. Purge anything
// older than the longest TTL Jikan uses (7 days for genres).
const JIKAN_CACHE_PREFIX = 'jikan:fetch:';
const MAX_JIKAN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Delete stale Jikan request-cache records from the meta store. Returns count purged. */
export async function purgeStaleJikanCache(): Promise<number> {
	const db = await getDB();
	const tx = db.transaction('meta', 'readwrite');
	const threshold = Date.now() - MAX_JIKAN_TTL_MS;
	let purged = 0;

	let cursor = await tx.store.openCursor();
	while (cursor) {
		const { key, updatedAt } = cursor.value;
		if (typeof key === 'string' && key.startsWith(JIKAN_CACHE_PREFIX) && updatedAt < threshold) {
			await cursor.delete();
			purged++;
		}
		cursor = await cursor.continue();
	}

	await tx.done;
	return purged;
}
