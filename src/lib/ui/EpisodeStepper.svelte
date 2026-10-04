<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { Plus, Minus, Check } from 'lucide-svelte';
	import EpisodeBar from './EpisodeBar.svelte';

	let {
		malId,
		title,
		watched,
		total,
		size = 'row'
	}: {
		malId: number;
		title: string;
		watched: number;
		total: number;
		/** row: ledger and detail; card: poster grid (fills the card width). */
		size?: 'row' | 'card';
	} = $props();

	const complete = $derived(total > 0 && watched >= total);

	function increment() {
		const result = userListStore.incrementEpisode(malId);
		if (result && result.total > 0 && result.watched >= result.total)
			userListStore.triggerCompletePrompt(malId);
	}
</script>

<div class="stepper {size}" class:complete>
	<button
		type="button"
		class="step minus"
		disabled={watched <= 0}
		aria-label="Decrease episode count for {title}"
		onclick={() => userListStore.setEpisodeCount(malId, watched - 1)}><Minus size={16} /></button
	>
	<div class="count">
		<span class="num"
			><strong>{watched}</strong><span class="of">/ {total > 0 ? total : '?'}</span></span
		>
		<EpisodeBar {watched} {total} class="count-bar" />
	</div>
	<button
		type="button"
		class="step plus"
		disabled={complete}
		aria-label={complete ? `${title}: all episodes watched` : `Mark episode ${watched + 1} watched`}
		onclick={increment}
		>{#if complete}<Check size={17} strokeWidth={2.4} />{:else}<Plus
				size={17}
				strokeWidth={2.4}
			/>{/if}</button
	>
</div>

<style>
	.stepper {
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 44px;
		align-items: stretch;
		width: 100%;
		min-height: 44px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-m);
		background: var(--color-surface-1);
		overflow: hidden;
	}
	.step {
		display: grid;
		place-items: center;
		min-height: 44px;
		color: var(--color-text-secondary);
		transition:
			background-color 0.15s,
			color 0.15s,
			transform 0.1s;
	}
	.step:hover:not(:disabled) {
		background: var(--color-surface-3);
		color: var(--color-text-primary);
	}
	.step:active:not(:disabled) {
		transform: scale(0.9);
	}
	.step:disabled {
		opacity: 0.35;
	}
	/* The one-tap action carries the accent. */
	.plus {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}
	.plus:hover:not(:disabled) {
		background: var(--color-primary-hover);
		color: var(--color-on-primary);
	}
	.complete .plus {
		background: color-mix(in srgb, var(--color-success) 22%, var(--color-surface-1));
		color: var(--color-success);
		opacity: 1;
	}
	.count {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 0 10px;
		min-width: 0;
	}
	.count .num {
		white-space: nowrap;
	}
	.card .count {
		padding: 0 2px;
	}
	.card .of {
		margin-left: 1px;
	}
	.count strong {
		font-size: 14px;
		font-weight: 650;
		color: var(--color-text-primary);
	}
	.of {
		margin-left: 3px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.count :global(.count-bar) {
		max-width: 96px;
	}
</style>
