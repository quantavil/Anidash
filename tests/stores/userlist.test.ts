import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userListStore } from '$lib/stores/userlist.svelte';
import { mergeSyncQueue, getSyncQueue, deleteSyncQueue } from '$lib/cache/userlist.cache';
import { updateAnimeStatus, deleteAnimeStatus } from '$lib/api/mal';

vi.mock('$lib/cache/userlist.cache', () => ({
	getAllEntries: vi.fn().mockResolvedValue([]),
	putEntry: vi.fn().mockResolvedValue({ ok: true }),
	removeEntry: vi.fn().mockResolvedValue({ ok: true }),
	// Echo the record like the real merge does when nothing was queued before.
	mergeSyncQueue: vi.fn(async (record: unknown) => ({ ok: true, value: record })),
	getSyncQueue: vi.fn().mockResolvedValue([]),
	deleteSyncQueue: vi.fn().mockResolvedValue({ ok: true })
}));

vi.mock('$lib/api/mal', () => ({
	updateAnimeStatus: vi.fn().mockResolvedValue({ ok: true }),
	deleteAnimeStatus: vi.fn().mockResolvedValue({ ok: true }),
	getAnimeDetail: vi.fn().mockResolvedValue({ ok: false })
}));

vi.mock('$lib/cache/anime.cache', () => ({
	putAnime: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/stores/sync.svelte', () => ({
	syncStore: {
		fullSync: vi.fn().mockResolvedValue({ success: true }),
		syncError: null,
		reportError: vi.fn()
	}
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

	it('should not increment episodes beyond total episodes when total is known', async () => {
		await userListStore.addToList(30, 'watching', 'Test 30', 'Test 30', null);
		const entry = userListStore.getEntry(30);
		if (entry) entry.numEpisodes = 12;

		userListStore.setEpisodeCount(30, 12);
		expect(userListStore.getEntry(30)?.numWatchedEpisodes).toBe(12);

		userListStore.incrementEpisode(30);
		expect(userListStore.getEntry(30)?.numWatchedEpisodes).toBe(12);

		userListStore.setEpisodeCount(30, 999);
		expect(userListStore.getEntry(30)?.numWatchedEpisodes).toBe(12);

		userListStore.setEpisodeCount(30, -5);
		expect(userListStore.getEntry(30)?.numWatchedEpisodes).toBe(0);
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

		// But mergeSyncQueue should be called to schedule a retry
		expect(mergeSyncQueue).toHaveBeenCalledWith(
			expect.objectContaining({
				malId: 4,
				payload: { _delete: true }
			})
		);
	});

	it('should process persistent queue sequentially on flushPersistentQueue', async () => {
		vi.mocked(getSyncQueue).mockResolvedValueOnce([
			{ malId: 5, payload: { status: 'completed' }, timestamp: Date.now() }
		]);

		await userListStore.flushPersistentQueue();

		expect(updateAnimeStatus).toHaveBeenCalledWith(5, { status: 'completed' });
		expect(deleteSyncQueue).toHaveBeenCalledWith(5, expect.any(Number));
	});

	it('should handle IDB read failure gracefully in loadFromCache', async () => {
		const { getAllEntries } = await import('$lib/cache/userlist.cache');
		vi.mocked(getAllEntries).mockRejectedValueOnce(new Error('IDB Failure'));

		await expect(userListStore.loadFromCache()).resolves.not.toThrow();
		expect(userListStore.initialized).toBe(true);
	});

	it('should catch flushPersistentQueue failure in syncFromRemote and return a cache error', async () => {
		const { getSyncQueue } = await import('$lib/cache/userlist.cache');
		vi.mocked(getSyncQueue).mockRejectedValueOnce(new Error('Queue Read Failed'));

		const result = await userListStore.syncFromRemote();
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('cache');
			expect(result.error.message).toBe('Queue Read Failed');
		}
	});

	it('should skip expired (>7 day) entries in flushPersistentQueue', async () => {
		const now = Date.now();
		const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
		const expiredTime = now - (SEVEN_DAYS_MS + 1000); // 7 days + 1s ago
		const validTime = now - 24 * 60 * 60 * 1000; // 1 day ago

		const { getSyncQueue, deleteSyncQueue } = await import('$lib/cache/userlist.cache');
		vi.mocked(getSyncQueue).mockResolvedValueOnce([
			{ malId: 10, payload: { status: 'completed' }, timestamp: expiredTime },
			{ malId: 11, payload: { status: 'watching' }, timestamp: validTime }
		]);

		await userListStore.flushPersistentQueue();

		expect(deleteSyncQueue).toHaveBeenCalledWith(10);
		expect(updateAnimeStatus).not.toHaveBeenCalledWith(10, expect.any(Object));

		expect(updateAnimeStatus).toHaveBeenCalledWith(11, { status: 'watching' });
		expect(deleteSyncQueue).toHaveBeenCalledWith(11, validTime);
	});

	it('should move plan_to_watch to watching on increment with a combined payload', async () => {
		await userListStore.addToList(20, 'plan_to_watch', 'Test 20', 'Test 20', null);
		userListStore.incrementEpisode(20);

		expect(userListStore.getEntry(20)?.status).toBe('watching');
		expect(userListStore.getEntry(20)?.numWatchedEpisodes).toBe(1);

		userListStore.flushPendingSyncs();
		await new Promise((r) => setTimeout(r, 0));

		expect(updateAnimeStatus).toHaveBeenCalledWith(20, {
			num_watched_episodes: 1,
			status: 'watching'
		});
	});

	it('should not bump updatedAt on optimistic edit', async () => {
		await userListStore.addToList(21, 'watching', 'Test 21', 'Test 21', null);
		const before = userListStore.getEntry(21)?.updatedAt;
		userListStore.setEpisodeCount(21, 3);

		expect(userListStore.getEntry(21)?.numWatchedEpisodes).toBe(3);
		expect(userListStore.getEntry(21)?.updatedAt).toBe(before);
	});

	it('should bump updatedAt when the queued edit lands', async () => {
		await userListStore.addToList(22, 'watching', 'Test 22', 'Test 22', null);
		const rec = userListStore.getEntry(22);
		if (rec) rec.updatedAt = '2020-01-01T00:00:00.000Z';

		const { getSyncQueue } = await import('$lib/cache/userlist.cache');
		vi.mocked(getSyncQueue).mockResolvedValueOnce([
			{ malId: 22, payload: { num_watched_episodes: 2 }, timestamp: Date.now() }
		]);

		await userListStore.flushPersistentQueue();

		expect(updateAnimeStatus).toHaveBeenCalledWith(22, { num_watched_episodes: 2 });
		expect(userListStore.getEntry(22)?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
	});

	it('sends the merged queued payload so an earlier unsynced edit is not dropped', async () => {
		await userListStore.addToList(30, 'watching', 'Test 30', 'Test 30', null);
		vi.mocked(updateAnimeStatus).mockClear();

		// An earlier episode edit failed to sync and is still queued; the score edit merges with it.
		vi.mocked(mergeSyncQueue).mockResolvedValueOnce({
			ok: true,
			value: { malId: 30, payload: { num_watched_episodes: 4, score: 9 }, timestamp: 123 }
		});
		userListStore.setScore(30, 9);
		userListStore.flushPendingSyncs();
		await new Promise((r) => setTimeout(r, 0));

		expect(updateAnimeStatus).toHaveBeenCalledWith(30, { num_watched_episodes: 4, score: 9 });
		// Ack only deletes the exact record that was sent.
		expect(deleteSyncQueue).toHaveBeenCalledWith(30, 123);
	});
});
