<script lang="ts">
	let { watched, total }: { watched: number; total: number } = $props();
	const percent = $derived(total > 0 ? Math.max(0, Math.min(100, (watched / total) * 100)) : 0);
</script>

<div
	class="episode-progress"
	class:complete={total > 0 && watched >= total}
	role="progressbar"
	aria-label="Episodes watched"
	aria-valuenow={total > 0 ? Math.min(watched, total) : undefined}
	aria-valuemin={0}
	aria-valuemax={total > 0 ? total : undefined}
	aria-valuetext="{watched} of {total > 0 ? total : 'unknown'} episodes"
>
	{#if total > 0 && total <= 30}
		{#each Array(total) as _, i (i)}<span class:filled={i < watched}></span>{/each}
	{:else}
		<span class="continuous" style:width="{percent}%"></span>
	{/if}
</div>

<style>
	.episode-progress {
		display: flex;
		gap: 3px;
		width: 100%;
		height: 5px;
		border-radius: 3px;
		background: var(--color-surface-3);
		overflow: hidden;
	}
	span {
		flex: 1;
		background: var(--color-surface-3);
		border-radius: 2px;
	}
	span.filled,
	.continuous {
		background: var(--color-primary);
		box-shadow: inset 0 1px 0 #ffffff25;
	}
	.continuous {
		flex: none;
		transition: width 0.18s ease;
	}
	.complete span.filled,
	.complete .continuous {
		background: var(--color-success);
	}
</style>
