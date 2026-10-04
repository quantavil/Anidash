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
	import EmptyState from '$lib/ui/EmptyState.svelte';
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
	let sliceLimit = $state(30);
	let sentinel = $state<HTMLElement | null>(null);

	$effect(() => {
		// Reset slice limit when search filters or season changes
		const _trigger = `${seasonYear}-${seasonKey}-${filterType}-${sortByRating}-${dubStore.dubMode}`;
		sliceLimit = 30;
	});

	// Reveal more posters shortly before the end of the grid scrolls into view.
	$effect(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(hits) => {
				if (hits[0]?.isIntersecting) sliceLimit += 30;
			},
			{ rootMargin: '600px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
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

	const seasonLabel = $derived(`${capitalize(seasonKey)} ${seasonYear}`);
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

<div class="page">
	<div class="page-head">
		<div>
			<h1 class="page-title">{seasonLabel}</h1>
			<p class="page-sub num">
				{loading ? 'Loading…' : `${anime.length} anime this season`}
			</p>
		</div>

		<div class="season-nav" role="group" aria-label="Change season">
			<button
				class="btn"
				aria-label="Previous season: {capitalize(prev.season)} {prev.year}"
				onclick={() => goToSeason(prev.year, prev.season)}
				><ChevronLeft size={17} /><span class="lbl">{capitalize(prev.season)} {prev.year}</span
				></button
			>
			{#if seasonYear !== current.year || seasonKey !== current.season}
				<button class="btn" onclick={() => goToSeason(current.year, current.season)}>Now</button>
			{/if}
			<button
				class="btn"
				aria-label="Next season: {capitalize(next.season)} {next.year}"
				onclick={() => goToSeason(next.year, next.season)}
				><span class="lbl">{capitalize(next.season)} {next.year}</span><ChevronRight
					size={17}
				/></button
			>
		</div>
	</div>

	<div class="bar">
		<div class="scroller scrollbar-none" role="group" aria-label="Format">
			{#each TYPES as t (t.value)}
				<button
					class="chip"
					aria-pressed={filterType === t.value}
					onclick={() => (filterType = t.value)}>{t.label}</button
				>
			{/each}
		</div>
		<button
			class="chip sort"
			aria-pressed={sortByRating}
			onclick={() => (sortByRating = !sortByRating)}
			><ArrowUpDown size={14} class="mr-1.5" />Top rated</button
		>
	</div>

	<div class="results">
		{#if loading}
			<div class="poster-grid"><AnimeCardSkeleton count={12} /></div>
		{:else if filteredAnime.length > 0}
			<div class="poster-grid">
				{#each displayedAnime as anime, i (anime.malId)}
					<SearchResultCard {anime} index={i} season={seasonLabel} />
				{/each}
			</div>
			{#if filteredAnime.length > sliceLimit}
				<div bind:this={sentinel} class="more">
					<button class="btn" onclick={() => (sliceLimit += 30)}
						>Show more <span class="muted num">{filteredAnime.length - sliceLimit} left</span
						></button
					>
				</div>
			{/if}
		{:else}
			<EmptyState
				title={filterType
					? `No ${formatMediaType(filterType)} anime this season`
					: 'No anime found for this season'}
				hint="Try another format or season."
			/>
		{/if}
	</div>
</div>

<style>
	.season-nav {
		display: flex;
		gap: 8px;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.scroller {
		display: flex;
		gap: 8px;
		padding: 4px 0;
		overflow-x: auto;
		min-width: 0;
		mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent);
	}
	.results {
		margin-top: 20px;
	}
	.more {
		display: flex;
		justify-content: center;
		padding: 32px 0 8px;
	}
	.muted {
		color: var(--color-text-muted);
		font-weight: 400;
	}
	@media (max-width: 640px) {
		.lbl {
			display: none;
		}
		.season-nav .btn {
			width: 44px;
			padding: 0;
		}
		.season-nav .btn:nth-child(2):not(:last-child) {
			width: auto;
			padding: 0 14px;
		}
	}
</style>
