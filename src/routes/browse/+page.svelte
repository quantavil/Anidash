<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getUrlParam, setUrlParams } from '#lib/utils/url-state.js';
	import { searchAnime as malSearchAnime, getRanking } from '#lib/api/mal.js';
	import {
		mapMalNodeToDisplay,
		mapUserListRecordToDisplay,
		mergeLocalWithOnline,
		type DisplayAnime
	} from '#lib/utils/types.js';
	import { LoaderCircle, SearchX, ArrowDown, ArrowUp } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import SearchInput from '#lib/ui/SearchInput.svelte';
	import SearchResultCard from '#lib/ui/SearchResultCard.svelte';
	import FilterPanel from '#lib/ui/FilterPanel.svelte';
	import AnimeCardSkeleton from '#lib/ui/skeletons/AnimeCardSkeleton.svelte';
	import { dubStore } from '#lib/stores/dub.svelte.js';
	import { debounce } from '#lib/utils/debounce.js';
	import { POPULAR_CACHE_KEY, POPULAR_CACHE_TTL_MS } from '#lib/constants.js';
	import { userListStore } from '#lib/stores/userlist.svelte.js';
	import { putEntry } from '#lib/cache/userlist.cache.js';
	import { logger } from '#lib/utils/logger.js';
	import { matchesFuzzy, getSearchKeyword } from '#lib/utils/search.js';
	import { getPopularCache, setPopularCache } from '#lib/cache/meta.cache.js';
	import {
		facetOfDisplay,
		matchesFilters,
		buildFacetOptions,
		filtersFromUrl,
		filtersToPairs,
		activeFilterCount,
		CLEAR_FILTER_PAIRS,
		type AnimeFilters
	} from '#lib/utils/filters.js';
	import { sortDisplay, NATURAL_DIR, type SortKey, type SortDir } from '#lib/utils/sort.js';

	// ─── Constants ───

	/** MAL search caps `limit` at 100; ranking allows more but 100 keeps pages snappy. */
	const PAGE_SIZE = 100;
	const MIN_QUERY_LEN = 3; // MAL v2 rejects shorter queries
	/** With filters on, keep scanning further pages until this many matches are visible. */
	const AUTO_SCAN_TARGET = 24;
	const AUTO_SCAN_PAGES = 5;

	/** MAL ranking_type per chart. MAL v2 cannot filter or sort search results itself. */
	const CHARTS = [
		{ value: 'popular', label: 'Popular', ranking: 'bypopularity' },
		{ value: 'top', label: 'Top rated', ranking: 'all' },
		{ value: 'airing', label: 'Airing now', ranking: 'airing' },
		{ value: 'upcoming', label: 'Upcoming', ranking: 'upcoming' },
		{ value: 'favorite', label: 'Most favorited', ranking: 'favorite' },
		{ value: 'movie', label: 'Top movies', ranking: 'movie' }
	] as const;
	const DEFAULT_CHART = 'popular';

	const SORTS: { value: '' | SortKey; label: string }[] = [
		{ value: '', label: 'Default order' },
		{ value: 'mean', label: 'Rating' },
		{ value: 'popularity', label: 'Popularity' },
		{ value: 'start', label: 'Release date' },
		{ value: 'episodes', label: 'Episodes' },
		{ value: 'title', label: 'Title' }
	];

	// ─── URL State ───

	const query = $derived(getUrlParam(page.url, 'q', '').trim());
	const chart = $derived.by(() => {
		const raw = getUrlParam(page.url, 'chart', DEFAULT_CHART);
		return CHARTS.find((c) => c.value === raw) ?? CHARTS[0];
	});
	const sortKey = $derived.by((): SortKey | null => {
		const raw = getUrlParam(page.url, 'sort', '');
		return SORTS.some((s) => s.value && s.value === raw) ? (raw as SortKey) : null;
	});
	const sortDir = $derived.by((): SortDir => {
		const raw = getUrlParam(page.url, 'dir', '');
		return raw === 'asc' || raw === 'desc' ? raw : sortKey ? NATURAL_DIR[sortKey] : 'desc';
	});
	const filters = $derived(filtersFromUrl(page.url));
	const filterCount = $derived(activeFilterCount(filters));
	const filterKey = $derived(JSON.stringify(filters));

	const hasQuery = $derived(query.length >= MIN_QUERY_LEN);
	const isSearching = $derived(query.length > 0);

	// ─── State ───

	let results = $state.raw<DisplayAnime[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let hasNextPage = $state(false);
	let loadingMore = $state(false);
	let isDebouncing = $state(false);
	let currentSearchId = 0;
	let fetchFailed = $state(false);
	let scanBudget = $state(AUTO_SCAN_PAGES);

	let searchEl = $state<SearchInput>();
	let searchInput = $derived(getUrlParam(page.url, 'q', ''));

	// ─── Search box ───

	const debouncedSetQuery = debounce((val: string) => {
		setParams([{ key: 'q', value: val.trim() }]);
		isDebouncing = false;
	}, 400);

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			debouncedSetQuery.cancel();
			isDebouncing = false;
			setParams([{ key: 'q', value: searchInput.trim() }]);
		} else if (e.key === 'Escape' && searchInput) {
			clearSearch();
		}
	}

	// ─── Result pipeline: merge → filter → sort ───

	const baseResults = $derived.by(() => {
		if (!isSearching) return results;

		// Titles already on the list match instantly, even offline or under 3 characters.
		const local = userListStore.allEntries
			.filter((e) => matchesFuzzy(e.title, e.titleEnglish, query))
			.map(mapUserListRecordToDisplay);

		// Locally cached records can be stale (e.g. missing covers from failed syncs) —
		// enrich them with the fresh online node instead of discarding it.
		const onlineById = new Map(results.map((r) => [r.malId, r]));
		const merged = local.map((m) => {
			const hit = onlineById.get(m.malId);
			return hit ? mergeLocalWithOnline(m, hit) : m;
		});
		const localIds = new Set(merged.map((m) => m.malId));
		return [...merged, ...results.filter((r) => !localIds.has(r.malId))];
	});

	const facetOptions = $derived(buildFacetOptions(baseResults.map(facetOfDisplay), filters));

	const filteredResults = $derived.by(() => {
		const f = filters;
		const dubOnly = dubStore.dubMode && dubStore.isReady;
		const matched = baseResults.filter(
			(a) =>
				(!dubOnly || dubStore.hasDub(a.malId)) &&
				matchesFilters(f, facetOfDisplay(a), {
					inList: (id) => userListStore.getEntry(id) !== undefined
				})
		);
		return sortDisplay(matched, sortKey, sortDir);
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

	// ─── Fetching ───

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
		const q = query;
		const ranking = chart.ranking;
		const isDefaultChart = chart.value === DEFAULT_CHART;

		function commit(mapped: DisplayAnime[], next: boolean) {
			if (append) {
				const seen = new Set(results.map((r) => r.malId));
				results = [...results, ...mapped.filter((r) => !seen.has(r.malId))];
			} else {
				results = mapped;
			}
			currentPage = p;
			hasNextPage = next;
			fetchFailed = false;
			loading = false;
			loadingMore = false;
		}

		const offset = (p - 1) * PAGE_SIZE;

		if (!q) {
			const res = await getRanking(ranking, { limit: PAGE_SIZE, offset });
			if (searchId !== currentSearchId) return;
			if (!res.ok) return failFetch(p);

			const mapped = res.value.data.map((item) => mapMalNodeToDisplay(item.node));

			// Cache only the default landing payload for instant future visits.
			if (p === 1 && isDefaultChart && mapped.length > 0) {
				setPopularCache(POPULAR_CACHE_KEY, mapped).catch(() => {});
			}
			commit(mapped, !!res.value.paging?.next);
			return;
		}

		let res = await malSearchAnime(q, { offset, limit: PAGE_SIZE });
		if (searchId !== currentSearchId) return;

		// Multi-word query returned nothing → retry with its longest keyword.
		if (res.ok && res.value.data.length === 0) {
			const keyword = getSearchKeyword(q);
			if (keyword && keyword !== q.toLowerCase()) {
				res = await malSearchAnime(keyword, { offset, limit: PAGE_SIZE });
				if (searchId !== currentSearchId) return;
			}
		}

		if (!res.ok) return failFetch(p);
		commit(
			res.value.data.map((item) => mapMalNodeToDisplay(item.node)),
			!!res.value.paging?.next
		);
	}

	function failFetch(p: number): void {
		if (p === 1) {
			toast.error('Could not load anime — check your connection');
			fetchFailed = true;
		} else {
			toast.error('Could not load more — try again');
		}
		loading = false;
		loadingMore = false;
	}

	let prevSource = '';

	async function runSearch() {
		currentSearchId++;
		const searchId = currentSearchId;
		scanBudget = AUTO_SCAN_PAGES;
		hasNextPage = false;
		fetchFailed = false;

		// Short queries search saved records only; MAL rejects fewer than three characters.
		if (query && !hasQuery) {
			results = [];
			loading = false;
			loadingMore = false;
			return;
		}

		// Stale-while-revalidate: paint the cached default chart instantly,
		// then refresh silently when older than the TTL.
		if (!query && chart.value === DEFAULT_CHART) {
			try {
				const cached = await getPopularCache(POPULAR_CACHE_KEY);
				if (searchId !== currentSearchId) return;
				if (cached && cached.value.length > 0) {
					results = cached.value;
					currentPage = 1;
					hasNextPage = cached.value.length >= PAGE_SIZE;
					loading = false;
					if (Date.now() - cached.updatedAt < POPULAR_CACHE_TTL_MS) return;
					await fetchOnline(1, false, searchId, { silent: true });
					return;
				}
			} catch {
				// cache unavailable — fall through to network
			}
		}

		results = [];
		await fetchOnline(1, false, searchId);
	}

	// Re-fetch only when the *source* changes. Filters and sort are client-side.
	$effect(() => {
		const source = `${query}|${chart.value}`;
		if (source !== prevSource) {
			prevSource = source;
			untrack(runSearch);
		}
	});

	// Filters thin out each page; keep scanning a few more pages so sparse matches still surface.
	$effect(() => {
		void filterKey;
		untrack(() => (scanBudget = AUTO_SCAN_PAGES));
	});
	$effect(() => {
		if (loading || loadingMore || fetchFailed || !hasNextPage) return;
		if (filterCount === 0 || filteredResults.length >= AUTO_SCAN_TARGET) return;
		if (untrack(() => scanBudget) <= 0) return;
		untrack(() => {
			scanBudget--;
			void fetchOnline(currentPage + 1, true, currentSearchId);
		});
	});

	// ─── Lifecycle ───

	onMount(() => () => debouncedSetQuery.cancel());

	function handleWindowKeydown(e: KeyboardEvent) {
		if (
			e.key === '/' &&
			!(e.target instanceof HTMLInputElement) &&
			!(e.target instanceof HTMLTextAreaElement) &&
			!(e.target instanceof HTMLSelectElement)
		) {
			e.preventDefault();
			void searchEl?.focus();
		}
	}

	// ─── Handlers ───

	function setParams(pairs: { key: string; value: string }[]) {
		goto(setUrlParams(page.url, pairs), { reset: false });
	}

	function setFilters(next: AnimeFilters) {
		goto(setUrlParams(page.url, filtersToPairs(next)), {
			reset: false,
			replace: true
		});
	}

	function clearAllFilters() {
		setParams(CLEAR_FILTER_PAIRS);
	}

	function handleSearchInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		searchInput = val;
		isDebouncing = true;
		debouncedSetQuery(val);
	}

	function clearSearch() {
		debouncedSetQuery.cancel();
		isDebouncing = false;
		searchInput = '';
		setParams([{ key: 'q', value: '' }]);
	}

	function toggleDir() {
		const flipped: SortDir = sortDir === 'asc' ? 'desc' : 'asc';
		setParams([{ key: 'dir', value: sortKey && flipped === NATURAL_DIR[sortKey] ? '' : flipped }]);
	}

	const sourceLabel = $derived(isSearching ? `“${query}”` : chart.label);
