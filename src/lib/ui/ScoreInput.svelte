<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { Star } from 'lucide-svelte';

	let { malId, score }: { malId: number; score: number } = $props();
	const descriptions = [
		'Not rated',
		'Appalling',
		'Horrible',
		'Very bad',
		'Bad',
		'Average',
		'Fine',
		'Good',
		'Very good',
		'Great',
		'Masterpiece'
	];
</script>

<div class="rating" role="group" aria-label="Your rating">
	<div class="rating-heading">
		<span>Your rating</span>
		<span class="rating-value"
			><Star size={18} aria-hidden="true" /><strong>{score || '—'}</strong><span>/ 10</span></span
		>
	</div>
	<div class="rating-options">
		{#each Array.from({ length: 10 }, (_, i) => i + 1) as value (value)}
			<button
				type="button"
				aria-label="Rate {value} out of 10"
				aria-pressed={score === value}
				title={descriptions[value]}
				onclick={() => userListStore.setScore(malId, score === value ? 0 : value)}>{value}</button
			>
		{/each}
	</div>
	<div class="rating-footer">
		<span aria-live="polite">{descriptions[score] ?? descriptions[0]}</span>
		{#if score > 0}
			<button
				type="button"
				onclick={() => userListStore.setScore(malId, 0)}
				aria-label="Clear rating">Clear</button
			>
		{/if}
	</div>
</div>

<style>
	.rating {
		width: 100%;
		min-width: 0;
	}
	.rating-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
		color: var(--color-text-primary);
		font-size: 14px;
	}
	.rating-value {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--color-warning);
	}
	.rating-value > span {
		color: var(--color-text-secondary);
		font-size: 12px;
	}
	.rating-options {
		display: grid;
		grid-template-columns: repeat(5, minmax(44px, 1fr));
		gap: 6px;
	}
	.rating-options button {
		min-width: 44px;
		min-height: 48px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-3);
		color: var(--color-text-secondary);
		font-size: 14px;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition:
			background-color 120ms,
			border-color 120ms,
			color 120ms;
	}
	.rating-options button:hover {
		border-color: var(--color-primary);
		color: var(--color-text-primary);
	}
	.rating-options button[aria-pressed='true'] {
		background: var(--color-primary-dim);
		border-color: var(--color-primary);
		color: var(--color-text-primary);
		font-weight: 700;
	}
	.rating-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 44px;
		color: var(--color-text-secondary);
		font-size: 12px;
	}
	.rating-footer button {
		min-width: 44px;
		min-height: 44px;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.rating-footer button:hover {
		color: var(--color-text-primary);
	}
	@media (max-width: 380px) {
		.rating-options {
			gap: 4px;
		}
	}
</style>
