<script lang="ts">
	import AnimeCardSkeleton from './AnimeCardSkeleton.svelte';
</script>

<div class="mx-auto max-w-7xl px-4 py-6">
	<!-- Header skeleton -->
	<div class="mb-6 animate-pulse">
		<div class="h-8 w-48 rounded bg-surface-2"></div>
		<div class="mt-2 h-4 w-64 rounded bg-surface-2"></div>
	</div>

	<!-- Tab skeleton -->
	<div class="mb-4 flex gap-2 animate-pulse">
		{#each Array(6) as _}
			<div class="h-9 w-24 rounded-lg bg-surface-2"></div>
		{/each}
	</div>

	<!-- Controls skeleton -->
	<div class="mb-4 flex items-center gap-3 animate-pulse">
		<div class="h-9 w-48 rounded-lg bg-surface-2"></div>
		<div class="h-9 w-32 rounded-lg bg-surface-2"></div>
		<div class="ml-auto h-9 w-9 rounded-lg bg-surface-2"></div>
	</div>

	<!-- Grid skeleton -->
	<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		<AnimeCardSkeleton count={10} />
	</div>
</div>
