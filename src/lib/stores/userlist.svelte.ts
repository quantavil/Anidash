// ─── User List Store (Svelte 5 Runes) ───
// Single source of truth for the user's anime list.
// All mutations are optimistic: update locally, sync to MAL in background.

import { browser } from '$app/environment';

import { toast } from 'svelte-sonner';

import {
	getAllEntries,
	putEntry,
	removeEntry,
	mergeSyncQueue,
	getSyncQueue,
	deleteSyncQueue
} from '$lib/cache/userlist.cache';
import { updateAnimeStatus, getAnimeDetail, deleteAnimeStatus } from '$lib/api/mal';
import { putAnime } from '$lib/cache/anime.cache';
import { syncStore } from './sync.svelte.ts';
import { debounce, type DebouncedFn } from '$lib/utils/debounce';
import { SvelteMap } from 'svelte/reactivity';
import { ok, err, type Result } from '$lib/api/result';
import type { UserListRecord, AnimeStatus } from '$lib/cache/db';
import { logger } from '$lib/utils/logger';

/** Show an error toast. Centralizes what used to be repeated dynamic imports. */
function notifyError(message: string, options?: { id?: string }): void {
	toast.error(message, options);
}

// ─── Store ───

function createUserListStore() {
	let entries = $state.raw<Record<number, UserListRecord>>({});
	let loading = $state(true);
	let initialized = $state(false);

	// Debounced MAL sync functions per anime (prevents rapid-fire PATCH)
	const pendingSyncs = new SvelteMap<number, DebouncedFn<() => void>>();
	// Accumulated MAL payloads per anime, merged across rapid edits and flushed
	// when the debounce fires. Prevents a later edit from dropping an earlier one.
	const pendingPayloads = new SvelteMap<number, Record<string, unknown>>();

	// Global complete confirmation dialog state
	let showCompleteDialog = $state(false);
	let completeTargetId = $state<number | null>(null);

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
			logger.error('Failed to load list from cache:', e);
		}
		loading = false;
		initialized = true;
	}

	async function syncFromRemote(): Promise<Result<void>> {
		try {
			await flushPersistentQueue();
		} catch (e) {
			logger.error('Failed to flush persistent queue in syncFromRemote:', e);
			return err({
				type: 'cache',
				message: e instanceof Error ? e.message : 'Failed to flush persistent queue'
			});
		}
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

		// 1. Apply locally with full re-assignment (Svelte 5 reactivity)
		const updated = {
			...entry,
			...localChanges,
			updatedAt: new Date().toISOString()
		} as UserListRecord;
		entries = {
			...entries,
			[malId]: updated
		};

		// 2. Update IDB
		putEntry($state.snapshot(updated))
			.then((res) => {
				if (!res.ok) {
					logger.error('Failed to update IndexedDB:', res.error);
					notifyError('Local database write failed. Changes may not be saved offline.');
				}
			})
			.catch((e) => {
				logger.error('Failed to update IndexedDB:', e);
				notifyError('Local database write failed. Changes may not be saved offline.');
			});

		// 3. Merge this change into any pending payload for the anime so rapid edits
		//    to different fields are all synced, not just the most recent one.
		pendingPayloads.set(malId, { ...(pendingPayloads.get(malId) ?? {}), ...malPayload });

		// 4. Debounced MAL sync (one reused debounce per anime)
		let syncFn = pendingSyncs.get(malId);
		if (!syncFn) {
			syncFn = debounce(() => {
				void flushSync(malId);
			}, 800);
			pendingSyncs.set(malId, syncFn);
		}
		syncFn();
	}

	/** Flush the accumulated payload for an anime to the offline queue, then MAL. */
	async function flushSync(malId: number): Promise<void> {
		const payload = pendingPayloads.get(malId);
		if (!payload) return;
		pendingPayloads.delete(malId);

		// Persist to the offline queue first, merging with any change already queued.
		const queueRes = await mergeSyncQueue({ malId, payload, timestamp: Date.now() });
		if (!queueRes.ok) {
			logger.error('Failed to save to sync queue:', queueRes.error);
			notifyError('Offline sync failed. Your changes could not be queued.');
			return;
		}

		// If explicitly offline, leave it in the queue for later.
		if (typeof navigator !== 'undefined' && !navigator.onLine) return;

		const result = await updateAnimeStatus(malId, payload);
		if (result.ok) {
			const deleteRes = await deleteSyncQueue(malId);
			if (!deleteRes.ok) {
				logger.error('Failed to delete from sync queue after successful sync:', deleteRes.error);
			}
		} else {
			// Show error, but LEAVE IN QUEUE. It will be flushed later.
			syncStore.reportError(result.error);
			notifyError('Network error. Edit saved locally & will sync later.', {
				id: 'offline-sync-error'
			});
		}
	}

	function cancelPendingSync(malId: number): void {
		pendingPayloads.delete(malId);
		const existing = pendingSyncs.get(malId);
		if (existing) {
			existing.cancel();
			pendingSyncs.delete(malId);
		}
	}

	// ─── Status Change ───

	function setStatus(malId: number, newStatus: AnimeStatus): void {
		const entry = entries[malId];
		if (entry && newStatus === 'completed' && entry.numEpisodes > 0) {
			optimisticUpdate(
				malId,
				{
					status: 'completed' as AnimeStatus,
					numWatchedEpisodes: entry.numEpisodes
				},
				{
					status: 'completed',
					num_watched_episodes: entry.numEpisodes
				}
			);
		} else {
			optimisticUpdate(malId, { status: newStatus }, { status: newStatus });
		}
	}

	// ─── Score Change ───

	function setScore(malId: number, score: number): void {
		optimisticUpdate(malId, { score }, { score });
	}

	// ─── Episode Increment ───

	function incrementEpisode(malId: number): { watched: number; total: number } | null {
		const entry = entries[malId];
		if (!entry) return null;

		// Guard: do not increment past total episodes if known
		if (entry.numEpisodes > 0 && entry.numWatchedEpisodes >= entry.numEpisodes) {
			return { watched: entry.numWatchedEpisodes, total: entry.numEpisodes };
		}

		const newCount = entry.numWatchedEpisodes + 1;
		optimisticUpdate(
			malId,
			{
				numWatchedEpisodes: newCount
			},
			{ num_watched_episodes: newCount }
		);

		return { watched: newCount, total: entry.numEpisodes };
	}

	function setEpisodeCount(malId: number, count: number): void {
		const entry = entries[malId];
		if (!entry) return;

		let validCount = Math.max(0, count);
		if (entry.numEpisodes > 0 && validCount > entry.numEpisodes) {
			validCount = entry.numEpisodes;
		}

		optimisticUpdate(
			malId,
			{
				numWatchedEpisodes: validCount
			},
			{ num_watched_episodes: validCount }
		);
	}

	// ─── Remove from List ───

	async function removeFromList(malId: number): Promise<Result<void>> {
		cancelPendingSync(malId);
		const entry = entries[malId];
		if (!entry) return err({ type: 'cache', message: 'Entry not found' });

		// 1. Optimistic local remove with full re-assignment
		const newEntries = { ...entries };
		delete newEntries[malId];
		entries = newEntries;

		const removeRes = await removeEntry(malId);
		if (!removeRes.ok) {
			logger.error(`Failed to remove entry ${malId} from IndexedDB:`, removeRes.error);
			notifyError('Local database write failed. Entry could not be deleted.');
			return err(removeRes.error);
		}

		// 2. Sync to MAL
		const result = await deleteAnimeStatus(malId);

		if (!result.ok) {
			logger.warn(`Failed to sync deletion for ${malId} to MAL:`, result.error);
			// Queue for retry; a delete supersedes any pending edit for this anime.
			const queueRes = await mergeSyncQueue({
				malId,
				payload: { _delete: true },
				timestamp: Date.now()
			});
			if (!queueRes.ok) {
				logger.error(`Failed to queue deletion for ${malId}:`, queueRes.error);
				notifyError('Offline sync failed. Deletion could not be queued.');
				return err(queueRes.error);
			}
		}

		return ok(undefined);
	}

	// ─── Add to List (from browse/detail) ───

	async function addToList(
		malId: number,
		status: AnimeStatus,
		titleEnglish?: string | null,
		fallbackTitle?: string,
		fallbackPicture?: string | null,
		genres?: string[] | { id: number; name: string }[]
	): Promise<Result<void>> {
		const existing = getEntry(malId);
		let finalEpisodes = existing?.numEpisodes ?? 0;

		const normalizedGenres: { id: number; name: string }[] = [];
		if (genres) {
			for (let i = 0; i < genres.length; i++) {
				const g = genres[i];
				if (typeof g === 'string') {
					normalizedGenres.push({ id: i, name: g });
				} else if (g && typeof g === 'object' && 'name' in g) {
					normalizedGenres.push(g);
				}
			}
		}

		// 1. Create the local list entry immediately (optimistic UI)
		const newEntry: UserListRecord = {
			malId,
			title: fallbackTitle ?? existing?.title ?? '',
			titleEnglish: titleEnglish ?? existing?.titleEnglish ?? null,
			mainPicture: fallbackPicture
				? { medium: fallbackPicture, large: fallbackPicture }
				: (existing?.mainPicture ?? null),
			mean: existing?.mean ?? null,
			numEpisodes: finalEpisodes,
			genres: normalizedGenres.length > 0 ? normalizedGenres : (existing?.genres ?? []),
			studios: existing?.studios ?? [],
			startSeason: existing?.startSeason ?? { year: null, season: null },
			mediaType: existing?.mediaType ?? 'unknown',
			animeStatus: existing?.animeStatus ?? 'unknown',
			numListUsers: existing?.numListUsers ?? 0,
			numScoringUsers: existing?.numScoringUsers ?? 0,
			status,
			score: existing?.score ?? 0,
			numWatchedEpisodes:
				status === 'completed' && finalEpisodes > 0
					? finalEpisodes
					: (existing?.numWatchedEpisodes ?? 0),
			isRewatching: false,
			updatedAt: new Date().toISOString(),
			startDate: null,
			finishDate: null,
			isLocalOnly: true
		};

		entries = {
			...entries,
			[malId]: newEntry
		};

		// 2. Persist to IndexedDB
		const putRes = await putEntry($state.snapshot(newEntry));
		if (!putRes.ok) {
			logger.error(`Failed to add entry ${malId} to IndexedDB:`, putRes.error);
			notifyError('Local database write failed. Entry could not be added.');
			return err(putRes.error);
		}

		// 3. Prepare payload for MAL
		const payload: Record<string, unknown> = { status };
		if (status === 'completed' && finalEpisodes > 0) {
			payload.num_watched_episodes = finalEpisodes;
		}

		// If explicitly offline, queue for later sync and complete
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			await mergeSyncQueue({ malId, payload, timestamp: Date.now() });
			return ok(undefined);
		}

		// 4. Update MAL with offline queue fallback
		const result = await updateAnimeStatus(malId, payload);
		if (!result.ok) {
			await mergeSyncQueue({ malId, payload, timestamp: Date.now() });
			notifyError('Sync delayed. Edit saved locally & queued for sync.', {
				id: 'offline-sync-error'
			});
		}

		// 5. Background detail enrichment
		void (async () => {
			try {
				const detailResult = await getAnimeDetail(malId);
				if (detailResult.ok) {
					const d = detailResult.value;
					if (titleEnglish) d.titleEnglish = titleEnglish;
					finalEpisodes = d.numEpisodes;
					if (status === 'completed' && finalEpisodes > 0) {
						payload.num_watched_episodes = finalEpisodes;
						await updateAnimeStatus(malId, payload);
					}

					const enrichedEntry: UserListRecord = {
						...newEntry,
						title: d.title,
						titleEnglish: d.titleEnglish || titleEnglish || null,
						mainPicture: d.mainPicture,
						mean: d.mean,
						numEpisodes: d.numEpisodes,
						genres: d.genres,
						studios: d.studios,
						startSeason: d.startSeason,
						mediaType: d.mediaType,
						animeStatus: d.animeStatus,
						numListUsers: d.numListUsers,
						numScoringUsers: d.numScoringUsers,
						numWatchedEpisodes:
							status === 'completed' && finalEpisodes > 0
								? finalEpisodes
								: newEntry.numWatchedEpisodes,
						isLocalOnly: false
					};

					entries = { ...entries, [malId]: enrichedEntry };
					await putEntry($state.snapshot(enrichedEntry));
					await putAnime(d);
				}
			} catch (e) {
				logger.error('Background detail sync failed in addToList:', e);
			}
		})();

		return ok(undefined);
	}

	// ─── Flush all pending syncs (call on page hide) ───

	function flushPendingSyncs(): void {
		for (const [, syncFn] of pendingSyncs) {
			syncFn.flush();
		}
	}

	// ─── Flush persistent offline queue ───

	let isFlushingQueue = false;

	async function flushPersistentQueue(): Promise<void> {
		// Guard against concurrent flushes (online event, mount, manual sync).
		if (isFlushingQueue) return;
		isFlushingQueue = true;
		try {
			await flushPersistentQueueInner();
		} finally {
			isFlushingQueue = false;
		}
	}

	async function flushPersistentQueueInner(): Promise<void> {
		const queue = await getSyncQueue();
		if (queue.length === 0) return;

		const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
		const now = Date.now();
		let retryDelay = 1000; // start with 1s backoff

		for (const record of queue) {
			// TTL Check: purge if older than 7 days
			if (now - record.timestamp > SEVEN_DAYS_MS) {
				await deleteSyncQueue(record.malId);
				continue;
			}

			let result: Result<void>;
			const payload = record.payload as Record<string, unknown>;

			if (payload._delete) {
				result = await deleteAnimeStatus(record.malId);
			} else {
				result = await updateAnimeStatus(record.malId, payload);
			}

			if (result.ok) {
				await deleteSyncQueue(record.malId);
				retryDelay = 1000; // Reset backoff on success
			} else {
				// Drop the payload if it's a persistent bad request
				if (
					result.error?.type === 'api' &&
					(result.error.status === 400 || result.error.status === 404)
				) {
					await deleteSyncQueue(record.malId);
				} else {
					// Exponential backoff before next attempt/break
					await new Promise((r) => setTimeout(r, retryDelay));
					retryDelay *= 2; // Double the delay
					break; // Stop flushing if rate limited or network is still down
				}
			}
		}
	}

	if (browser) {
		window.addEventListener('online', () => {
			flushPersistentQueue().catch(logger.error);
		});
	}

	function clear(): void {
		entries = {};
		initialized = false;
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
		get showCompleteDialog() {
			return showCompleteDialog;
		},
		set showCompleteDialog(val) {
			showCompleteDialog = val;
		},
		get completeTargetId() {
			return completeTargetId;
		},
		set completeTargetId(val) {
			completeTargetId = val;
		},
		triggerCompletePrompt(malId: number) {
			completeTargetId = malId;
			showCompleteDialog = true;
		},

		clear,
		getEntry,
		loadFromCache,
		syncFromRemote,
		setStatus,
		setScore,
		incrementEpisode,
		setEpisodeCount,
		removeFromList,
		addToList,
		flushPendingSyncs,
		flushPersistentQueue
	};
}

export const userListStore = createUserListStore();
