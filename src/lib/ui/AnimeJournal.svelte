<script lang="ts">
	import { untrack } from 'svelte';
	import type { UserListRecord } from '$lib/cache/db';
	import type { SortKey } from '$lib/utils/sort';
	import { ArrowDown } from 'lucide-svelte';
	import ListRow from './ListRow.svelte';
	import EmptyState from './EmptyState.svelte';

	let {
		entries,
		sort,
		onsort,
		resetKey,
		empty
	}: {
		entries: UserListRecord[];
		sort: SortKey;
		onsort: (key: SortKey) => void;
		resetKey: string;
		empty: { title: string; hint: string; href?: string; cta?: string };
	} = $props();

	const PAGE_SIZE = 40;
	let limit = $state(PAGE_SIZE);
	let sentinel = $state<HTMLElement | null>(null);

	$effect(() => {
		void resetKey;
		untrack(() => (limit = PAGE_SIZE));
	});

	// Load the next page shortly before the end of the list scrolls into view.
	$effect(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(hits) => {
				if (hits[0]?.isIntersecting) limit += PAGE_SIZE;
			},
			{ rootMargin: '600px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	const columns: { key: SortKey | null; label: string; align?: 'end' }[] = [
		{ key: 'title', label: 'Title' },
		{ key: 'progress', label: 'Progress' },
		{ key: 'mean', label: 'MAL' },
		{ key: 'score', label: 'Yours' },
		{ key: null, label: 'Status' },
		{ key: 'updated', label: 'Updated', align: 'end' }
	];
</script>

{#if entries.length === 0}
	<EmptyState {...empty} />
{:else}
	<div class="ledger">
		<div class="head" role="presentation">
			<span></span>
			{#each columns as col (col.label)}
				{#if col.key}
					{@const key = col.key}
					<button
						type="button"
						class:active={sort === key}
						class:end={col.align === 'end'}
						aria-label="Sort by {col.label}"
						aria-pressed={sort === key}
						onclick={() => onsort(key)}
						>{col.label}{#if sort === key}<ArrowDown size={12} />{/if}</button
					>
				{:else}
					<span class="plain">{col.label}</span>
				{/if}
			{/each}
		</div>
		<div class="rows">
			{#each entries.slice(0, limit) as entry, index (entry.malId)}
				<ListRow {entry} {index} />
			{/each}
		</div>
		{#if limit < entries.length}
			<div bind:this={sentinel} class="more">
				<button class="btn" onclick={() => (limit += PAGE_SIZE)}
					>Show more <span class="muted num">{entries.length - limit} left</span></button
				>
			</div>
		{/if}
	</div>
{/if}

<style>
	.head {
		display: none;
	}
	.more {
		display: flex;
		justify-content: center;
		padding: 24px 0;
	}
	.muted {
		color: var(--color-text-muted);
		font-weight: 400;
	}
	@container ledger (min-width: 880px) {
		/* Header columns mirror ListRow's table grid. */
		.head {
			position: sticky;
			top: 0;
			z-index: 5;
			display: grid;
			grid-template-columns: var(--cols);
			gap: 0 16px;
			padding: 0 12px;
			margin: 0 -12px;
			background: var(--color-surface-0);
			border-bottom: 1px solid var(--color-border);
			align-items: center;
			min-height: 40px;
			font-size: 12px;
			color: var(--color-text-muted);
		}
		.head button,
		.head .plain {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			min-height: 40px;
			font-weight: 500;
		}
		.head button:hover,
		.head button.active {
			color: var(--color-text-primary);
		}
		.head button.active :global(svg) {
			color: var(--color-primary);
		}
		.head .end {
			justify-self: end;
		}
	}
</style>
