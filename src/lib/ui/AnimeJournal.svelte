<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import JournalEntry from './JournalEntry.svelte';
	let {
		entries,
		feature = false,
		resetKey,
		empty
	}: {
		entries: UserListRecord[];
		feature?: boolean;
		resetKey: string;
		empty: { title: string; hint: string; href?: string; cta?: string };
	} = $props();
	let limit = $state(20);
	$effect(() => {
		void resetKey;
		limit = 20;
	});
</script>

{#if entries.length === 0}
	<div class="journal-empty">
		<span class="empty-mark">—</span>
		<h2>{empty.title}</h2>
		<p>{empty.hint}</p>
		{#if empty.href}<a class="primary-button" href={empty.href}>{empty.cta}</a>{/if}
	</div>
{:else}
	<div class="journal-list">
		{#each entries.slice(0, limit) as entry, index (entry.malId)}
			<JournalEntry {entry} featured={feature && index === 0} {index} />
		{/each}
	</div>
	{#if limit < entries.length}<button class="load-entries" onclick={() => (limit += 20)}
			>Show more <span>{entries.length - limit} remaining</span></button
		>{/if}
{/if}

<style>
	.journal-list {
		container-type: inline-size;
		min-width: 0;
	}
	.journal-empty {
		padding: 56px 24px;
		text-align: center;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface-1);
	}
	.empty-mark {
		color: var(--color-primary);
		font-size: 32px;
	}
	h2 {
		font-family: var(--font-display);
		font-size: 28px;
		margin: 8px 0;
	}
	p {
		color: var(--color-text-secondary);
		max-width: 350px;
		margin: 0 auto 24px;
		font-size: 14px;
	}
	.load-entries {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 12px;
		padding: 14px;
		width: 100%;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		margin-top: 20px;
		font-size: 13px;
		background: var(--color-surface-1);
		cursor: pointer;
	}
	.load-entries span {
		color: var(--color-text-secondary);
		font-size: 11px;
	}
</style>
