import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncStore } from '$lib/stores/sync.svelte';
import { bulkPut } from '$lib/cache/userlist.cache';
import { getUserAnimeList } from '$lib/api/mal';
import { setLastSync } from '$lib/cache/meta.cache';
import { purgeStaleAnime } from '$lib/cache/anime.cache';
import type { UserListRecord } from '$lib/cache/db';
import type { AppError } from '$lib/api/result';

// Mock dependencies
vi.mock('$lib/cache/userlist.cache', () => ({
	bulkPut: vi.fn().mockResolvedValue({ ok: true })
}));

vi.mock('$lib/api/mal', () => ({
	getUserAnimeList: vi.fn()
}));

vi.mock('$lib/cache/meta.cache', () => ({
	getLastSync: vi.fn().mockResolvedValue(null),
	setLastSync: vi.fn().mockResolvedValue(undefined),
	purgeStaleAnilistCache: vi.fn().mockResolvedValue(0)
}));

vi.mock('$lib/cache/anime.cache', () => ({
	purgeStaleAnime: vi.fn().mockResolvedValue(0)
}));

describe('sync.svelte.ts', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Reset state
		await syncStore.init();
	});

	it('should perform a successful full sync', async () => {
		const mockEntries = [
			{ malId: 1, title: 'Anime 1', status: 'watching' },
			{ malId: 2, title: 'Anime 2', status: 'completed' }
		];

		vi.mocked(getUserAnimeList).mockResolvedValueOnce({
			ok: true,
			value: mockEntries as unknown as UserListRecord[]
		});

		const result = await syncStore.fullSync();

		expect(result).toEqual({ success: true, entryCount: 2 });
		expect(syncStore.isSyncing).toBe(false);
		expect(syncStore.syncError).toBeNull();

		expect(getUserAnimeList).toHaveBeenCalledTimes(1);
		expect(bulkPut).toHaveBeenCalledWith(mockEntries);
		expect(setLastSync).toHaveBeenCalled();
		expect(purgeStaleAnime).toHaveBeenCalled();
	});

	it('should handle API errors during sync', async () => {
		const apiError: AppError = { type: 'api', status: 500, message: 'Server error' };
		vi.mocked(getUserAnimeList).mockResolvedValueOnce({ ok: false, error: apiError });

		const result = await syncStore.fullSync();

		expect(result).toEqual({ success: false, entryCount: 0 });
		expect(syncStore.isSyncing).toBe(false);
		expect(syncStore.syncError).toEqual(apiError);

		expect(bulkPut).not.toHaveBeenCalled();
		expect(setLastSync).not.toHaveBeenCalled();
	});

	it('should coalesce concurrent sync operations into a single execution', async () => {
		// Mock a delayed response
		vi.mocked(getUserAnimeList).mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, value: [] }), 50))
		);

		// Start first sync
		const p1 = syncStore.fullSync();

		// Immediately start second sync while first is running
		const p2 = syncStore.fullSync();

		// Both should resolve successfully with the shared result
		const [result1, result2] = await Promise.all([p1, p2]);

		expect(result1).toEqual({ success: true, entryCount: 0 });
		expect(result2).toEqual({ success: true, entryCount: 0 });

		// API should only have been called once
		expect(getUserAnimeList).toHaveBeenCalledTimes(1);
	});

	it('should reset sync store state cleanly', () => {
		syncStore.reportError({ type: 'network', message: 'Test error' });
		expect(syncStore.syncError).not.toBeNull();

		syncStore.reset();
		expect(syncStore.syncError).toBeNull();
		expect(syncStore.isSyncing).toBe(false);
		expect(syncStore.lastSynced).toBeNull();
	});
});
