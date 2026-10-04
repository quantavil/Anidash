<script lang="ts">
	import { Star, ChevronDown } from 'lucide-svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	let { malId, title, score }: { malId: number; title: string; score: number } = $props();
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

<label class="rating-control" class:rated={score > 0}>
	<Star size={14} fill={score > 0 ? 'currentColor' : 'none'} aria-hidden="true" />
	<span class="rating-label">Yours</span>
	<strong aria-hidden="true">{score > 0 ? `${score} / 10` : 'Rate'}</strong>
	<select
		aria-label="Your rating for {title}"
		value={score}
		onchange={(e) => userListStore.setScore(malId, Number(e.currentTarget.value))}
	>
		{#each descriptions as description, value (value)}
			<option {value}>{value === 0 ? 'Not rated' : `${value} / 10 · ${description}`}</option>
		{/each}
	</select>
	<ChevronDown size={12} aria-hidden="true" />
</label>

<style>
	.rating-control {
		position: relative;
		display: flex;
		align-items: center;
		gap: 5px;
		min-height: 44px;
		padding: 0 8px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-2);
		color: var(--color-text-secondary);
		min-width: 0;
	}
	.rating-control.rated {
		color: var(--color-warning);
	}
	.rating-label {
		font-size: 11px;
		color: var(--color-text-secondary);
	}
	strong {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-primary);
		white-space: nowrap;
	}
	select {
		position: absolute;
		inset: 0;
		opacity: 0;
		width: 100%;
		height: 100%;
		cursor: pointer;
	}

	option {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
	}
	.rating-control:focus-within {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	select:focus-visible {
		outline: none;
	}
	@media (max-width: 480px) {
		.rating-control {
			gap: 4px;
			padding: 0 6px;
		}
		.rating-control :global(svg) {
			width: 11px;
		}
		.rating-label {
			font-size: 10px;
		}
		strong {
			font-size: 11px;
		}
	}
</style>
