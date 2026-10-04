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

<div class="score-input">
	<div class="score-header">
		<span>Your rating</span>
		<div>
			<Star size={15} fill={score > 0 ? 'currentColor' : 'none'} /><strong
				>{score > 0 ? score : '—'}<span> / 10</span></strong
			>
		</div>
	</div>
	<div class="score-options" role="group" aria-label="Choose your rating out of 10">
		{#each descriptions.slice(1) as description, i (description)}<button
				class:selected={score === i + 1}
				aria-pressed={score === i + 1}
				aria-label="Rate {i + 1} out of 10: {description}"
				title={description}
				onclick={() => userListStore.setScore(malId, score === i + 1 ? 0 : i + 1)}>{i + 1}</button
			>{/each}
	</div>
	<div class="score-footer">
		<span>{descriptions[score] ?? 'Not rated'}</span>{#if score > 0}<button
				onclick={() => userListStore.setScore(malId, 0)}>Clear rating</button
			>{/if}
	</div>
</div>

<style>
	.score-input {
		width: 100%;
	}
	.score-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
		font-size: 13px;
	}
	.score-header > div {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--color-warning);
	}
	.score-header strong {
		font-size: 20px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.score-header strong span {
		font-size: 12px;
		color: var(--color-text-secondary);
		font-weight: 400;
	}
	.score-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
		gap: 6px;
	}
	.score-options button {
		min-height: 44px;
		border-radius: 7px;
		border: 1px solid var(--color-border);
		background: var(--color-surface-2);
		color: var(--color-text-secondary);
		font-size: 13px;
		cursor: pointer;
	}
	.score-options button:hover,
	.score-options button.selected {
		background: var(--color-warning);
		border-color: var(--color-warning);
		color: var(--color-on-primary);
	}
	.score-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.score-footer button {
		min-height: 44px;
		color: var(--color-text-secondary);
		text-decoration: underline;
		text-underline-offset: 4px;
		cursor: pointer;
	}
</style>