</script>

{#snippet searchTool()}
	<SearchInput
		bind:this={searchEl}
		id="browse-search"
		value={searchInput}
		placeholder="Search by title…  ( / )"
		oninput={handleSearchInput}
		onclear={clearSearch}
		onkeydown={handleKeyDown}
		{loading}
		{isDebouncing}
	/>
{/snippet}

{#snippet sortTools()}
	<select
		id="browse-sort"
		aria-label="Sort results"
		value={sortKey ?? ''}
		onchange={(e) =>
			setParams([
				{ key: 'sort', value: (e.target as HTMLSelectElement).value },
				{ key: 'dir', value: '' }
			])}
		class="min-h-11 cursor-pointer appearance-none rounded-full border border-white/5 bg-white/5 px-4 text-sm text-text-secondary outline-none transition-colors focus:bg-white/10"
	>
		{#each SORTS as s (s.value)}
			<option value={s.value} class="bg-surface-2">{s.label}</option>
		{/each}
	</select>
	<button
		type="button"
		onclick={toggleDir}
		disabled={!sortKey}
		aria-label="Sort direction: {sortDir === 'asc' ? 'ascending' : 'descending'}"
		class="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-white/5 bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary disabled:cursor-default disabled:opacity-40"
	>
		{#if sortDir === 'asc'}<ArrowUp size={14} />{:else}<ArrowDown size={14} />{/if}
	</button>
{/snippet}

<svelte:head>
	<title>Browse | AniDash</title>
</svelte:head>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="py-6">
	<h1 class="text-2xl font-bold text-text-primary">Browse</h1>

	<!-- Charts (when not searching) -->
	{#if !isSearching}
		<div class="filter-scroll mt-4" role="group" aria-label="Charts">
			{#each CHARTS as c (c.value)}
				{@const active = chart.value === c.value}
				<button
					type="button"
					onclick={() =>
						setParams([{ key: 'chart', value: c.value === DEFAULT_CHART ? '' : c.value }])}
					aria-pressed={active}
					class="min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors {active
						? 'border-primary/50 bg-primary/15 text-primary'
						: 'border-white/5 bg-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary'}"
				>
					{c.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Search · filters · sort, one inline toolbar -->
	<div class="mt-4">
		<FilterPanel
			{filters}
			options={facetOptions}
			mode="browse"
			onchange={setFilters}
			leading={searchTool}
			trailing={sortTools}
		/>
	</div>

	<!-- Results -->
	<div class="mt-5">
		<p class="mb-3 min-h-4 text-xs text-text-secondary" aria-live="polite">
			{#if loading}
				Loading…
			{:else}
				{filteredResults.length}
				{filteredResults.length === 1 ? 'title' : 'titles'} · {sourceLabel}{#if filterCount > 0 || dubStore.dubMode}
					&nbsp;· filtered from {baseResults.length} loaded{/if}{#if loadingMore}
					&nbsp;· scanning more…{/if}
			{/if}
		</p>

		{#if loading && baseResults.length === 0}
			<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				<AnimeCardSkeleton count={10} />
			</div>
		{:else if filteredResults.length > 0}
			<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each filteredResults as anime, i (anime.malId)}
					<SearchResultCard {anime} index={i} />
				{/each}
			</div>

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
							class="min-h-11 cursor-pointer rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
						>
							Load {PAGE_SIZE} more
						</button>
					{/if}
				</div>
			{:else}
				<p class="mt-6 text-center text-sm text-text-muted">End of results</p>
			{/if}
		{:else if fetchFailed}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<SearchX size={36} class="mb-3 text-text-muted" strokeWidth={1.5} />
				<p class="text-sm text-text-secondary">Couldn't load anime right now</p>
				<button
					onclick={runSearch}
					class="mt-4 min-h-11 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 text-xs font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
				>
					Retry
				</button>
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<SearchX size={36} class="mb-3 text-text-muted" strokeWidth={1.5} />
				<p class="text-sm text-text-secondary">
					{isSearching && !hasQuery
						? `Type ${MIN_QUERY_LEN - query.length} more character${MIN_QUERY_LEN - query.length === 1 ? '' : 's'} to search MyAnimeList`
						: filterCount > 0
							? hasNextPage
								? 'No matches in the titles loaded so far'
								: 'Nothing matches these filters'
							: 'No anime found'}
				</p>
				{#if hasNextPage && filterCount > 0 && !loadingMore}
					<button
						onclick={() => fetchOnline(currentPage + 1, true, currentSearchId)}
						class="mt-4 min-h-11 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 text-xs font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
					>
						Scan {PAGE_SIZE} more titles
					</button>
				{/if}
				{#if filterCount > 0}
					<button
						onclick={clearAllFilters}
						class="mt-2 min-h-11 cursor-pointer rounded-lg px-4 text-xs font-semibold text-primary hover:underline"
					>
						Clear filters
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.filter-scroll {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		padding-bottom: 3px;
	}
</style>
