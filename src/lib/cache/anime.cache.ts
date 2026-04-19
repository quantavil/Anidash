// ─── Anime detail cache (IndexedDB) ───
// TTL: 7 days for basic (list) data, 24 hours for full detail.

import { getDB, type AnimeRecord } from './db';

const BASIC_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DETAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isStale(cachedAt: number, isDetail: boolean): boolean {
	const ttl = isDetail ? DETAIL_TTL_MS : BASIC_TTL_MS;
	return Date.now() - cachedAt > ttl;
}

// ─── Read ───

/** Get an anime record from cache. Returns null if missing or stale. */
export async function getAnime(malId: number): Promise<AnimeRecord | null> {
	const db = await getDB();
	const record = await db.get('anime', malId);
	if (!record) return null;
	if (isStale(record.cachedAt, record.isDetail)) return null;
	return record;
}

/** Get anime record, returning even if stale (for stale-while-revalidate). */
export async function getAnimeAllowStale(malId: number): Promise<AnimeRecord | null> {
	const db = await getDB();
	const val = await db.get('anime', malId);
	return val ?? null;
}

/** Get multiple anime records by ID */
export async function getAnimeBatch(malIds: number[]): Promise<Map<number, AnimeRecord>> {
	const db = await getDB();
	const results = new Map<number, AnimeRecord>();
	const tx = db.transaction('anime', 'readonly');

	await Promise.all(
		malIds.map(async (id) => {
			const record = await tx.store.get(id);
			if (record && !isStale(record.cachedAt, record.isDetail)) {
				results.set(id, record);
			}
		})
	);

	return results;
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

// ─── Invalidate ───

/** Mark a specific anime as stale by resetting cachedAt to 0 */
export async function invalidateAnime(malId: number): Promise<void> {
	const db = await getDB();
	const record = await db.get('anime', malId);
	if (record) {
		record.cachedAt = 0;
		await db.put('anime', record);
	}
}

/** Purge all stale anime records (run on app startup) */
export async function purgeStaleAnime(): Promise<number> {
	const db = await getDB();
	const tx = db.transaction('anime', 'readwrite');
	const now = Date.now();
	let purged = 0;

	let cursor = await tx.store.openCursor();
	while (cursor) {
		const record = cursor.value;
		const ttl = record.isDetail ? DETAIL_TTL_MS : BASIC_TTL_MS;
		if (now - record.cachedAt > ttl) {
			await cursor.delete();
			purged++;
		}
		cursor = await cursor.continue();
	}

	return purged;
}
