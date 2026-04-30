// ─── User List Store (Svelte 5 Runes) ───
// Single source of truth for the user's anime list.
// All mutations are optimistic: update locally, sync to MAL in background.

import {
	getAllEntries,
	putEntry,
	removeEntry,
	putSyncQueue,
	getSyncQueue,
	deleteSyncQueue
} from '$lib/cache/userlist.cache';
import { updateAnimeStatus, getAnimeDetail, deleteAnimeStatus } from '$lib/api/mal';
import { putAnime } from '$lib/cache/anime.cache';
import { syncStore } from './sync.svelte.ts';
import { debounce, type DebouncedFn } from '$lib/utils/debounce';
import { ok, err, type Result } from '$lib/api/result';
import type { AppError } from '$lib/api/result';
import type { UserListRecord, AnimeStatus } from '$lib/cache/db';
import { logger } from '$lib/utils/logger';

// ─── Store ───

function createUserListStore() {
	let entries = $state<Record<number, UserListRecord>>({});
	let loading = $state(true);
	let initialized = $state(false);

	// Debounced MAL sync functions per anime (prevents rapid-fire PATCH)
	const pendingSyncs = new Map<number, DebouncedFn<() => void>>();

	// ─── Derived ───

	const allEntries = $derived(Object.values(entries));

	const watching = $derived(allEntries.filter((e) => e.status === 'watching'));
	const completed = $derived(allEntries.filter((e) => e.status === 'completed'));
	const onHold = $derived(allEntries.filter((e) => e.status === 'on_hold'));
	const dropped = $derived(allEntries.filter((e) => e.status === 'dropped'));
	const planToWatch = $derived(allEntries.filter((e) => e.status === 'plan_to_watch'));

	const totalCount = $derived(allEntries.length);

	const statusCounts = $derived(
		allEntries.reduce(
			(acc, e) => {
				const s = e.status as AnimeStatus;
				if (acc[s] !== undefined) acc[s]++;
				return acc;
			},
			{
				watching: 0,
				completed: 0,
				on_hold: 0,
				dropped: 0,
				plan_to_watch: 0
			}
		)
	);

	function getEntry(malId: number): UserListRecord | undefined {
		return entries[malId];
	}

	// ─── Initialize ───

	async function loadFromCache(): Promise<void> {
		loading = true;
		try {
			const cached = await getAllEntries();
			const newEntries: Record<number, UserListRecord> = {};
			for (const e of cached) {
				newEntries[e.malId] = e;
			}
			entries = newEntries;
		} catch (e) {
			console.error('Failed to load list from cache:', e);
		}
		loading = false;
		initialized = true;
	}

	async function syncFromRemote(): Promise<Result<void>> {
		await flushPersistentQueue();
		const result = await syncStore.fullSync();
		if (result.success) {
			await loadFromCache();
			return ok(undefined);
		}
		return err(syncStore.syncError ?? { type: 'network', message: 'Sync failed' });
	}

	// ─── Optimistic Mutations ───

	function optimisticUpdate(
		malId: number,
		localChanges: Partial<UserListRecord>,
		malPayload: Record<string, unknown>
	): void {
		const entry = entries[malId];
		if (!entry) return;

		// 1. Apply locally by mutating the proxied state object
		const updated = { ...entry, ...localChanges } as UserListRecord;
		entries[malId] = updated;

		// 2. Update IDB
		putEntry($state.snapshot(updated)).catch(console.error);

		// 3. Debounced MAL sync
		cancelPendingSync(malId);
		const syncFn = debounce(async () => {
			// 3a. Save to persistent offline queue immediately
			await putSyncQueue({
				malId,
				payload: malPayload,
				timestamp: Date.now()
			});

			// If explicitly offline, just leave it in queue
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				pendingSyncs.delete(malId);
				return;
			}

			// 3b. Attempt sync
			const result = await updateAnimeStatus(malId, malPayload);
			if (result.ok) {
				// Success — remove from queue
				await deleteSyncQueue(malId);
			} else {
				// Show error, but LEAVE IN QUEUE. It will be flushed later.
				syncStore.syncError = result.error;
				import('svelte-sonner').then(({ toast }) => {
					toast.error('Network error. Edit saved locally & will sync later.');
				});
			}
			pendingSyncs.delete(malId);
		}, 800);

		pendingSyncs.set(malId, syncFn);
		syncFn();
	}

	function cancelPendingSync(malId: number): void {
		const existing = pendingSyncs.get(malId);
		if (existing) {
			existing.cancel();
			pendingSyncs.delete(malId);
		}
	}

	// ─── Status Change ───

	function setStatus(malId: number, newStatus: AnimeStatus): void {
		optimisticUpdate(
			malId,
			{ status: newStatus, updatedAt: new Date().toISOString() },
			{ status: newStatus }
		);
	}

	// ─── Score Change ───

	function setScore(malId: number, score: number): void {
		optimisticUpdate(malId, { score }, { score });
	}

	// ─── Episode Increment ───

	function incrementEpisode(malId: number): { watched: number; total: number } | null {
		const entry = entries[malId];
		if (!entry) return null;

		const newCount = entry.numWatchedEpisodes + 1;
		optimisticUpdate(
			malId,
			{
				numWatchedEpisodes: newCount,
				updatedAt: new Date().toISOString()
			},
			{ num_watched_episodes: newCount }
		);

		return { watched: newCount, total: entry.numEpisodes };
	}

	function setEpisodeCount(malId: number, count: number): void {
		const entry = entries[malId];
		if (!entry) return;

		optimisticUpdate(
			malId,
			{
				numWatchedEpisodes: count,
				updatedAt: new Date().toISOString()
			},
			{ num_watched_episodes: count }
		);
	}

	// ─── Mark Completed ───

	function markCompleted(malId: number): void {
		const entry = entries[malId];
		if (!entry) return;

		optimisticUpdate(
			malId,
			{
				status: 'completed' as AnimeStatus,
				numWatchedEpisodes: entry.numEpisodes,
				score: entry.score,
				updatedAt: new Date().toISOString()
			},
			{
				status: 'completed',
				num_watched_episodes: entry.numEpisodes
			}
		);
	}

	// ─── Remove from List ───

	async function removeFromList(malId: number): Promise<Result<void>> {
		const entry = entries[malId];
		if (!entry) return err({ type: 'cache', message: 'Entry not found' });

		// 1. Optimistic local remove
		delete entries[malId];
		await removeEntry(malId);

		// 2. Sync to MAL
		const result = await deleteAnimeStatus(malId);

		if (!result.ok) {
			logger.warn(`Failed to sync deletion for ${malId} to MAL:`, result.error);
			// Queue for retry on next sync flush
			await putSyncQueue({ malId, payload: { _delete: true }, timestamp: Date.now() });
		}

		return ok(undefined);
	}

	// ─── Add to List (from browse/detail) ───

	async function addToList(
		malId: number,
		status: AnimeStatus,
		titleEnglish?: string | null,
		fallbackTitle?: string,
		fallbackPicture?: string | null
	): Promise<Result<void>> {
		// First, update MAL
		const result = await updateAnimeStatus(malId, { status });
		if (!result.ok) return result;

		// Then fetch the anime detail to populate our cache
		const detailResult = await getAnimeDetail(malId);
		if (detailResult.ok) {
			if (titleEnglish) {
				detailResult.value.titleEnglish = titleEnglish;
			}
			await putAnime(detailResult.value);
		}

		// Create a local list entry
		const newEntry: UserListRecord = {
			malId,
			title: fallbackTitle ?? '',
			titleEnglish: titleEnglish ?? null,
			mainPicture: fallbackPicture ? { medium: fallbackPicture, large: fallbackPicture } : null,
			mean: null,
			numEpisodes: 0,
			genres: [],
			studios: [],
			startSeason: { year: null, season: null },
			mediaType: 'unknown',
			animeStatus: 'unknown',
			numListUsers: 0,
			numScoringUsers: 0,
			status,
			score: 0,
			numWatchedEpisodes: 0,
			isRewatching: false,
			updatedAt: new Date().toISOString(),
			startDate: null,
			finishDate: null
		};

		// If we got detail, use it (overrides fallbacks)
		if (detailResult.ok) {
			const d = detailResult.value;
			newEntry.title = d.title;
			newEntry.titleEnglish = d.titleEnglish;
			newEntry.mainPicture = d.mainPicture;
			newEntry.mean = d.mean;
			newEntry.numEpisodes = d.numEpisodes;
			newEntry.genres = d.genres;
			newEntry.studios = d.studios;
			newEntry.startSeason = d.startSeason;
			newEntry.mediaType = d.mediaType;
			newEntry.animeStatus = d.animeStatus;
			newEntry.numListUsers = d.numListUsers;
			newEntry.numScoringUsers = d.numScoringUsers;
		}

		entries[malId] = newEntry;
		await putEntry($state.snapshot(newEntry));

		return ok(undefined);
	}

	// ─── Flush all pending syncs (call on page hide) ───

	function flushPendingSyncs(): void {
		for (const [, syncFn] of pendingSyncs) {
			syncFn.flush();
		}
	}

	// ─── Flush persistent offline queue ───

	async function flushPersistentQueue(): Promise<void> {
		const queue = await getSyncQueue();
		if (queue.length === 0) return;

		for (const record of queue) {
			let result: Result<void>;
			const payload = record.payload as Record<string, unknown>;

			if (payload._delete) {
				result = await deleteAnimeStatus(record.malId);
			} else {
				result = await updateAnimeStatus(record.malId, payload);
			}

			if (result.ok) {
				await deleteSyncQueue(record.malId);
			} else {
				// Drop the payload if it's a persistent bad request, else break
				if (
					result.error?.type === 'api' &&
					(result.error.status === 400 || result.error.status === 404)
				) {
					await deleteSyncQueue(record.malId);
				} else {
					break; // Stop flushing if rate limited or network is still down
				}
			}
		}
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('online', () => {
			flushPersistentQueue().catch(console.error);
		});
	}

	return {
		get entries() {
			return entries;
		},
		get allEntries() {
			return allEntries;
		},
		get watching() {
			return watching;
		},
		get completed() {
			return completed;
		},
		get onHold() {
			return onHold;
		},
		get dropped() {
			return dropped;
		},
		get planToWatch() {
			return planToWatch;
		},
		get totalCount() {
			return totalCount;
		},
		get statusCounts() {
			return statusCounts;
		},
		get loading() {
			return loading;
		},
		get initialized() {
			return initialized;
		},

		getEntry,
		loadFromCache,
		syncFromRemote,
		setStatus,
		setScore,
		incrementEpisode,
		setEpisodeCount,
		markCompleted,
		removeFromList,
		addToList,
		flushPendingSyncs,
		flushPersistentQueue
	};
}

export const userListStore = createUserListStore();
