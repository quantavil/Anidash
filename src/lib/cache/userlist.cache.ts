// ─── User anime list cache (IndexedDB) ───
// Always reflects the last-known MAL state. Sync on login.

import { getDB, type UserListRecord, type SyncQueueRecord } from './db';
import { ok, err, type Result } from '$lib/api/result';

// ─── Read ───

/** Get all list entries */
export async function getAllEntries(): Promise<UserListRecord[]> {
	const db = await getDB();
	return db.getAll('userList');
}

// ─── Write ───

/** Replace the entire list with fresh data from MAL */
export async function bulkPut(entries: UserListRecord[]): Promise<Result<void>> {
	try {
		const db = await getDB();
		const currentEntries = await db.getAll('userList');
		const newIds = new Set(entries.map((e) => e.malId));

		// Anime the user deleted locally but whose delete hasn't reached MAL yet — don't
		// let the fresh server list resurrect them until the queued delete lands.
		const queued = await db.getAll('syncQueue');
		const pendingDeletes = new Set(
			queued.filter((q) => q.payload._delete === true).map((q) => q.malId)
		);

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

		// 2. Put/overwrite the fresh entries, skipping ones pending deletion.
		await Promise.all(
			entries
				.filter((entry) => !pendingDeletes.has(entry.malId))
				.map((entry) => tx.store.put(entry))
		);

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

// ─── Sync Queue ───

function isDeletePayload(payload: Record<string, unknown>): boolean {
	return payload._delete === true;
}

/**
 * Queue a change, merging its payload into any change already queued for the same
 * anime. Without this, a second edit (e.g. score) would overwrite an earlier queued
 * edit (e.g. episodes) that hadn't synced yet. A delete on either side supersedes.
 */
export async function mergeSyncQueue(record: SyncQueueRecord): Promise<Result<void>> {
	try {
		const db = await getDB();
		const existing = await db.get('syncQueue', record.malId);
		let next = record;
		if (existing && !isDeletePayload(existing.payload) && !isDeletePayload(record.payload)) {
			next = { ...record, payload: { ...existing.payload, ...record.payload } };
		}
		await db.put('syncQueue', next);
		return ok(undefined);
	} catch (e) {
		return err({
			type: 'cache',
			message: e instanceof Error ? e.message : 'IndexedDB mergeSyncQueue failed'
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
