<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { getSeasonal } from '$lib/api/mal';
	import { getMetaRecord, setMeta } from '$lib/cache/meta.cache';
	import { mapMalNodeToDisplay, type DisplayAnime } from '$lib/utils/types';
	import { getCurrentSeason, prevSeason, nextSeason, type Season } from '$lib/utils/season';
	import { formatMediaType, capitalize } from '$lib/utils/format';
	import { ChevronLeft, ChevronRight, ArrowUpDown, Mic } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import SearchResultCard from '$lib/ui/SearchResultCard.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';

	// ─── Season State ───

	const current = getCurrentSeason();
	const urlYear = $derived(Number(getUrlParam($page.url, 'year', String(current.year))));
	const urlSeason = $derived(getUrlParam($page.url, 'season', current.season) as Season);

	const seasonYear = $derived(urlYear || current.year);
	const seasonKey = $derived(urlSeason || current.season);

	const prev = $derived(prevSeason(seasonYear, seasonKey));
	const next = $derived(nextSeason(seasonYear, seasonKey));

	// ─── Data ───

	let anime = $state<DisplayAnime[]>([]);
	let loading = $state(true);
	let filterType = $state('');
	let sortByRating = $state(false);

	const filteredAnime = $derived.by(() => {
		let res = filterType
			? anime.filter((a) => a.mediaType.toLowerCase() === filterType.toLowerCase())
			: [...anime];

		if (dubStore.dubMode) {
			res = res.filter((a) => dubStore.hasDub(a.malId));
		}

		if (sortByRating) {
			res.sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
		}
		return res;
	});

	const TYPES = [
		{ value: '', label: 'All' },
		{ value: 'tv', label: 'TV' },
		{ value: 'movie', label: 'Movie' },
		{ value: 'ova', label: 'OVA' },
		{ value: 'special', label: 'Special' },
		{ value: 'ona', label: 'ONA' }
	];

	// ─── Fetch ───

	async function loadSeason() {
		const cacheKey = `seasonal:${seasonYear}:${seasonKey}`;
		const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

		const cached = await getMetaRecord<DisplayAnime[]>(cacheKey);
		const isStale = !cached || Date.now() - cached.updatedAt > CACHE_TTL;

		if (cached) {
			anime = cached.value;
			loading = false;
		} else {
			loading = true;
			anime = [];
		}

		if (isStale) {
			const result = await getSeasonal(seasonYear, seasonKey, { limit: 100 });

			if (result.ok) {
				const fetchedAnime = result.value.data.map((item) => mapMalNodeToDisplay(item.node));
				await setMeta(cacheKey, fetchedAnime);
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

<div class="mx-auto max-w-7xl px-4 py-6">
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

	<!-- Type Filter and Sort -->
	<div class="mt-5 flex flex-wrap items-center justify-between gap-4">
		<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
			{#each TYPES as t}
				<button
					onclick={() => (filterType = t.value)}
					class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
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
				class="flex shrink-0 items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-sm transition-all duration-500 ease-spring hover:bg-white/10 hover:text-text-primary active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] {sortByRating
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
			<div
				class="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
			>
				{#each Array(10) as _}
					<div class="animate-pulse rounded-xl border border-border bg-surface-1 p-3">
						<div class="aspect-[3/4] rounded-lg bg-surface-2"></div>
						<div class="mt-3 h-4 w-3/4 rounded bg-surface-2"></div>
						<div class="mt-2 h-3 w-1/2 rounded bg-surface-2"></div>
					</div>
				{/each}
			</div>
		{:else if filteredAnime.length > 0}
			<div
				class="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
			>
				{#each filteredAnime as anime (anime.malId)}
					<SearchResultCard {anime} />
				{/each}
			</div>

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
