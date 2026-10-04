<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import { untrack } from 'svelte';
	import AnimeCard from './AnimeCard.svelte';
	import AnimeCardSkeleton from './skeletons/AnimeCardSkeleton.svelte';
	import EmptyState from './EmptyState.svelte';

	let {
		entries = [],
		loading = false,
		resetKey,
		empty = { title: 'No anime found', hint: 'Try a different filter or add anime from Browse' }
	}: {
		entries: UserListRecord[];
		loading?: boolean;
		resetKey?: string;
		/** Copy (and optional call-to-action) shown when there is nothing to list. */
		empty?: { title: string; hint: string; href?: string; cta?: string };
	} = $props();

	// Infinite scrolling state
	const PAGE_SIZE = 40;
	let limit = $state(PAGE_SIZE);
	let loaderRef = $state<HTMLElement | null>(null);

	// Reset limit when entries change (e.g., changing tabs, sorting, filtering)
	$effect(() => {
		if (resetKey !== undefined) {
			void resetKey;
		}
		untrack(() => {
			limit = PAGE_SIZE;
		});
	});

	// Setup intersection observer for infinite scroll
	$effect(() => {
		if (!loaderRef) return;

		const observer = new IntersectionObserver(
			(intersectingEntries) => {
				if (intersectingEntries[0]?.isIntersecting) {
					untrack(() => {
						if (limit < entries.length) {
							limit += PAGE_SIZE;
						}
					});
				}
			},
			{ rootMargin: '300px' }
		);

		observer.observe(loaderRef);

		return () => {
			observer.disconnect();
		};
	});

	const visibleEntries = $derived(entries.slice(0, limit));
</script>

{#if loading}
	<div class="poster-grid">
		<AnimeCardSkeleton count={12} />
	</div>
{:else if entries.length === 0}
	<EmptyState {...empty} />
{:else}
	<div class="poster-grid">
		{#each visibleEntries as entry, i (entry.malId)}
			<AnimeCard {entry} index={i} />
		{/each}
	</div>

	{#if limit < entries.length}
		<div bind:this={loaderRef} class="mt-4 h-10 w-full"></div>
	{/if}
{/if}
