<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getUrlParam, setUrlParams } from '#lib/utils/url-state.js';
	import { getSeasonal } from '#lib/api/mal.js';
	import { getSeasonalCache, setSeasonalCache } from '#lib/cache/meta.cache.js';
	import { mapMalNodeToDisplay, type DisplayAnime } from '#lib/utils/types.js';
	import { getCurrentSeason, prevSeason, nextSeason, type Season } from '#lib/utils/season.js';
	import { capitalize } from '#lib/utils/format.js';
	import { ChevronLeft, ChevronRight, Dices } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import SearchResultCard from '#lib/ui/SearchResultCard.svelte';
	import SearchResultRow from '#lib/ui/SearchResultRow.svelte';
	import ResultsLayout from '#lib/ui/ResultsLayout.svelte';
	import ResultsBar from '#lib/ui/ResultsBar.svelte';
	import ResultsSkeleton from '#lib/ui/skeletons/ResultsSkeleton.svelte';
	import { settingsStore } from '#lib/stores/settings.svelte.js';
	import { dubStore } from '#lib/stores/dub.svelte.js';
	import FilterPanel from '#lib/ui/FilterPanel.svelte';
	import SortMenu from '#lib/ui/SortMenu.svelte';
	import { userListStore } from '#lib/stores/userlist.svelte.js';
	import {
		facetOfDisplay,
		matchesFilters,
		buildFacetOptions,
		filtersFromUrl,
		filtersToPairs,
		activeFilterCount,
		pickRandom,
		type AnimeFilters
	} from '#lib/utils/filters.js';
	import { sortDisplay, NATURAL_DIR, type SortKey, type SortDir } from '#lib/utils/sort.js';

	// ─── Season State ───

	const current = getCurrentSeason();
	const urlYear = $derived(Number(getUrlParam(page.url, 'year', String(current.year))));
	const VALID_SEASONS = new Set<string>(['winter', 'spring', 'summer', 'fall']);
	const urlSeason = $derived.by(() => {
		const raw = getUrlParam(page.url, 'season', current.season);
		return VALID_SEASONS.has(raw) ? (raw as Season) : current.season;
	});

	const seasonYear = $derived(urlYear || current.year);
	const seasonKey = $derived(urlSeason || current.season);

	const prev = $derived(prevSeason(seasonYear, seasonKey));
	const next = $derived(nextSeason(seasonYear, seasonKey));

	// ─── Data ───

	let anime = $state.raw<DisplayAnime[]>([]);
	let loading = $state(true);
	let sliceLimit = $state(40);

	const SORTS: { value: '' | SortKey; label: string }[] = [
		{ value: '', label: 'Default order' },
		{ value: 'popularity', label: 'Popularity' },
		{ value: 'mean', label: 'Rating' },
		{ value: 'start', label: 'Release date' },
		{ value: 'episodes', label: 'Episodes' },
		{ value: 'title', label: 'Title' }
	];
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
	const facetOptions = $derived(buildFacetOptions(anime.map(facetOfDisplay), filters));

	function setParams(pairs: { key: string; value: string }[], replace = false) {
		goto(setUrlParams(page.url, pairs), { reset: false, replace });
	}
	function setFilters(updated: AnimeFilters) {
		setParams(filtersToPairs(updated), true);
	}

	// Reset paging whenever the visible set changes.
	$effect(() => {
		void [seasonYear, seasonKey, page.url.search, dubStore.dubMode];
		sliceLimit = 40;
	});

	const filteredAnime = $derived.by(() => {
		const f = filters;
		const dubOnly = dubStore.dubMode && dubStore.isReady;
		const matched = anime.filter(
			(a) =>
				(!dubOnly || dubStore.hasDub(a.malId)) &&
				matchesFilters(f, facetOfDisplay(a), {
					inList: (id) => userListStore.getEntry(id) !== undefined
				})
		);
		return sortDisplay(matched, sortKey, sortDir);
	});

	const displayedAnime = $derived(filteredAnime.slice(0, sliceLimit));
	const view = $derived(settingsStore.views.seasonal);

	function randomPick() {
		const pick = pickRandom(filteredAnime);
		if (pick) goto(`/anime/${pick.malId}`);
	}

	// ─── Fetch ───

	const SEASONAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
	// MAL's season endpoint defaults to 100 results; a season has more, and the max is 500.
	const SEASON_FETCH_LIMIT = 500;

	async function loadSeason() {
		const year = seasonYear;
		const season = seasonKey;
		const cacheKey = `seasonal:${year}:${season}`;
		// Ignore responses for a season the user has already navigated away from.
		const isCurrent = () => year === seasonYear && season === seasonKey;

		const cached = await getSeasonalCache(cacheKey);
		if (!isCurrent()) return;
		const isStale = !cached || Date.now() - cached.updatedAt > SEASONAL_CACHE_TTL_MS;

		if (cached) {
			anime = cached.value;
			loading = false;
		} else {
			loading = true;
			anime = [];
		}

		if (isStale) {
			const result = await getSeasonal(year, season, { limit: SEASON_FETCH_LIMIT });
			if (!isCurrent()) return;

			if (result.ok) {
				const fetchedAnime = result.value.data.map((item) => mapMalNodeToDisplay(item.node));
				await setSeasonalCache(cacheKey, fetchedAnime);
				anime = fetchedAnime;
			} else if (!cached) {
				toast.error('Failed to load seasonal anime');
			}
			loading = false;
		}
	}

	// ─── Navigation ───

	function goToSeason(year: number, season: Season) {
		// Keep filters/sort while hopping between seasons.
		goto(
			setUrlParams(page.url, [
				{ key: 'year', value: String(year) },
				{ key: 'season', value: season }
			]),
			{ reset: false }
		);
	}

	// ─── Lifecycle ───

	let prevSeasonKey = '';

	$effect(() => {
		const key = `${seasonYear}-${seasonKey}`;
		if (key !== prevSeasonKey) {
			prevSeasonKey = key;
			loadSeason();
		}
	});
