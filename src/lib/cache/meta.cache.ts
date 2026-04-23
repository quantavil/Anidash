// ─── Metadata cache (IndexedDB) ───
// Stores: lastSync timestamp, userProfile, genreMap, etc.

import { getDB, type MetaRecord } from './db';
import type { MalUser } from '$lib/api/schemas/mal.schema';

// ─── Keys ───

const KEY_LAST_SYNC = 'lastSync';
const KEY_USER_PROFILE = 'userProfile';
const KEY_GENRE_MAP = 'genreMap';

// ─── Generic ───

export async function getMetaRecord<T>(
	key: string
): Promise<{ key: string; value: T; updatedAt: number } | null> {
	const db = await getDB();
	const record = await db.get('meta', key);
	if (!record) return null;
	return record as { key: string; value: T; updatedAt: number };
}

export async function getMeta<T>(key: string): Promise<T | null> {
	const record = await getMetaRecord<T>(key);
	return record ? record.value : null;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
	const db = await getDB();
	await db.put('meta', { key, value, updatedAt: Date.now() });
}

// ─── Last Sync ───

export async function getLastSync(): Promise<number | null> {
	return getMeta<number>(KEY_LAST_SYNC);
}

export async function setLastSync(timestamp: number): Promise<void> {
	return setMeta(KEY_LAST_SYNC, timestamp);
}

// ─── User Profile ───

export async function getCachedProfile(): Promise<MalUser | null> {
	return getMeta<MalUser>(KEY_USER_PROFILE);
}

export async function setCachedProfile(profile: MalUser): Promise<void> {
	return setMeta(KEY_USER_PROFILE, profile);
}

// ─── Genre Map ───

export interface GenreMap {
	[id: number]: string;
}

export async function getGenreMap(): Promise<GenreMap | null> {
	return getMeta<GenreMap>(KEY_GENRE_MAP);
}

export async function setGenreMap(map: GenreMap): Promise<void> {
	return setMeta(KEY_GENRE_MAP, map);
}

/** Clear all meta */
export async function clearMeta(): Promise<void> {
	const db = await getDB();
	await db.clear('meta');
}
