// ─── User List Store (Svelte 5 Runes) ───
// Single source of truth for the user's anime list.
// All mutations are optimistic: update locally, sync to MAL in background.

import {
	getAllEntries,
	getListEntry,
	putEntry,
	updateEntry,
	removeEntry
} from '$lib/cache/userlist.cache';
import { updateAnimeStatus, getAnimeDetail } from '$lib/api/mal';
import { putAnime } from '$lib/cache/anime.cache';
import { syncStore } from './sync.svelte.ts';
import { debounce, type DebouncedFn } from '$lib/utils/debounce';
import { ok, err, type Result } from '$lib/api/result';
import type { AppError } from '$lib/api/result';
import type { UserListRecord } from '$lib/cache/db';

type AnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

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

	const statusCounts = $derived({
		watching: watching.length,
		completed: completed.length,
		on_hold: onHold.length,
		dropped: dropped.length,
		plan_to_watch: planToWatch.length
	});

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
			const result = await updateAnimeStatus(malId, malPayload);
			if (!result.ok) {
				// Rollback: reload from cache
				const cached = await getListEntry(malId);
				if (cached && entries[malId]) {
					entries[malId] = cached;
				}
				// Show error via syncStore
				syncStore.syncError = result.error;
				import('svelte-sonner').then(({ toast }) => {
					toast.error('Failed to sync changes — will retry on next sync');
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
		const result = await import('$lib/api/mal').then((m) => m.deleteAnimeStatus(malId));

		if (!result.ok) {
			console.warn(`Failed to sync deletion for ${malId} to MAL:`, result.error);
			// We don't rollback here as it's better to stay deleted locally and try again on next sync
		}

		return ok(undefined);
	}

	// ─── Add to List (from browse/detail) ───

	async function addToList(malId: number, status: AnimeStatus): Promise<Result<void>> {
		// First, update MAL
		const result = await updateAnimeStatus(malId, { status });
		if (!result.ok) return result;

		// Then fetch the anime detail to populate our cache
		const detailResult = await getAnimeDetail(malId);
		if (detailResult.ok) {
			await putAnime(detailResult.value);
		}

		// Create a local list entry
		const newEntry: UserListRecord = {
			malId,
			title: '',
			mainPicture: null,
			mean: null,
			numEpisodes: 0,
			genres: [],
			studios: [],
			startSeason: { year: null, season: null },
			mediaType: 'unknown',
			animeStatus: 'unknown',
			status,
			score: 0,
			numWatchedEpisodes: 0,
			isRewatching: false,
			updatedAt: new Date().toISOString(),
			startDate: null,
			finishDate: null
		};

		// If we got detail, use it
		if (detailResult.ok) {
			const d = detailResult.value;
			newEntry.title = d.title;
			newEntry.mainPicture = d.mainPicture;
			newEntry.mean = d.mean;
			newEntry.numEpisodes = d.numEpisodes;
			newEntry.genres = d.genres;
			newEntry.studios = d.studios;
			newEntry.startSeason = d.startSeason;
			newEntry.mediaType = d.mediaType;
			newEntry.animeStatus = d.animeStatus;
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
		flushPendingSyncs
	};
}

export const userListStore = createUserListStore();
