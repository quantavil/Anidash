// ─── User anime list cache (IndexedDB) ───
// Always reflects the last-known MAL state. Sync on login.

import { getDB, type UserListRecord, type SyncQueueRecord, type AnimeStatus } from './db';


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

// ─── Sync Queue ───

export async function putSyncQueue(record: SyncQueueRecord): Promise<void> {
	const db = await getDB();
	await db.put('syncQueue', record);
}

export async function getSyncQueue(): Promise<SyncQueueRecord[]> {
	const db = await getDB();
	return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function deleteSyncQueue(malId: number): Promise<void> {
	const db = await getDB();
	await db.delete('syncQueue', malId);
}
