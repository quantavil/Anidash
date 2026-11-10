<script lang="ts">
	import type { UserListRecord } from '#lib/cache/db.js';
	import { untrack } from 'svelte';
	import type { ViewMode } from '#lib/stores/settings.svelte.js';
	import AnimeCard from './AnimeCard.svelte';
	import AnimeRow from './AnimeRow.svelte';
	import ResultsLayout from './ResultsLayout.svelte';
	import ResultsSkeleton from './skeletons/ResultsSkeleton.svelte';

	let {
		entries = [],
		loading = false,
		view = 'grid',
		resetKey,
		empty = { title: 'No anime found', hint: 'Try a different filter or add anime from Browse' }
	}: {
		entries: UserListRecord[];
		loading?: boolean;
		view?: ViewMode;
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
	<ResultsSkeleton {view} count={12} />
{:else if entries.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
	>
		<div class="mb-3 text-4xl">📺</div>
		<p class="text-sm text-text-secondary">{empty.title}</p>
		<p class="mt-1 text-xs text-text-muted">{empty.hint}</p>
		{#if empty.href && empty.cta}
			<a
				href={empty.href}
				class="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
			>
				{empty.cta}
			</a>
		{/if}
	</div>
{:else}
	<ResultsLayout {view}>
		{#each visibleEntries as entry, i (entry.malId)}
			{#if view === 'list'}
				<AnimeRow {entry} index={i} />
			{:else}
				<AnimeCard {entry} index={i} />
			{/if}
		{/each}
	</ResultsLayout>

	{#if limit < entries.length}
		<!-- Infinite scroll loader anchor -->
		<div bind:this={loaderRef} class="h-10 w-full mt-4"></div>
	{/if}
{/if}
