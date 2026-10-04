<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getUrlParam } from '$lib/utils/url-state';
	import { getSeasonal } from '$lib/api/mal';
	import { getSeasonalCache, setSeasonalCache } from '$lib/cache/meta.cache';
	import { mapMalNodeToDisplay, type DisplayAnime } from '$lib/utils/types';
	import { getCurrentSeason, prevSeason, nextSeason, type Season } from '$lib/utils/season';
	import { formatMediaType, capitalize } from '$lib/utils/format';
	import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import SearchResultCard from '$lib/ui/SearchResultCard.svelte';
	import AnimeCardSkeleton from '$lib/ui/skeletons/AnimeCardSkeleton.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { MEDIA_TYPE_FILTER_OPTIONS } from '$lib/constants';

	// ─── Season State ───

	const current = getCurrentSeason();
	const urlYear = $derived(Number(getUrlParam(page.url, 'year', String(current.year))));
	const VALID_SEASONS: Season[] = ['winter', 'spring', 'summer', 'fall'];
	const urlSeason = $derived.by(() => {
		const raw = getUrlParam(page.url, 'season', current.season);
		return VALID_SEASONS.includes(raw as Season) ? (raw as Season) : current.season;
	});

	const seasonYear = $derived(urlYear || current.year);
	const seasonKey = $derived(urlSeason || current.season);

	const prev = $derived(prevSeason(seasonYear, seasonKey));
	const next = $derived(nextSeason(seasonYear, seasonKey));

	// ─── Data ───

	let anime = $state.raw<DisplayAnime[]>([]);
	let loading = $state(true);
	let filterType = $state('');
	let sortByRating = $state(false);
	let sliceLimit = $state(20);

	$effect(() => {
		// Reset slice limit when search filters or season changes
		const _trigger = `${seasonYear}-${seasonKey}-${filterType}-${sortByRating}-${dubStore.dubMode}`;
		sliceLimit = 20;
	});

	const filteredAnime = $derived.by(() => {
		let res = filterType
			? anime.filter((a) => a.mediaType.toLowerCase() === filterType.toLowerCase())
			: [...anime];

		if (dubStore.dubMode && dubStore.isReady) {
			res = res.filter((a) => dubStore.hasDub(a.malId));
		}

		if (sortByRating) {
			res.sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
		}
		return res;
	});

	const displayedAnime = $derived(filteredAnime.slice(0, sliceLimit));

	const TYPES = MEDIA_TYPE_FILTER_OPTIONS;

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
		goto(`/seasonal?year=${year}&season=${season}`);
	}

	// ─── Lifecycle ───

	let prevSeasonKey = '';

	$effect(() => {
		const key = `${seasonYear}-${seasonKey}`;
		if (key !== prevSeasonKey) {
			prevSeasonKey = key;
			filterType = '';
			loadSeason();
		}
	});
</script>

<svelte:head>
	<title>Seasonal | AniDash</title>
</svelte:head>

<div class="py-6">
	<!-- Header -->
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="route-title">
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
				aria-label="Previous season: {capitalize(prev.season)} {prev.year}"
				onclick={() => goToSeason(prev.year, prev.season)}
				class="flex items-center gap-1 min-h-11 min-w-11 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
			>
				<ChevronLeft size={16} />
				<span class="hidden sm:inline">{capitalize(prev.season)} {prev.year}</span>
			</button>

			{#if seasonYear !== current.year || seasonKey !== current.season}
				<button
					onclick={() => goToSeason(current.year, current.season)}
					class="min-h-11 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
				>
					Current
				</button>
			{/if}

			<button
				aria-label="Next season: {capitalize(next.season)} {next.year}"
				onclick={() => goToSeason(next.year, next.season)}
				class="flex items-center gap-1 min-h-11 min-w-11 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
			>
				<span class="hidden sm:inline">{capitalize(next.season)} {next.year}</span>
				<ChevronRight size={16} />
			</button>
		</div>
	</div>

	<!-- Type Filter and Sort -->
	<div class="mt-5 flex flex-wrap items-center justify-between gap-4">
		<div class="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-none">
			{#each TYPES as t, _idx (_idx)}
				<button
					onclick={() => (filterType = t.value)}
					aria-pressed={filterType === t.value}
					class="min-h-11 min-w-11 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
			  {filterType === t.value
						? 'bg-primary/15 text-primary'
						: 'bg-surface-1 text-text-muted hover:bg-surface-2 hover:text-text-secondary'}"
				>
					{t.label}
				</button>
			{/each}
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => (sortByRating = !sortByRating)}
				aria-pressed={sortByRating}
				class="min-h-11 flex shrink-0 items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-sm transition-all duration-500 ease-spring hover:bg-white/10 hover:text-text-primary active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] {sortByRating
					? 'text-primary border-primary/30'
					: 'text-text-secondary'}"
			>
				<ArrowUpDown size={14} />
				Rating
			</button>
		</div>
	</div>

	<!-- Results -->
	<div class="mt-6">
		{#if loading}
			<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				<AnimeCardSkeleton count={10} />
			</div>
		{:else if filteredAnime.length > 0}
			<div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each displayedAnime as anime, i (anime.malId)}
					<SearchResultCard {anime} index={i} />
				{/each}
			</div>

			{#if filteredAnime.length > sliceLimit}
				<div class="mt-8 flex justify-center">
					<button
						onclick={() => (sliceLimit += 20)}
						class="min-h-11 rounded-xl border border-white/10 bg-surface-1 px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-2 transition-all active:scale-95 shadow-md"
					>
						Load More
					</button>
				</div>
			{/if}

			{#if filterType && filteredAnime.length < anime.length}
				<p class="mt-4 text-center text-xs text-text-muted">
					Showing {filteredAnime.length} of {anime.length} ({capitalize(seasonKey)}
					{seasonYear})
				</p>
			{/if}
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<div class="mb-3 text-4xl">🌸</div>
				<p class="text-sm text-text-secondary">
					{filterType
						? `No ${formatMediaType(filterType)} anime this season`
						: 'No anime found for this season'}
				</p>
			</div>
		{/if}
	</div>
</div>
