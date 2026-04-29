import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncStore } from '$lib/stores/sync.svelte';
import { bulkPut } from '$lib/cache/userlist.cache';
import { getUserAnimeList } from '$lib/api/mal';
import { getLastSync, setLastSync, setCachedProfile } from '$lib/cache/meta.cache';
import { purgeStaleAnime } from '$lib/cache/anime.cache';

// Mock dependencies
vi.mock('$lib/cache/userlist.cache', () => ({
	bulkPut: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/api/mal', () => ({
	getUserAnimeList: vi.fn()
}));

vi.mock('$lib/cache/meta.cache', () => ({
	getLastSync: vi.fn().mockResolvedValue(null),
	setLastSync: vi.fn().mockResolvedValue(undefined),
	setCachedProfile: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/cache/anime.cache', () => ({
	purgeStaleAnime: vi.fn().mockResolvedValue(0)
}));

vi.mock('$lib/auth/auth.svelte', () => ({
	authStore: { user: { name: 'TestUser' } }
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

		vi.mocked(getUserAnimeList).mockResolvedValueOnce({ ok: true, value: mockEntries as any });

		const result = await syncStore.fullSync();

		expect(result).toEqual({ success: true, entryCount: 2 });
		expect(syncStore.isSyncing).toBe(false);
		expect(syncStore.syncError).toBeNull();

		expect(getUserAnimeList).toHaveBeenCalledTimes(1);
		expect(bulkPut).toHaveBeenCalledWith(mockEntries);
		expect(setCachedProfile).toHaveBeenCalledWith({ name: 'TestUser' });
		expect(setLastSync).toHaveBeenCalled();
		expect(purgeStaleAnime).toHaveBeenCalled();
	});

	it('should handle API errors during sync', async () => {
		const apiError = { type: 'api', status: 500, message: 'Server error' };
		vi.mocked(getUserAnimeList).mockResolvedValueOnce({ ok: false, error: apiError as any });

		const result = await syncStore.fullSync();

		expect(result).toEqual({ success: false, entryCount: 0 });
		expect(syncStore.isSyncing).toBe(false);
		expect(syncStore.syncError).toEqual(apiError);

		expect(bulkPut).not.toHaveBeenCalled();
		expect(setLastSync).not.toHaveBeenCalled();
	});

	it('should prevent concurrent sync operations', async () => {
		// Mock a delayed response
		vi.mocked(getUserAnimeList).mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, value: [] }), 50))
		);

		// Start first sync
		const p1 = syncStore.fullSync();

		// Immediately start second sync while first is running
		const result2 = await syncStore.fullSync();

		expect(result2).toEqual({ success: false, entryCount: 0 });

		// Wait for first to finish
		await p1;

		// API should only have been called once
		expect(getUserAnimeList).toHaveBeenCalledTimes(1);
	});
});
