<script lang="ts">
	import { Star, ChevronDown } from 'lucide-svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';

	let {
		malId,
		title,
		score,
		compact = false
	}: { malId: number; title: string; score: number; compact?: boolean } = $props();

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

<label class="chip-select" class:compact class:rated={score > 0} title="Your personal rating">
	<Star size={14} fill={score > 0 ? 'currentColor' : 'none'} aria-hidden="true" />
	<span class="k">You</span>
	<strong class="num" aria-hidden="true">{score > 0 ? score : 'Rate'}</strong>
	<ChevronDown size={13} aria-hidden="true" />
	<select
		aria-label="Your rating for {title}"
		value={score}
		onchange={(e) => userListStore.setScore(malId, Number(e.currentTarget.value))}
	>
		{#each descriptions as description, value (value)}
			<option {value}>{value === 0 ? 'Not rated' : `${value} / 10 · ${description}`}</option>
		{/each}
	</select>
</label>

<style>
	.chip-select {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 10px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-m);
		background: var(--color-surface-1);
		color: var(--color-text-muted);
		font-size: 13px;
		white-space: nowrap;
		transition: border-color 0.15s;
	}
	.chip-select:hover {
		border-color: var(--color-border-strong);
	}
	.chip-select.rated {
		color: var(--color-warning);
	}
	.chip-select:focus-within {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.k {
		font-size: 11px;
		color: var(--color-text-muted);
	}
	.compact {
		width: 100%;
	}
	strong {
		font-weight: 600;
		color: var(--color-text-primary);
	}
	select {
		position: absolute;
		inset: -4px 0;
		width: 100%;
		height: calc(100% + 8px);
		opacity: 0;
		cursor: pointer;
	}
	select:focus-visible {
		outline: none;
	}
	option {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
	}
</style>
