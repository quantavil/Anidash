<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ViewMode } from '#lib/stores/settings.svelte.js';

	// One place for the grid / list container so every section lays results out the same way.
	let { view, children }: { view: ViewMode; children: Snippet } = $props();
</script>

<div
	class={view === 'list'
		? 'grid grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3'
		: 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}
>
	{@render children()}
</div>