</script>

{#snippet trailing()}
	<button
		type="button"
		onclick={randomPick}
		disabled={filteredAnime.length === 0}
		title="Open a random title from the current view"
		aria-label="Random pick from the {filteredAnime.length} shown"
		class="flex h-9 w-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-white/5 bg-white/5 text-sm text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary active:scale-95 disabled:opacity-40 sm:h-10 sm:w-auto sm:px-4"
	>
		<Dices size={15} /><span class="hidden sm:inline">Random</span>
	</button>
	<SortMenu
		options={SORTS}
		value={sortKey ?? ''}
		dir={sortDir}
		label="Sort season"
		dirDisabled={!sortKey}
		onselect={(v) =>
			setParams([
				{ key: 'sort', value: v },
				{ key: 'dir', value: '' }
			])}
		ondir={() => {
			const flipped = sortDir === 'asc' ? 'desc' : 'asc';
			setParams([
				{ key: 'dir', value: sortKey && flipped === NATURAL_DIR[sortKey] ? '' : flipped }
			]);
		}}
	/>
{/snippet}

<svelte:head>
	<title>Seasonal | AniDash</title>
</svelte:head>

<div class="py-6">
	<!-- Header -->
	<div class="flex items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-text-primary">
				{capitalize(seasonKey)}
				{seasonYear}
			</h1>
			<p class="mt-1 text-sm text-text-secondary">
				{anime.length} anime this season
			</p>
		</div>

		<!-- Season Navigation -->
		<div class="flex items-center gap-2">
			<button
				onclick={() => goToSeason(prev.year, prev.season)}
				class="flex items-center gap-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
			>
				<ChevronLeft size={16} />
				<span class="hidden sm:inline">{capitalize(prev.season)} {prev.year}</span>
			</button>

			{#if seasonYear !== current.year || seasonKey !== current.season}
				<button
					onclick={() => goToSeason(current.year, current.season)}
					class="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
				>
					Current
				</button>
			{/if}

			<button
				onclick={() => goToSeason(next.year, next.season)}
				class="flex items-center gap-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
			>
				<span class="hidden sm:inline">{capitalize(next.season)} {next.year}</span>
				<ChevronRight size={16} />
			</button>
		</div>
	</div>

	<!-- Filters · sort · random, one inline toolbar -->
	<div class="mt-5">
		<FilterPanel {filters} options={facetOptions} mode="season" onchange={setFilters} {trailing} />
	</div>

	<!-- Results -->
	<div class="mt-5">
		<ResultsBar section="seasonal">
			{filteredAnime.length}
			{filteredAnime.length === 1 ? 'title' : 'titles'}{#if filteredAnime.length < anime.length}
				&nbsp;· filtered from {anime.length}{/if}
		</ResultsBar>

		{#if loading}
			<ResultsSkeleton {view} />
		{:else if filteredAnime.length > 0}
			<ResultsLayout {view}>
				{#each displayedAnime as anime, i (anime.malId)}
					{#if view === 'list'}
						<SearchResultRow {anime} index={i} />
					{:else}
						<SearchResultCard {anime} index={i} />
					{/if}
				{/each}
			</ResultsLayout>

			{#if filteredAnime.length > sliceLimit}
				<div class="mt-8 flex justify-center">
					<button
						onclick={() => (sliceLimit += 40)}
						class="rounded-xl border border-white/10 bg-surface-1 px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-2 transition-all active:scale-95 shadow-md"
					>
						Load More
					</button>
				</div>
			{/if}
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<div class="mb-3 text-4xl">🌸</div>
				<p class="text-sm text-text-secondary">
					{filterCount > 0
						? 'No anime this season match your filters'
						: 'No anime found for this season'}
				</p>
			</div>
		{/if}
	</div>
</div>
