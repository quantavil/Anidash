<script lang="ts">
	import { page } from '$app/stores';
	import { getSchedule } from '$lib/api/jikan';
	import { getMetaRecord, setMeta } from '$lib/cache/meta.cache';
	import { mapJikanToDisplay, type DisplayAnime } from '$lib/utils/types';
	import { capitalize } from '$lib/utils/format';
	import { toast } from 'svelte-sonner';
	import SearchResultCard from '$lib/ui/SearchResultCard.svelte';

	const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

	// ─── State ───

	let currentDay = $state(
		DAYS[(new Date().getDay() + 6) % 7] // getDay() is 0 (Sun) - 6 (Sat). We want Monday start. So (0+6)%7 = 6 (Sunday). (1+6)%7 = 0 (Monday).
	);

	let anime = $state<DisplayAnime[]>([]);
	let loading = $state(true);

	// ─── Fetch ───

	async function loadSchedule(day: string) {
		const cacheKey = `schedule:${day}`;
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
			const result = await getSchedule(day);

			if (result.ok) {
				const fetchedAnime = result.value.anime.map(mapJikanToDisplay);
				// Sort by score (descending) as airing schedules aren't natively rated highly, helps bubble up popular airing shows
				fetchedAnime.sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
				await setMeta(cacheKey, fetchedAnime);
				anime = fetchedAnime;
			} else if (!cached) {
				toast.error(`Failed to load ${capitalize(day)} schedule`);
			}
			loading = false;
		}
	}

	$effect(() => {
		loadSchedule(currentDay);
	});
</script>

<div class="mx-auto max-w-7xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-text-primary">Weekly Airing Schedule</h1>
		<p class="mt-1 text-sm text-text-secondary">
			Track simulcasts dynamically updated every 24 hours
		</p>
	</div>

	<!-- Day Picker Tabs -->
	<div
		class="mb-6 flex overflow-x-auto rounded-xl border border-border bg-surface-1 p-1 scrollbar-none"
	>
		{#each DAYS as day}
			<button
				onclick={() => {
					currentDay = day;
				}}
				class="flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors
					{currentDay === day
					? 'bg-primary/20 text-primary'
					: 'text-text-muted hover:bg-surface-2 hover:text-text-secondary'}"
			>
				{capitalize(day)}
			</button>
		{/each}
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
		{:else if anime.length > 0}
			<div
				class="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
			>
				{#each anime as item (item.malId)}
					<SearchResultCard anime={item} />
				{/each}
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<div class="mb-3 text-4xl">📅</div>
				<p class="text-sm text-text-secondary">No anime airing on {capitalize(currentDay)}</p>
			</div>
		{/if}
	</div>
</div>
