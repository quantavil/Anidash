// ─── Anime detail cache (IndexedDB) ───
// TTL: 24 hours for all cached anime data.

import { getDB, type AnimeRecord } from './db';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isStale(cachedAt: number): boolean {
	return Date.now() - cachedAt > CACHE_TTL_MS;
}

// ─── Read ───

/** Get an anime record from cache. Returns null if missing or stale. */
export async function getAnime(malId: number): Promise<AnimeRecord | null> {
	const db = await getDB();
	const record = await db.get('anime', malId);
	if (!record) return null;
	if (isStale(record.cachedAt)) return null;
	return record;
}

/** Get anime record, returning even if stale (for stale-while-revalidate). */
export async function getAnimeAllowStale(malId: number): Promise<AnimeRecord | null> {
	const db = await getDB();
	const val = await db.get('anime', malId);
	return val ?? null;
}

// ─── Write ───

/** Put an anime record into cache */
export async function putAnime(record: AnimeRecord): Promise<void> {
	const db = await getDB();
	await db.put('anime', {
		...record,
		cachedAt: Date.now()
	});
}

/** Put multiple anime records into cache */
export async function putAnimeBatch(records: AnimeRecord[]): Promise<void> {
	const db = await getDB();
	const tx = db.transaction('anime', 'readwrite');
	const now = Date.now();

	await Promise.all(records.map((record) => tx.store.put({ ...record, cachedAt: now })));

	await tx.done;
}

/** Purge all stale anime records (run on app startup) */
export async function purgeStaleAnime(): Promise<number> {
	const db = await getDB();
	const tx = db.transaction('anime', 'readwrite');
	const now = Date.now();
	const staleThreshold = now - CACHE_TTL_MS;
	let purged = 0;

	const index = tx.store.index('by-cachedAt');
	let cursor = await index.openCursor(IDBKeyRange.upperBound(staleThreshold, true));

	while (cursor) {
		await cursor.delete();
		purged++;
		cursor = await cursor.continue();
	}

	await tx.done;
	return purged;
}
