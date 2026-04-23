// ─── Sync Store (Svelte 5 Runes) ───
// Manages full sync state: in-progress, last synced, errors.

import { bulkPut } from '$lib/cache/userlist.cache';
import { getUserAnimeList } from '$lib/api/mal';
import { getLastSync, setLastSync, setCachedProfile } from '$lib/cache/meta.cache';
import { purgeStaleAnime } from '$lib/cache/anime.cache';
import { authStore } from '$lib/auth/auth.svelte';
import type { UserListRecord } from '$lib/cache/db';
import type { AppError } from '$lib/api/result';

function createSyncStore() {
	let isSyncing = $state(false);
	let lastSynced = $state<number | null>(null);
	let syncError = $state<AppError | null>(null);
	let progress = $state<{ current: number; total: number } | null>(null);

	async function init(): Promise<void> {
		lastSynced = await getLastSync();
	}

	async function fullSync(): Promise<{ success: boolean; entryCount: number }> {
		if (isSyncing) return { success: false, entryCount: 0 };

		isSyncing = true;
		syncError = null;
		progress = null;

		try {
			// 1. Fetch full list from MAL
			const result = await getUserAnimeList();

			if (!result.ok) {
				syncError = result.error;
				isSyncing = false;
				return { success: false, entryCount: 0 };
			}

			const entries = result.value;
			progress = { current: entries.length, total: entries.length };

			// 2. Bulk replace in IDB
			await bulkPut(entries);

			// 3. Cache user profile
			if (authStore.user) {
				await setCachedProfile(authStore.user);
			}

			// 4. Update last sync timestamp
			const now = Date.now();
			await setLastSync(now);
			lastSynced = now;

			// 5. Purge stale anime cache in background
			purgeStaleAnime().catch(() => {});

			isSyncing = false;
			return { success: true, entryCount: entries.length };
		} catch (e) {
			syncError = {
				type: 'network',
				message: e instanceof Error ? e.message : 'Sync failed unexpectedly'
			};
			isSyncing = false;
			return { success: false, entryCount: 0 };
		}
	}

	function clearError(): void {
		syncError = null;
	}

	return {
		get isSyncing() {
			return isSyncing;
		},
		get lastSynced() {
			return lastSynced;
		},
		get syncError() {
			return syncError;
		},
		set syncError(val) {
			syncError = val;
		},
		get progress() {
			return progress;
		},
		init,
		fullSync,
		clearError
	};
}

export const syncStore = createSyncStore();
