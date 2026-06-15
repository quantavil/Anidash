<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getUrlParam, setUrlParams } from '$lib/utils/url-state';
	import { searchAnime, getAnimeGenres } from '$lib/api/jikan';
	import { mapJikanToDisplay, type DisplayAnime } from '$lib/utils/types';
	import { formatMediaType } from '$lib/utils/format';
	import { SlidersHorizontal, ChevronDown, LoaderCircle, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import SearchInput from '$lib/ui/SearchInput.svelte';
	import SearchResultCard from '$lib/ui/SearchResultCard.svelte';
	import AnimeCardSkeleton from '$lib/ui/skeletons/AnimeCardSkeleton.svelte';
	import RecommenderWidgets from '$lib/ui/RecommenderWidgets.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { fade } from 'svelte/transition';
	import { debounce } from '$lib/utils/debounce';
	import { MEDIA_TYPE_FILTER_OPTIONS } from '$lib/constants';

	// ─── URL State ───

	const query = $derived(getUrlParam(page.url, 'q', ''));
	const filterType = $derived(getUrlParam(page.url, 'type', ''));
	const filterGenre = $derived(getUrlParam(page.url, 'genre', ''));
	const filterSort = $derived(getUrlParam(page.url, 'sort', query ? 'relevance' : 'popularity'));
	const filterSfw = $derived(getUrlParam(page.url, 'sfw', 'true') === 'true');

	// ─── State ───

	let results = $state<DisplayAnime[]>([]);
	let loading = $state(false);
	let currentPage = $state(1);
	let hasNextPage = $state(false);
	let hasSearched = $state(false);
	let loadingMore = $state(false);
	let isDebouncing = $state(false);

	// ─── Genres ───

	let genres = $state<Array<{ id: number; name: string }>>([]);
	let genresLoaded = $state(false);
	let showFilters = $state(false);

	const TYPES = MEDIA_TYPE_FILTER_OPTIONS;

	const SORTS = [
		{ value: 'relevance', label: 'Relevance' },
		{ value: 'score', label: 'Rating' },
		{ value: 'popularity', label: 'Popularity' },
		{ value: 'title', label: 'Title A-Z' },
		{ value: 'start_date', label: 'Newest First' }
	];

	// ─── Filter Count ───

	const activeFiltersCount = $derived(
		(filterType ? 1 : 0) + (filterGenre ? 1 : 0) + (!filterSfw ? 1 : 0)
	);

	// ─── Search ───

	const debouncedSetFilter = debounce((val: string) => {
		setFilter('q', val);
		isDebouncing = false;
	}, 400);

	async function doSearch(page: number = 1, append: boolean = false) {
		if (page === 1) loading = true;
		else loadingMore = true;

		// Ensure dubs are loaded if filtering is enabled
		if (dubStore.dubMode) {
			await dubStore.init();
		}

		const result = await searchAnime({
			q: query || undefined,
			type: filterType || undefined,
			genres: filterGenre || undefined,
			order_by:
				filterSort === 'popularity'
					? 'members'
					: filterSort === 'title'
						? 'title'
						: filterSort === 'start_date'
							? 'start_date'
							: filterSort === 'score'
								? 'score'
								: undefined,
			sort: filterSort === 'relevance' ? undefined : filterSort === 'title' ? 'asc' : 'desc',
			page,
			limit: 25,
			sfw: filterSfw ? true : undefined
		});

		if (result.ok) {
			let mapped = result.value.anime.map(mapJikanToDisplay);
			if (dubStore.dubMode) {
				mapped = mapped.filter((a) => dubStore.hasDub(a.malId));
			}

			if (append) {
				results = [...results, ...mapped];
			} else {
				results = mapped;
			}
			currentPage = result.value.currentPage;
			hasNextPage = result.value.hasNextPage;
		} else {
			if (!append) {
				toast.error('Search failed — try again');
			}
		}

		loading = false;
		loadingMore = false;
		hasSearched = true;
	}

	// ─── URL Change Handler ───

	let prevSearchParams = '';

	$effect(() => {
		const params = `q=${query}&t=${filterType}&g=${filterGenre}&s=${filterSort}&d=${dubStore.dubMode}&sfw=${filterSfw}`;
		if (params !== prevSearchParams) {
			prevSearchParams = params;
			doSearch(1, false);
		}
	});

	// ─── Pagination ───

	onMount(() => {
		loadGenres();

		return () => {
			debouncedSetFilter.cancel();
		};
	});

	// ─── Genres ───

	async function loadGenres() {
		if (genresLoaded) return;
		const result = await getAnimeGenres();
		if (result.ok) {
			genres = result.value.map((g) => ({ id: g.id, name: g.name }));
		}
		genresLoaded = true;
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

	// eslint-disable-next-line svelte/prefer-writable-derived
	let searchInput = $state('');

	$effect(() => {
		searchInput = query;
	});

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

<div class="mx-auto max-w-7xl px-4 py-6">
	<!-- Header -->
	<h1 class="text-2xl font-bold text-text-primary">Browse Anime</h1>
	<p class="mt-1 text-sm text-text-secondary">Search and discover anime to add to your list</p>

	<!-- Search Bar -->
	<div class="mt-5 flex gap-3">
		<div class="flex-1">
			<SearchInput
				value={searchInput}
				placeholder="Search anime by title…"
				oninput={handleSearchInput}
				onclear={clearSearch}
				{loading}
				{isDebouncing}
			/>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => (showFilters = !showFilters)}
				class="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-2
          {showFilters ? 'border-primary text-primary' : ''}"
			>
				<SlidersHorizontal size={16} />
				<span>Filters</span>
				{#if activeFiltersCount > 0}
					<span
						class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white"
					>
						{activeFiltersCount}
					</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Filters Panel -->
	{#if showFilters}
		<div
			class="mt-3 rounded-2xl border border-white/5 bg-surface-1/40 backdrop-blur-md shadow-xl p-5"
			transition:fade
		>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
				<!-- Type -->
				<div class="flex flex-col">
					<label for="filter-type" class="mb-1.5 block text-xs font-medium text-text-muted"
						>Type</label
					>
					<div class="relative w-full">
						<select
							id="filter-type"
							value={filterType}
							onchange={(e) => setFilter('type', (e.target as HTMLSelectElement).value)}
							class="w-full appearance-none rounded-lg border border-white/5 bg-surface-2/60 px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:bg-white/10 transition-all duration-200"
						>
							{#each TYPES as t, _idx (_idx)}
								<option value={t.value} class="bg-surface-2">{t.label}</option>
							{/each}
						</select>
						<ChevronDown
							size={14}
							class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
						/>
					</div>
				</div>

				<!-- Genre -->
				<div class="flex flex-col">
					<label for="filter-genre" class="mb-1.5 block text-xs font-medium text-text-muted"
						>Genre</label
					>
					<div class="relative w-full">
						<select
							id="filter-genre"
							value={filterGenre}
							onchange={(e) => setFilter('genre', (e.target as HTMLSelectElement).value)}
							class="w-full appearance-none rounded-lg border border-white/5 bg-surface-2/60 px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:bg-white/10 transition-all duration-200"
						>
							<option value="" class="bg-surface-2">All Genres</option>
							{#each genres as g, _idx (_idx)}
								<option value={String(g.id)} class="bg-surface-2">{g.name}</option>
							{/each}
						</select>
						<ChevronDown
							size={14}
							class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
						/>
					</div>
				</div>

				<!-- Sort By -->
				<div class="flex flex-col">
					<label for="filter-sort" class="mb-1.5 block text-xs font-medium text-text-muted"
						>Sort By</label
					>
					<div class="relative w-full">
						<select
							id="filter-sort"
							value={filterSort}
							onchange={(e) => setFilter('sort', (e.target as HTMLSelectElement).value)}
							class="w-full appearance-none rounded-lg border border-white/5 bg-surface-2/60 px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:bg-white/10 transition-all duration-200"
						>
							{#each SORTS as s, _idx (_idx)}
								<option value={s.value} class="bg-surface-2">{s.label}</option>
							{/each}
						</select>
						<ChevronDown
							size={14}
							class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
						/>
					</div>
				</div>

				<!-- Safe Search (SFW) Toggle -->
				<div class="flex items-center h-full pt-4 md:pt-5">
					<label for="filter-sfw" class="flex items-center gap-3 cursor-pointer select-none">
						<input
							id="filter-sfw"
							type="checkbox"
							checked={filterSfw}
							onchange={(e) => setFilter('sfw', String((e.target as HTMLInputElement).checked))}
							class="sr-only peer"
						/>
						<div
							class="relative w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:border-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary/30 peer-checked:after:bg-primary"
						></div>
						<div class="flex flex-col">
							<span class="text-xs font-semibold text-text-primary">Safe Search</span>
							<span class="text-[10px] text-text-muted">Hide mature (18+) content</span>
						</div>
					</label>
				</div>
			</div>

			<!-- Footer with Clear Filters -->
			{#if activeFiltersCount > 0}
				<div class="mt-4 flex items-center justify-end border-t border-white/5 pt-3">
					<button
						onclick={clearAllFilters}
						class="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-secondary hover:bg-white/5"
					>
						Clear All Filters
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Active Filters Tags -->
	{#if filterType || filterGenre || !filterSfw}
		<div class="mt-3 flex flex-wrap gap-2" transition:fade>
			{#if filterType}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
				>
					{formatMediaType(filterType)}
					<button onclick={() => setFilter('type', '')} aria-label="Remove type filter"
						><X size={12} /></button
					>
				</span>
			{/if}
			{#if filterGenre}
				{@const genreName = genres.find((g) => String(g.id) === filterGenre)?.name ?? filterGenre}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
				>
					{genreName}
					<button onclick={() => setFilter('genre', '')} aria-label="Remove genre filter"
						><X size={12} /></button
					>
				</span>
			{/if}
			{#if !filterSfw}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
				>
					Unfiltered (18+)
					<button onclick={() => setFilter('sfw', 'true')} aria-label="Enable safe search"
						><X size={12} /></button
					>
				</span>
			{/if}
		</div>
	{/if}

	<!-- Results -->
	<div class="mt-6">
		{#if !query.trim() && !filterGenre && !loading}
			<!-- Show Recommender Widgets first on Landing page -->
			<div class="mb-8 w-full" transition:fade>
				<RecommenderWidgets />
			</div>
			<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
				Popular Anime
			</h2>
		{/if}

		{#if loading}
			<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				<AnimeCardSkeleton count={10} />
			</div>
		{:else if results.length > 0}
			<div
				class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
				transition:fade
			>
				{#each results as anime, i (anime.malId)}
					<SearchResultCard {anime} index={i} />
				{/each}
			</div>

			<!-- Pagination -->
			{#if hasNextPage}
				<div class="flex justify-center py-8">
					{#if loadingMore}
						<div class="flex items-center gap-2 text-sm text-text-muted">
							<LoaderCircle size={16} class="animate-spin" />
							Loading more…
						</div>
					{:else}
						<button
							onclick={() => doSearch(currentPage + 1, true)}
							class="rounded-full bg-white/5 border border-white/10 px-6 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
						>
							Show More
						</button>
					{/if}
				</div>
			{:else}
				<p class="mt-6 text-center text-sm text-text-muted" transition:fade>End of results</p>
			{/if}
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
				transition:fade
			>
				<div class="mb-3 text-4xl">🔍</div>
				<p class="text-sm text-text-secondary">No anime found matching your search</p>
				<p class="mt-1 text-xs text-text-muted">Try different keywords or filters</p>
				<button
					onclick={clearAllFilters}
					class="mt-4 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
				>
					Clear All Filters
				</button>
			</div>
		{/if}
	</div>
</div>
