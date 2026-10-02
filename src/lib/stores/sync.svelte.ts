// ─── Sync Store (Svelte 5 Runes) ───
// Manages full sync state: in-progress, last synced, errors.

import { bulkPut } from '$lib/cache/userlist.cache';
import { getUserAnimeList } from '$lib/api/mal';
import {
	getLastSync,
	setLastSync,
	setCachedProfile,
	purgeStaleAnilistCache
} from '$lib/cache/meta.cache';
import { purgeStaleAnime } from '$lib/cache/anime.cache';
import { authStore } from '$lib/auth/auth.svelte';
import type { AppError } from '$lib/api/result';

function createSyncStore() {
	let isSyncing = $state(false);
	let lastSynced = $state<number | null>(null);
	let syncError = $state<AppError | null>(null);
	let activeSyncPromise: Promise<{ success: boolean; entryCount: number }> | null = null;

	async function init(): Promise<void> {
		lastSynced = await getLastSync();
	}

	async function fullSync(): Promise<{ success: boolean; entryCount: number }> {
		if (activeSyncPromise) {
			return activeSyncPromise;
		}

		activeSyncPromise = (async () => {
			isSyncing = true;
			syncError = null;

			try {
				// 1. Fetch full list from MAL
				const result = await getUserAnimeList();

				if (!result.ok) {
					syncError = result.error;
					return { success: false, entryCount: 0 };
				}

				const entries = result.value;

				// 2. Bulk replace in IDB
				const cacheRes = await bulkPut(entries);
				if (!cacheRes.ok) {
					syncError = cacheRes.error;
					return { success: false, entryCount: 0 };
				}

				// 3. Cache user profile
				if (authStore.user) {
					await setCachedProfile($state.snapshot(authStore.user));
				}

				// 4. Update last sync timestamp
				const now = Date.now();
				await setLastSync(now);
				lastSynced = now;

				// 5. Purge stale caches in background
				purgeStaleAnime().catch(() => {});
				purgeStaleAnilistCache().catch(() => {});

				return { success: true, entryCount: entries.length };
			} catch (e) {
				syncError = {
					type: 'network',
					message: e instanceof Error ? e.message : 'Sync failed unexpectedly'
				};
				return { success: false, entryCount: 0 };
			} finally {
				isSyncing = false;
				activeSyncPromise = null;
			}
		})();

		return activeSyncPromise;
	}

	function clearError(): void {
		syncError = null;
	}

	/** Report an error observed by another store (e.g. a failed background sync). */
	function reportError(error: AppError): void {
		syncError = error;
	}

	function reset(): void {
		isSyncing = false;
		lastSynced = null;
		syncError = null;
		activeSyncPromise = null;
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
		init,
		fullSync,
		clearError,
		reportError,
		reset
	};
}

export const syncStore = createSyncStore();
