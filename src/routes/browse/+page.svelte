<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getUrlParam, setUrlParams } from '$lib/utils/url-state';
	import { searchAnime as malSearchAnime, getRanking } from '$lib/api/mal';
	import {
		mapMalNodeToDisplay,
		mapUserListRecordToDisplay,
		mergeLocalWithOnline,
		type DisplayAnime
	} from '$lib/utils/types';
	import { SlidersHorizontal, LoaderCircle, SearchX } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import SearchInput from '$lib/ui/SearchInput.svelte';
	import SearchResultCard from '$lib/ui/SearchResultCard.svelte';
	import AnimeCardSkeleton from '$lib/ui/skeletons/AnimeCardSkeleton.svelte';
	import RecommenderWidgets from '$lib/ui/RecommenderWidgets.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { debounce } from '$lib/utils/debounce';
	import {
		MEDIA_TYPE_FILTER_OPTIONS,
		ANIME_GENRES,
		NSFW_GENRE_NAMES,
		POPULAR_CACHE_KEY,
		POPULAR_CACHE_TTL_MS
	} from '$lib/constants';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { putEntry } from '$lib/cache/userlist.cache';
	import { logger } from '$lib/utils/logger';
	import { matchesFuzzy, getSearchKeyword } from '$lib/utils/search';
	import { getPopularCache, setPopularCache } from '$lib/cache/meta.cache';

	// ─── Constants ───

	const PAGE_SIZE = 25;
	const MIN_QUERY_LEN = 2; // MAL v2 rejects shorter queries

	/** Blank-query browsing maps the type filter onto MAL ranking types; ONA has no
	    ranking type and is client-filtered instead. */
	const RANKING_TYPE_BY_FILTER: Record<string, string> = {
		tv: 'tv',
		movie: 'movie',
		ova: 'ova',
		special: 'special'
	};

	const SORT_TO_MAL: Record<string, { orderBy?: string; sortDir?: string }> = {
		relevance: {},
		popularity: { orderBy: 'members', sortDir: 'desc' },
		score: { orderBy: 'score', sortDir: 'desc' },
		title: { orderBy: 'title', sortDir: 'asc' },
		start_date: { orderBy: 'start_date', sortDir: 'desc' }
	};

	const SORTS = [
		{ value: 'relevance', label: 'Relevance' },
		{ value: 'popularity', label: 'Popularity' },
		{ value: 'score', label: 'Rating' },
		{ value: 'title', label: 'Title A-Z' },
		{ value: 'start_date', label: 'Newest First' }
	];

	const TYPES = MEDIA_TYPE_FILTER_OPTIONS;
	const GENRES = ANIME_GENRES;

	// ─── URL State ───

	const query = $derived(getUrlParam(page.url, 'q', '').trim());
	const filterType = $derived(getUrlParam(page.url, 'type', ''));
	const filterGenre = $derived(getUrlParam(page.url, 'genre', ''));
	const filterSort = $derived(getUrlParam(page.url, 'sort', query ? 'relevance' : 'popularity'));
	const filterSfw = $derived(getUrlParam(page.url, 'sfw', 'true') === 'true');

	const hasQuery = $derived(query.length >= MIN_QUERY_LEN);
	const isLandingView = $derived(!query);

	// ─── State ───

	let results = $state.raw<DisplayAnime[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let hasNextPage = $state(false);
	let loadingMore = $state(false);
	let isDebouncing = $state(false);
	let currentSearchId = 0;
	let fetchFailed = $state(false);

	let searchInput = $derived(getUrlParam(page.url, 'q', ''));

	// ─── Search ───

	const debouncedSetFilter = debounce((val: string) => {
		setFilter('q', val);
		isDebouncing = false;
	}, 400);

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			debouncedSetFilter.cancel();
			isDebouncing = false;
			setFilter('q', searchInput);
		} else if (e.key === 'Escape' && searchInput) {
			clearSearch();
		}
	}

	/** Local list entries that satisfy the active filters (type/genre/sfw). */
	function localEntryPassesFilters(e: (typeof userListStore.allEntries)[number]): boolean {
		if (filterType && e.mediaType.toLowerCase() !== filterType.toLowerCase()) return false;
		if (filterGenre && !e.genres.some((g) => String(g.id) === filterGenre)) return false;
		if (filterSfw && e.genres.some((g) => NSFW_GENRE_NAMES.includes(g.name))) return false;
		return true;
	}

	const filteredResults = $derived.by(() => {
		let online = results;

		// Dub filtering is reactive — the dub set may finish loading after results do.
		if (dubStore.dubMode && dubStore.isReady) {
			online = online.filter((a) => dubStore.hasDub(a.malId));
		}

		if (!hasQuery) {
			// Landing view: cover what MAL ranking can't express server-side (ONA + genre).
			const genreName = GENRES.find((g) => g.id === Number(filterGenre))?.name;
			if (filterType === 'ona' || genreName || !filterSfw) {
				online = online.filter((a) => {
					if (filterSfw && NSFW_GENRE_NAMES.some((n) => a.genres.includes(n))) return false;
					if (filterType === 'ona' && a.mediaType !== 'ona') return false;
					if (genreName && !a.genres.includes(genreName)) return false;
					return true;
				});
			}
			return online;
		}

		const localMatches = userListStore.allEntries
			.filter((e) => matchesFuzzy(e.title, e.titleEnglish, query) && localEntryPassesFilters(e))
			.map(mapUserListRecordToDisplay);

		// Locally cached records can be stale (e.g. missing covers from failed syncs) —
		// enrich them with the fresh online node instead of discarding it.
		const onlineById = new Map(online.map((r) => [r.malId, r]));
		const merged = localMatches.map((m) => {
			const hit = onlineById.get(m.malId);
			return hit ? mergeLocalWithOnline(m, hit) : m;
		});

		const localIds = new Set(merged.map((m) => m.malId));
		return [...merged, ...online.filter((r) => !localIds.has(r.malId))];
	});

	// Self-heal: persist enriched covers so My List repairs itself too.
	// Plain record (deliberately non-reactive) — mutating reactive state here would retrigger the effect.
	const healedIds: Record<number, true> = {};
	$effect(() => {
		const byId = new Map(userListStore.allEntries.map((e) => [e.malId, e]));
		for (const a of filteredResults) {
			if (healedIds[a.malId] || !a.mainPicture) continue;
			const rec = byId.get(a.malId);
			if (!rec || rec.mainPicture) continue;
			healedIds[a.malId] = true;
			putEntry({
				...$state.snapshot(rec),
				mainPicture: { medium: a.mainPicture, large: a.mainPicture }
			})
				.then((res) => {
					if (!res.ok) logger.warn('Failed to self-heal record cover:', res.error);
				})
				.catch((e) => logger.warn('Failed to self-heal record cover:', e));
		}
	});

	async function fetchOnline(
		p: number,
		append: boolean,
		searchId: number,
		opts?: { silent?: boolean }
	): Promise<void> {
		if (!opts?.silent) {
			if (p === 1) loading = true;
			else loadingMore = true;
		}

		// Snapshot params before awaiting so late URL changes are caught by the guard.
		const q = query.trim();
		const type = filterType;
		const genre = filterGenre;
		const sort = filterSort;
		const sfw = filterSfw;

		function commit(mapped: DisplayAnime[], next: boolean) {
			results = append ? [...results, ...mapped] : mapped;
			currentPage = p;
			hasNextPage = next;
			fetchFailed = false;
			loading = false;
			loadingMore = false;
		}

		if (!q) {
			// Landing grid — popularity-ranked via MAL ranking (fast, proxied).
			const rankingType = RANKING_TYPE_BY_FILTER[type] ?? 'bypopularity';
			const res = await getRanking(rankingType, {
				limit: PAGE_SIZE,
				offset: (p - 1) * PAGE_SIZE
			});

			if (searchId !== currentSearchId) return;

			if (!res.ok) return failFetch(p);

			const mapped = res.value.data.map((item) => mapMalNodeToDisplay(item.node));

			// Cache only the default landing payload for instant future visits.
			if (p === 1 && !type && !genre && sfw && mapped.length > 0) {
				setPopularCache(POPULAR_CACHE_KEY, mapped).catch(() => {});
			}

			commit(mapped, !!res.value.paging?.next);
		} else if (q.length < MIN_QUERY_LEN) {
			// Too short for MAL — keep whatever is on screen (local matches still merge in).
			return;
		} else {
			const sortMap = SORT_TO_MAL[sort] ?? {};
			let res = await malSearchAnime(q, {
				type: type || undefined,
				genre: genre ? Number(genre) : undefined,
				orderBy: sortMap.orderBy,
				sortDir: sortMap.sortDir,
				sfw,
				offset: (p - 1) * PAGE_SIZE,
				limit: PAGE_SIZE
			});

			if (searchId !== currentSearchId) return;

			// Fallback fuzzy search: multi-word query returned nothing → retry longest keyword.
			if (res.ok && res.value.data.length === 0) {
				const keyword = getSearchKeyword(q);
				if (keyword && keyword !== q.toLowerCase()) {
					res = await malSearchAnime(keyword, {
						type: type || undefined,
						genre: genre ? Number(genre) : undefined,
						sfw,
						offset: (p - 1) * PAGE_SIZE,
						limit: PAGE_SIZE
					});
					if (searchId !== currentSearchId) return;
				}
			}

			if (!res.ok) return failFetch(p);

			commit(
				res.value.data.map((item) => mapMalNodeToDisplay(item.node)),
				!!res.value.paging?.next
			);
		}
	}

	function failFetch(p: number): void {
		if (p === 1) {
			toast.error('Could not load anime — check your connection');
			fetchFailed = true;
		}
		loading = false;
		loadingMore = false;
	}

	// ─── URL Change Handler ───

	let prevSearchParams = '';

	async function runSearch() {
		currentSearchId++;
		const searchId = currentSearchId;

		// Stale-while-revalidate: paint the cached default landing instantly,
		// then refresh silently when older than the TTL.
		if (isDefaultLanding()) {
			try {
				const cached = await getPopularCache(POPULAR_CACHE_KEY);
				if (searchId !== currentSearchId) return;
				if (cached && cached.value.length > 0) {
					results = cached.value;
					currentPage = 1;
					hasNextPage = true;
					loading = false;
					if (Date.now() - cached.updatedAt < POPULAR_CACHE_TTL_MS) return;
					await fetchOnline(1, false, searchId, { silent: true });
					return;
				}
			} catch {
				// cache unavailable — fall through to network
			}
		}

		await fetchOnline(1, false, searchId);
	}

	function isDefaultLanding(): boolean {
		return !query.trim() && !filterType && !filterGenre && filterSfw;
	}

	$effect(() => {
		const params = `q=${query}&t=${filterType}&g=${filterGenre}&s=${filterSort}&d=${dubStore.dubMode}&sfw=${filterSfw}`;
		if (params !== prevSearchParams) {
			prevSearchParams = params;
			runSearch();
		}
	});

	// ─── Lifecycle ───

	onMount(() => {
		return () => debouncedSetFilter.cancel();
	});

	function handleWindowKeydown(e: KeyboardEvent) {
		if (
			e.key === '/' &&
			!(e.target instanceof HTMLInputElement) &&
			!(e.target instanceof HTMLTextAreaElement)
		) {
			e.preventDefault();
			document.getElementById('browse-search')?.focus();
		}
	}

	// ─── Filter Handlers ───

	function setFilter(key: string, value: string) {
		goto(setUrlParams(page.url, [{ key, value }]), { keepFocus: true, noScroll: true });
	}

	function clearAllFilters() {
		goto(
			setUrlParams(page.url, [
				{ key: 'q', value: '' },
				{ key: 'type', value: '' },
				{ key: 'genre', value: '' },
				{ key: 'sort', value: '' },
				{ key: 'sfw', value: 'true' }
			]),
			{ keepFocus: true, noScroll: true }
		);
		searchInput = '';
	}

	function handleSearchInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		searchInput = val;
		isDebouncing = true;
		debouncedSetFilter(val);
	}

	function clearSearch() {
		searchInput = '';
		setFilter('q', '');
	}
