<script lang="ts">
	/** Number of skeleton cards to render */
	let { count = 12 }: { count?: number } = $props();
</script>

{#each Array(count) as _, i (i)}
	<div aria-hidden="true">
		<div class="skeleton" style="aspect-ratio: 2/3"></div>
		<div class="skeleton mt-3 h-3.5 w-4/5"></div>
		<div class="skeleton mt-2 h-3 w-1/2"></div>
	</div>
{/each}
