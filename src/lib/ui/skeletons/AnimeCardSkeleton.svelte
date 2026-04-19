<script lang="ts">
	/** Number of skeleton cards to render */
	let { count = 12 }: { count?: number } = $props();
</script>

{#each Array(count) as _, i}
	<div class="animate-pulse rounded-xl border border-border bg-surface-1 p-3">
		<!-- Image placeholder -->
		<div class="aspect-[3/4] w-full rounded-lg bg-surface-2"></div>
		<!-- Title -->
		<div class="mt-3 h-4 w-3/4 rounded bg-surface-2"></div>
		<!-- Subtitle -->
		<div class="mt-2 h-3 w-1/2 rounded bg-surface-2"></div>
		<!-- Progress bar -->
		<div class="mt-3 h-2 w-full rounded-full bg-surface-2"></div>
		<!-- Score -->
		<div class="mt-2 flex items-center gap-2">
			<div class="h-3 w-8 rounded bg-surface-2"></div>
			<div class="h-3 w-12 rounded bg-surface-2"></div>
		</div>
	</div>
{/each}
