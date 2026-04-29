<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getUrlParam, setUrlParams } from '$lib/utils/url-state';
	import { searchAnime, getAnimeGenres } from '$lib/api/jikan';
	import { mapJikanToDisplay, type DisplayAnime } from '$lib/utils/types';
	import { formatMediaType } from '$lib/utils/format';
	import { Search, SlidersHorizontal, X, ChevronDown, Loader2, Mic } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import SearchResultCard from '$lib/ui/SearchResultCard.svelte';
	import AnimeCardSkeleton from '$lib/ui/skeletons/AnimeCardSkeleton.svelte';
	import RecommenderWidgets from '$lib/ui/RecommenderWidgets.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';

	// ─── URL State ───

	const query = $derived(getUrlParam($page.url, 'q', ''));
	const filterType = $derived(getUrlParam($page.url, 'type', ''));
	const filterGenre = $derived(getUrlParam($page.url, 'genre', ''));
	const filterSort = $derived(getUrlParam($page.url, 'sort', 'score'));

	// ─── State ───

	let results = $state<DisplayAnime[]>([]);
	let loading = $state(false);
	let currentPage = $state(1);
	let hasNextPage = $state(false);
	let hasSearched = $state(false);
	let loadingMore = $state(false);

	// ─── Genres ───

	let genres = $state<Array<{ id: number; name: string }>>([]);
	let genresLoaded = $state(false);
	let showFilters = $state(false);

	const TYPES = [
		{ value: '', label: 'All Types' },
		{ value: 'tv', label: 'TV' },
		{ value: 'movie', label: 'Movie' },
		{ value: 'ova', label: 'OVA' },
		{ value: 'special', label: 'Special' },
		{ value: 'ona', label: 'ONA' }
	];

	const SORTS = [
		{ value: 'score', label: 'Rating' },
		{ value: 'popularity', label: 'Popularity' },
		{ value: 'title', label: 'Title A-Z' },
		{ value: 'start_date', label: 'Newest First' }
	];

	// ─── Search ───

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function doSearch(page: number = 1, append: boolean = false) {
		if (!query.trim() && !filterGenre) {
			if (!append) results = [];
			hasSearched = false;
			return;
		}

		if (page === 1) loading = true;
		else loadingMore = true;

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
							: 'score',
			sort: filterSort === 'title' ? 'asc' : 'desc',
			page,
			limit: 25,
			sfw: true
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
		const params = `q=${query}&t=${filterType}&g=${filterGenre}&s=${filterSort}&d=${dubStore.dubMode}`;
		if (params !== prevSearchParams) {
			prevSearchParams = params;
			doSearch(1, false);
		}
	});

	// ─── Infinite Scroll ───

	let sentinelEl: HTMLElement | null = $state(null);
	let observer: IntersectionObserver | null = null;

	onMount(() => {
		loadGenres();

		observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !loadingMore && !loading) {
					doSearch(currentPage + 1, true);
				}
			},
			{ rootMargin: '200px' }
		);

		return () => {
			observer?.disconnect();
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	$effect(() => {
		if (sentinelEl && observer) {
			observer.disconnect();
			observer.observe(sentinelEl);
		}
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
		goto(setUrlParams($page.url, [{ key, value }]), { keepFocus: true, noScroll: true });
	}

	let searchInput = $state('');

	$effect(() => {
		searchInput = query;
	});

	function handleSearchInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		searchInput = val;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			setFilter('q', val);
		}, 400);
	}

	function clearSearch() {
		searchInput = '';
		setFilter('q', '');
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-6">
	<!-- Header -->
	<h1 class="text-2xl font-bold text-text-primary">Browse Anime</h1>
	<p class="mt-1 text-sm text-text-secondary">Search and discover anime to add to your list</p>

	<!-- Search Bar -->
	<div class="mt-5 flex gap-3">
		<div class="relative flex-1">
			<Search
				size={16}
				class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
			/>
			<input
				type="text"
				placeholder="Search anime by title…"
				value={searchInput}
				oninput={handleSearchInput}
				class="w-full rounded-lg border border-border bg-surface-1 py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			/>
			{#if searchInput}
				<button
					onclick={clearSearch}
					class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
				>
					<X size={16} />
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => (showFilters = !showFilters)}
				class="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-2
          {showFilters ? 'border-primary text-primary' : ''}"
			>
				<SlidersHorizontal size={16} />
				Filters
			</button>
		</div>
	</div>

	<!-- Filters Panel -->
	{#if showFilters}
		<div class="mt-3 rounded-xl border border-border bg-surface-1 p-4">
			<div class="flex flex-wrap gap-4">
				<!-- Type -->
				<div class="min-w-[140px]">
					<label for="filter-type" class="mb-1.5 block text-xs font-medium text-text-muted"
						>Type</label
					>
					<select
						id="filter-type"
						value={filterType}
						onchange={(e) => setFilter('type', (e.target as HTMLSelectElement).value)}
						class="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
					>
						{#each TYPES as t}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
				</div>

				<!-- Genre -->
				<div class="min-w-[140px]">
					<label for="filter-genre" class="mb-1.5 block text-xs font-medium text-text-muted"
						>Genre</label
					>
					<select
						id="filter-genre"
						value={filterGenre}
						onchange={(e) => setFilter('genre', (e.target as HTMLSelectElement).value)}
						class="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
					>
						<option value="">All Genres</option>
						{#each genres as g}
							<option value={String(g.id)}>{g.name}</option>
						{/each}
					</select>
				</div>

				<!-- Sort -->
				<div class="min-w-[140px]">
					<label for="filter-sort" class="mb-1.5 block text-xs font-medium text-text-muted"
						>Sort By</label
					>
					<select
						id="filter-sort"
						value={filterSort}
						onchange={(e) => setFilter('sort', (e.target as HTMLSelectElement).value)}
						class="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
					>
						{#each SORTS as s}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
				</div>

				<!-- Clear Filters -->
				<div class="flex items-end">
					<button
						onclick={() => {
							goto(
								setUrlParams($page.url, [
									{ key: 'type', value: '' },
									{ key: 'genre', value: '' },
									{ key: 'sort', value: 'score' }
								]),
								{ keepFocus: true, noScroll: true }
							);
						}}
						class="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:text-text-secondary"
					>
						Clear Filters
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Active Filters Tags -->
	{#if filterType || filterGenre}
		<div class="mt-3 flex flex-wrap gap-2">
			{#if filterType}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
				>
					{formatMediaType(filterType)}
					<button onclick={() => setFilter('type', '')}><X size={12} /></button>
				</span>
			{/if}
			{#if filterGenre}
				{@const genreName = genres.find((g) => String(g.id) === filterGenre)?.name ?? filterGenre}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
				>
					{genreName}
					<button onclick={() => setFilter('genre', '')}><X size={12} /></button>
				</span>
			{/if}
		</div>
	{/if}

	<!-- Results -->
	<div class="mt-6">
		{#if loading}
			<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				<AnimeCardSkeleton count={10} />
			</div>
		{:else if results.length > 0}
			<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each results as anime (anime.malId)}
					<SearchResultCard {anime} />
				{/each}
			</div>

			<!-- Infinite scroll sentinel -->
			{#if hasNextPage}
				<div bind:this={sentinelEl} class="flex justify-center py-8">
					{#if loadingMore}
						<div class="flex items-center gap-2 text-sm text-text-muted">
							<Loader2 size={16} class="animate-spin" />
							Loading more…
						</div>
					{:else}
						<div class="h-8"></div>
					{/if}
				</div>
			{:else if hasSearched}
				<p class="mt-6 text-center text-sm text-text-muted">End of results</p>
			{/if}
		{:else if hasSearched}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<div class="mb-3 text-4xl">🔍</div>
				<p class="text-sm text-text-secondary">No anime found matching your search</p>
				<p class="mt-1 text-xs text-text-muted">Try different keywords or filters</p>
			</div>
		{:else}
			<div class="w-full">
				<RecommenderWidgets />
			</div>
		{/if}
	</div>
</div>
