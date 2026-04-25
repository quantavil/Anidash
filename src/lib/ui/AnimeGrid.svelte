<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import { untrack } from 'svelte';
	import AnimeCard from './AnimeCard.svelte';
	import AnimeCardSkeleton from './skeletons/AnimeCardSkeleton.svelte';

	let {
		entries = [],
		loading = false,
		resetKey,
		onComplete
	}: {
		entries: UserListRecord[];
		loading?: boolean;
		resetKey?: string;
		onComplete?: (malId: number) => void;
	} = $props();

	// Infinite scrolling state
	const PAGE_SIZE = 40;
	let limit = $state(PAGE_SIZE);
	let loaderRef = $state<HTMLElement | null>(null);

	// Reset limit when entries change (e.g., changing tabs, sorting, filtering)
	$effect(() => {
		if (resetKey !== undefined) {
			resetKey;
		} else {
			entries;
		}
		untrack(() => {
			limit = PAGE_SIZE;
		});
	});

	// Setup intersection observer for infinite scroll
	$effect(() => {
		if (!loaderRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					limit += PAGE_SIZE;
				}
			},
			{ rootMargin: '400px' }
		);

		observer.observe(loaderRef);

		return () => {
			observer.disconnect();
		};
	});

	const visibleEntries = $derived(entries.slice(0, limit));
</script>

{#if loading}
	<div
		class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
	>
		<AnimeCardSkeleton count={12} />
	</div>
{:else if entries.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
	>
		<div class="mb-3 text-4xl">📺</div>
		<p class="text-sm text-text-secondary">No anime found</p>
		<p class="mt-1 text-xs text-text-muted">Try a different filter or add anime from Browse</p>
	</div>
{:else}
	<div
		class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
	>
		{#each visibleEntries as entry, i (entry.malId)}
			<AnimeCard {entry} {onComplete} index={i} />
		{/each}
	</div>

	{#if limit < entries.length}
		<!-- Infinite scroll loader anchor -->
		<div bind:this={loaderRef} class="h-10 w-full mt-4"></div>
	{/if}
{/if}
