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
	const db = await getDB();
	const cleanProfile = JSON.parse(JSON.stringify(profile));
	await db.put('meta', { key: KEY_USER_PROFILE, value: cleanProfile, updatedAt: Date.now() });
}

// ─── Seasonal Cache ───

export async function getSeasonalCache(key: string): Promise<{ value: DisplayAnime[]; updatedAt: number } | null> {
	const record = await getMetaRecord(key);
	if (!record || !Array.isArray(record.value)) return null;
	return {
		value: record.value as DisplayAnime[],
		updatedAt: record.updatedAt
	};
}

export async function setSeasonalCache(key: string, animeList: DisplayAnime[]): Promise<void> {
	const db = await getDB();
	await db.put('meta', { key, value: animeList, updatedAt: Date.now() });
}