</script>

<svelte:head>
	<title>Browse | AniDash</title>
</svelte:head>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="py-6">
	<!-- Header -->
	<h1 class="text-2xl font-bold text-text-primary">Browse Anime</h1>
	<p class="mt-1 text-sm text-text-secondary">Search and discover anime to add to your list</p>

	<!-- Search Bar -->
	<div class="mt-5 flex flex-col sm:flex-row gap-3">
		<div class="flex-1">
			<SearchInput
				id="browse-search"
				value={searchInput}
				placeholder="Search anime by title…"
				oninput={handleSearchInput}
				onclear={clearSearch}
				onkeydown={handleKeyDown}
				{loading}
				{isDebouncing}
			/>
		</div>

		{#if hasQuery}
			<!-- Sort By (only meaningful against a real query corpus) -->
			<div class="relative sm:w-44">
				<select
					id="browse-sort"
					aria-label="Sort results"
					value={filterSort}
					onchange={(e) => setFilter('sort', (e.target as HTMLSelectElement).value)}
					class="w-full appearance-none rounded-full border border-white/5 bg-white/5 px-4 py-2.5 pr-9 text-sm text-text-secondary outline-none transition-all focus:bg-white/10 cursor-pointer"
				>
					{#each SORTS as s (s.value)}
						<option value={s.value} class="bg-surface-2">{s.label}</option>
					{/each}
				</select>
				<SlidersHorizontal
					size={13}
					class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
				/>
			</div>
		{/if}
	</div>

	<!-- Always-visible filter chips -->
	<div class="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
		<!-- Type chips -->
		{#each TYPES as t (t.value)}
			{@const active = filterType === t.value}
			<button
				onclick={() => setFilter('type', active ? '' : t.value)}
				aria-pressed={active}
				class="rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer {active
					? 'border-primary/50 bg-primary/15 text-primary'
					: 'border-white/5 bg-white/5 text-text-muted hover:border-white/15 hover:text-text-secondary'}"
			>
				{t.label}
			</button>
		{/each}

		<span class="h-5 w-px bg-white/10" aria-hidden="true"></span>

		<!-- Genre chips (horizontally scrollable) -->
		<div
			class="flex max-w-full items-center gap-2 overflow-x-auto scrollbar-none"
			style="max-width: min(100%, 34rem)"
		>
			<button
				onclick={() => setFilter('genre', '')}
				aria-pressed={!filterGenre}
				class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer {!filterGenre
					? 'border-primary/50 bg-primary/15 text-primary'
					: 'border-white/5 bg-white/5 text-text-muted hover:border-white/15 hover:text-text-secondary'}"
			>
				All Genres
			</button>
			{#each GENRES as g (g.id)}
				{@const active = filterGenre === String(g.id)}
				<button
					onclick={() => setFilter('genre', active ? '' : String(g.id))}
					aria-pressed={active}
					class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer {active
						? 'border-primary/50 bg-primary/15 text-primary'
						: 'border-white/5 bg-white/5 text-text-muted hover:border-white/15 hover:text-text-secondary'}"
				>
					{g.name}
				</button>
			{/each}
		</div>

		<span class="h-5 w-px bg-white/10" aria-hidden="true"></span>

		<!-- Safe Search toggle -->
		<label
			for="browse-sfw"
			class="flex shrink-0 cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-1.5 transition-colors {filterSfw
				? 'border-primary/50 bg-primary/15'
				: 'border-white/5 bg-white/5'}"
		>
			<input
				id="browse-sfw"
				type="checkbox"
				checked={filterSfw}
				onchange={(e) => setFilter('sfw', String((e.target as HTMLInputElement).checked))}
				class="sr-only peer"
			/>
			<div
				class="relative h-4 w-7 rounded-full bg-white/10 transition-colors peer-checked:bg-primary/40 after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-text-secondary after:transition-all peer-checked:after:translate-x-3 peer-checked:after:bg-primary"
			></div>
			<span class="text-xs font-medium {filterSfw ? 'text-primary' : 'text-text-muted'}">SFW</span>
		</label>
	</div>

	<!-- Results -->
	<div class="mt-6">
		<!-- Result count -->
		{#if !loading}
			<p class="mb-4 text-xs text-text-muted" aria-live="polite">
				{filteredResults.length}
				{filteredResults.length === 1 ? 'title' : 'titles'}
				{isLandingView ? '· trending now' : ''}
			</p>
		{/if}

		{#if loading && results.length === 0}
			<!-- Skeleton mirrors the final layout to prevent shift -->
			<div>
				{#if isLandingView}
					<div class="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
						<div
							class="min-h-[130px] animate-pulse rounded-2xl border border-white/5 bg-surface-1/60 sm:min-h-[150px]"
						></div>
						<div
							class="min-h-[130px] animate-pulse rounded-2xl border border-white/5 bg-surface-1/60 sm:min-h-[150px]"
						></div>
					</div>
					<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
						Popular Anime
					</h2>
				{/if}
				<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					<AnimeCardSkeleton count={10} />
				</div>
			</div>
		{:else if filteredResults.length > 0}
			{#if isLandingView}
				<div transition:fade={{ duration: 150 }}>
					<RecommenderWidgets />
				</div>
				<h2 class="mb-4 mt-8 text-sm font-semibold uppercase tracking-wider text-text-muted">
					Popular Anime
				</h2>
			{/if}
			<div
				class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
				transition:fade={{ duration: 150 }}
			>
				{#each filteredResults as anime, i (anime.malId)}
					<SearchResultCard {anime} index={i} />
				{/each}
			</div>

			<!-- Pagination -->
			{#if hasNextPage}
				<div class="flex justify-center py-8">
					{#if loadingMore}
						<div class="flex items-center gap-2 text-sm text-text-muted" aria-live="polite">
							<LoaderCircle size={16} class="animate-spin" />
							Loading more…
						</div>
					{:else}
						<button
							onclick={() => fetchOnline(currentPage + 1, true, currentSearchId)}
							class="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
						>
							Show More
						</button>
					{/if}
				</div>
			{:else if !isLandingView}
				<p class="mt-6 text-center text-sm text-text-muted">End of results</p>
			{/if}
		{:else if fetchFailed && filteredResults.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
				transition:fade={{ duration: 150 }}
			>
				<SearchX size={36} class="mb-3 text-text-muted" strokeWidth={1.5} />
				<p class="text-sm text-text-secondary">Couldn't load anime right now</p>
				<button
					onclick={runSearch}
					class="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
				>
					Retry
				</button>
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
				transition:fade={{ duration: 150 }}
			>
				<SearchX size={36} class="mb-3 text-text-muted" strokeWidth={1.5} />
				<p class="text-sm text-text-secondary">
					{hasQuery ? 'No anime found matching your search' : 'Nothing matches these filters'}
				</p>
				<p class="mt-1 text-xs text-text-muted">
					{hasQuery
						? 'Try different keywords or filters'
						: 'Try widening your filters or search by title'}
				</p>
				<button
					onclick={clearAllFilters}
					class="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
				>
					Clear All Filters
				</button>
			</div>
		{/if}
	</div>
</div>
