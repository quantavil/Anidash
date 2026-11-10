<script lang="ts">
	import type { ViewMode } from '#lib/stores/settings.svelte.js';
	import ResultsLayout from '../ResultsLayout.svelte';
	import AnimeCardSkeleton from './AnimeCardSkeleton.svelte';

	let { view, count = 10 }: { view: ViewMode; count?: number } = $props();
</script>

<ResultsLayout {view}>
	{#if view === 'list'}
		{#each Array(count) as _, i (i)}
			<div class="flex animate-pulse gap-3 rounded-lg border border-border bg-surface-1 p-2.5">
				<div class="aspect-[3/4] w-20 shrink-0 rounded-md bg-surface-2 sm:w-24"></div>
				<div class="flex-1 space-y-2 pt-1">
					<div class="h-4 w-3/4 rounded bg-surface-2"></div>
					<div class="h-3 w-1/2 rounded bg-surface-2"></div>
					<div class="h-3 w-1/3 rounded bg-surface-2"></div>
					<div class="h-5 w-2/3 rounded bg-surface-2"></div>
				</div>
			</div>
		{/each}
	{:else}
		<AnimeCardSkeleton {count} />
	{/if}
</ResultsLayout>
