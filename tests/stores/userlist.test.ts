import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userListStore } from '$lib/stores/userlist.svelte';
import { putSyncQueue, getSyncQueue, deleteSyncQueue } from '$lib/cache/userlist.cache';
import { updateAnimeStatus, deleteAnimeStatus } from '$lib/api/mal';

vi.mock('$lib/cache/userlist.cache', () => ({
	getAllEntries: vi.fn().mockResolvedValue([]),
	putEntry: vi.fn().mockResolvedValue(undefined),
	removeEntry: vi.fn().mockResolvedValue(undefined),
	putSyncQueue: vi.fn().mockResolvedValue(undefined),
	getSyncQueue: vi.fn().mockResolvedValue([]),
	deleteSyncQueue: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/api/mal', () => ({
	updateAnimeStatus: vi.fn().mockResolvedValue({ ok: true }),
	deleteAnimeStatus: vi.fn().mockResolvedValue({ ok: true }),
	getAnimeDetail: vi.fn().mockResolvedValue({ ok: false })
}));

vi.mock('$lib/cache/anime.cache', () => ({
	putAnime: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./sync.svelte.ts', () => ({
	syncStore: { fullSync: vi.fn().mockResolvedValue({ success: true }), syncError: null }
}));

describe('userlist.svelte.ts state', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await userListStore.loadFromCache();
	});

	it('should optimistically add an entry to the list', async () => {
		await userListStore.addToList(1, 'watching', 'Test Anime', 'Test', null);

		expect(userListStore.getEntry(1)).toBeDefined();
		expect(userListStore.getEntry(1)?.status).toBe('watching');
		expect(userListStore.getEntry(1)?.title).toBe('Test');

		expect(updateAnimeStatus).toHaveBeenCalledWith(1, { status: 'watching' });
	});

	it('should optimistically update an entry status locally', async () => {
		await userListStore.addToList(2, 'plan_to_watch', 'Test 2', 'Test 2', null);
		userListStore.setStatus(2, 'watching');

		expect(userListStore.getEntry(2)?.status).toBe('watching');
	});

	it('should optimistically increment episodes', async () => {
		await userListStore.addToList(3, 'watching', 'Test 3', 'Test 3', null);
		userListStore.incrementEpisode(3);

		expect(userListStore.getEntry(3)?.numWatchedEpisodes).toBe(1);
	});

	it('should queue failed deletions to the sync queue', async () => {
		// Mock deletion failure
		vi.mocked(deleteAnimeStatus).mockResolvedValueOnce({
			ok: false,
			error: { type: 'api', status: 500, message: 'Server error' }
		});

		await userListStore.addToList(4, 'watching', 'Test 4', 'Test 4', null);
		await userListStore.removeFromList(4);

		// Entry should be removed locally
		expect(userListStore.getEntry(4)).toBeUndefined();

		// But putSyncQueue should be called to schedule a retry
		expect(putSyncQueue).toHaveBeenCalledWith(
			expect.objectContaining({
				malId: 4,
				payload: { _delete: true }
			})
		);
	});

	it('should process persistent queue sequentially on flushPersistentQueue', async () => {
		vi.mocked(getSyncQueue).mockResolvedValueOnce([
			{ malId: 5, payload: { status: 'completed' }, timestamp: 1234 }
		]);

		await userListStore.flushPersistentQueue();

		expect(updateAnimeStatus).toHaveBeenCalledWith(5, { status: 'completed' });
		expect(deleteSyncQueue).toHaveBeenCalledWith(5);
	});
});
