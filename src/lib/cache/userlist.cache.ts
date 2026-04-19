// ─── User anime list cache (IndexedDB) ───
// Always reflects the last-known MAL state. Sync on login.

import { getDB, type UserListRecord } from './db';
import { ok, err, type Result } from '$lib/api/result';
import type { AppError } from '$lib/api/result';

type AnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

// ─── Read ───

/** Get a single list entry */
export async function getListEntry(malId: number): Promise<UserListRecord | null> {
	const db = await getDB();
	const val = await db.get('userList', malId);
	return val ?? null;
}

/** Get all list entries */
export async function getAllEntries(): Promise<UserListRecord[]> {
	const db = await getDB();
	return db.getAll('userList');
}

/** Get entries by status */
export async function getEntriesByStatus(status: AnimeStatus): Promise<UserListRecord[]> {
	const db = await getDB();
	return db.getAllFromIndex('userList', 'by-status', status);
}

/** Get count of entries per status */
export async function getStatusCounts(): Promise<Record<AnimeStatus, number>> {
	const db = await getDB();
	const counts: Record<AnimeStatus, number> = {
		watching: 0,
		completed: 0,
		on_hold: 0,
		dropped: 0,
		plan_to_watch: 0
	};

	let cursor = await db.transaction('userList', 'readonly').store.openCursor();
	while (cursor) {
		const status = cursor.value.status as AnimeStatus;
		if (status in counts) counts[status]++;
		cursor = await cursor.continue();
	}

	return counts;
}

// ─── Write ───

/** Replace the entire list with fresh data from MAL */
export async function bulkPut(entries: UserListRecord[]): Promise<void> {
	const db = await getDB();
	const tx = db.transaction('userList', 'readwrite');

	// Clear existing entries
	await tx.store.clear();

	// Put all new entries
	await Promise.all(entries.map((entry) => tx.store.put(entry)));

	await tx.done;
}

/** Put a single entry (add or update) */
export async function putEntry(entry: UserListRecord): Promise<void> {
	const db = await getDB();
	await db.put('userList', entry);
}

/** Update specific fields of a list entry */
export async function updateEntry(
	malId: number,
	updates: Partial<Omit<UserListRecord, 'malId'>>
): Promise<Result<void>> {
	const db = await getDB();
	const existing = await db.get('userList', malId);

	if (!existing) {
		return err({ type: 'cache', message: `No list entry for anime ${malId}` });
	}

	await db.put('userList', { ...existing, ...updates });
	return ok(undefined);
}

/** Remove a single entry */
export async function removeEntry(malId: number): Promise<void> {
	const db = await getDB();
	await db.delete('userList', malId);
}

/** Clear all list entries */
export async function clearList(): Promise<void> {
	const db = await getDB();
	await db.clear('userList');
}
