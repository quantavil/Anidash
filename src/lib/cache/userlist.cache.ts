// ─── User anime list cache (IndexedDB) ───
// Always reflects the last-known MAL state. Sync on login.

import { getDB, type UserListRecord, type SyncQueueRecord, type AnimeStatus } from './db';
import { ok, err, type Result } from '$lib/api/result';

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
export async function bulkPut(entries: UserListRecord[]): Promise<Result<void>> {
	try {
		const db = await getDB();
		const currentEntries = await db.getAll('userList');
		const newIds = new Set(entries.map((e) => e.malId));

		const tx = db.transaction('userList', 'readwrite');

		// 1. Delete outdated entries (those not in the sync list and not marked as local-only or explicit)
		for (const entry of currentEntries) {
			if (!newIds.has(entry.malId)) {
				const isExplicit =
					entry.isLocalOnly ||
					entry.genres?.some((g) => g.name === 'Hentai' || g.name === 'Erotica');
				if (!isExplicit) {
					await tx.store.delete(entry.malId);
				}
			}
		}

		// 2. Put/overwrite the fresh entries
		await Promise.all(entries.map((entry) => tx.store.put(entry)));

		await tx.done;
		return ok(undefined);
	} catch (e) {
		return err({
			type: 'cache',
			message: e instanceof Error ? e.message : 'IndexedDB bulkPut failed'
		});
	}
}

/** Put a single entry (add or update) */
export async function putEntry(entry: UserListRecord): Promise<Result<void>> {
	try {
		const db = await getDB();
		await db.put('userList', entry);
		return ok(undefined);
	} catch (e) {
		return err({
			type: 'cache',
			message: e instanceof Error ? e.message : 'IndexedDB putEntry failed'
		});
	}
}

/** Remove a single entry */
export async function removeEntry(malId: number): Promise<Result<void>> {
	try {
		const db = await getDB();
		await db.delete('userList', malId);
		return ok(undefined);
	} catch (e) {
		return err({
			type: 'cache',
			message: e instanceof Error ? e.message : 'IndexedDB removeEntry failed'
		});
	}
}

/** Clear all list entries */
export async function clearList(): Promise<Result<void>> {
	try {
		const db = await getDB();
		await db.clear('userList');
		return ok(undefined);
	} catch (e) {
		return err({
			type: 'cache',
			message: e instanceof Error ? e.message : 'IndexedDB clearList failed'
		});
	}
}

// ─── Sync Queue ───

export async function putSyncQueue(record: SyncQueueRecord): Promise<Result<void>> {
	try {
		const db = await getDB();
		await db.put('syncQueue', record);
		return ok(undefined);
	} catch (e) {
		return err({
			type: 'cache',
			message: e instanceof Error ? e.message : 'IndexedDB putSyncQueue failed'
		});
	}
}

export async function getSyncQueue(): Promise<SyncQueueRecord[]> {
	const db = await getDB();
	return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function deleteSyncQueue(malId: number): Promise<Result<void>> {
	try {
		const db = await getDB();
		await db.delete('syncQueue', malId);
		return ok(undefined);
	} catch (e) {
		return err({
			type: 'cache',
			message: e instanceof Error ? e.message : 'IndexedDB deleteSyncQueue failed'
		});
	}
}
