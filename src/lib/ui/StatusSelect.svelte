<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import type { AnimeStatus } from '$lib/cache/db';
	import { STATUS_META, STATUS_ORDER } from './status';

	let {
		malId,
		title,
		status,
		compact = false
	}: { malId: number; title: string; status: AnimeStatus; compact?: boolean } = $props();

	const meta = $derived(STATUS_META[status]);
</script>

<label class="chip-select" class:compact>
	<span class="status-dot" style:--dot={meta.color}></span>
	<span class="text">{meta.short}</span>
	<ChevronDown size={13} aria-hidden="true" />
	<select
		aria-label="Status for {title}"
		value={status}
		onchange={(e) => userListStore.setStatus(malId, e.currentTarget.value as AnimeStatus)}
	>
		{#each STATUS_ORDER as s (s)}<option value={s}>{STATUS_META[s].label}</option>{/each}
	</select>
</label>

<style>
	.chip-select {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 36px;
		padding: 0 10px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-m);
		background: var(--color-surface-1);
		color: var(--color-text-secondary);
		font-size: 13px;
		min-width: 0;
		transition: border-color 0.15s;
	}
	.chip-select:hover {
		border-color: var(--color-border-strong);
	}
	.chip-select:focus-within {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-primary);
	}
	/* Visible chip is 36px; the native select stretches to a 44px touch target. */
	.compact {
		width: 100%;
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
