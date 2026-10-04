<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/auth/auth.svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { matchesFuzzy } from '$lib/utils/search';
	import { Search, CornerDownLeft, List, Calendar, ChartNoAxesColumn, Globe } from 'lucide-svelte';
	import Dialog from './Dialog.svelte';
	import { STATUS_META, STATUS_ORDER } from './status';

	let { open = $bindable(false) }: { open: boolean } = $props();

	type Item = {
		id: string;
		label: string;
		hint?: string;
		group: string;
		dot?: string;
		run: () => void;
	};

	let query = $state('');
	let active = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	const go = (href: string) => () => goto(href);

	const actions: Item[] = [
		{ id: 'p-list', group: 'Go to', label: 'My list', run: go('/') },
		{ id: 'p-browse', group: 'Go to', label: 'Browse', run: go('/browse') },
		{ id: 'p-seasonal', group: 'Go to', label: 'Seasonal', run: go('/seasonal') },
		{ id: 'p-stats', group: 'Go to', label: 'Stats', run: go('/stats') },
		...STATUS_ORDER.map((s) => ({
			id: `t-${s}`,
			group: 'List tabs',
			label: STATUS_META[s].label,
			dot: STATUS_META[s].color,
			run: go(s === 'watching' ? '/' : `/?tab=${s}`)
		})),
		{
			id: 'a-dub',
			group: 'Preferences',
			label: 'Toggle dubbed anime only',
			run: () => dubStore.toggleDubMode()
		},
		{
			id: 'a-en',
			group: 'Preferences',
			label: 'Toggle English titles',
			run: () => settingsStore.togglePreferEnglish()
		}
	];

	const results = $derived.by<Item[]>(() => {
		const q = query.trim();
		if (!q) return actions.slice(0, 9);
		const lower = q.toLowerCase();
		const matchedActions = actions.filter((a) => a.label.toLowerCase().includes(lower));
		const matchedEntries = authStore.isAuthenticated
			? userListStore.allEntries
					.filter((e) => matchesFuzzy(e.title, e.titleEnglish, q))
					.slice(0, 8)
					.map<Item>((e) => ({
						id: `e-${e.malId}`,
						group: 'In your list',
						label: settingsStore.preferEnglish && e.titleEnglish ? e.titleEnglish : e.title,
						hint: STATUS_META[e.status]?.short,
						dot: STATUS_META[e.status]?.color,
						run: go(`/anime/${e.malId}`)
					}))
			: [];
		const search: Item[] =
			q.length >= 3
				? [
						{
							id: 'search-mal',
							group: 'Search',
							label: `Search MyAnimeList for “${q}”`,
							run: go(`/browse?q=${encodeURIComponent(q)}`)
						}
					]
				: [];
		return [...matchedEntries, ...matchedActions, ...search];
	});

	$effect(() => {
		void query;
		active = 0;
	});

	$effect(() => {
		if (open) {
			query = '';
			queueMicrotask(() => inputEl?.focus());
		}
	});

	function choose(item: Item | undefined) {
		if (!item) return;
		open = false;
		item.run();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = (active + 1) % Math.max(results.length, 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = (active - 1 + results.length) % Math.max(results.length, 1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			choose(results[active]);
		}
	}

	$effect(() => {
		document.getElementById(`cmd-${results[active]?.id}`)?.scrollIntoView({ block: 'nearest' });
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			open = !open;
		}
	}}
/>

<Dialog bind:open flush sheet label="Command palette">
	<div class="palette">
		<div class="input-row">
			<Search size={17} />
			<input
				bind:this={inputEl}
				bind:value={query}
				{onkeydown}
				role="combobox"
				aria-expanded="true"
				aria-controls="cmd-list"
				aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
				aria-label="Search your list, pages and actions"
				placeholder="Search your list, pages and actions…"
				autocomplete="off"
				spellcheck="false"
			/>
			<span class="kbd">Esc</span>
		</div>
		<ul id="cmd-list" role="listbox" aria-label="Results">
			{#each results as item, i (item.id)}
				{#if i === 0 || results[i - 1].group !== item.group}
					<li class="group" role="presentation">{item.group}</li>
				{/if}
				<li
					id="cmd-{item.id}"
					role="option"
					aria-selected={i === active}
					class:active={i === active}
					onpointermove={() => (active = i)}
					onclick={() => choose(item)}
					onkeydown={() => {}}
				>
					{#if item.dot}<span class="status-dot" style:--dot={item.dot}></span>
					{:else if item.group === 'Search'}<Globe size={15} />
					{:else if item.id === 'p-list'}<List size={15} />
					{:else if item.id === 'p-seasonal'}<Calendar size={15} />
					{:else if item.id === 'p-stats'}<ChartNoAxesColumn size={15} />
					{:else}<Search size={15} />{/if}
					<span class="label">{item.label}</span>
					{#if item.hint}<span class="hint">{item.hint}</span>{/if}
					{#if i === active}<CornerDownLeft size={14} class="enter" />{/if}
				</li>
			{:else}
				<li class="empty" role="presentation">Nothing matches “{query}”.</li>
			{/each}
		</ul>
	</div>
</Dialog>

<style>
	.palette {
		display: flex;
		flex-direction: column;
		max-height: min(70dvh, 520px);
	}
	.input-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 16px;
		min-height: 56px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}
	.input-row input {
		flex: 1;
		min-width: 0;
		min-height: 54px;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 16px;
		outline: none;
	}
	ul {
		overflow-y: auto;
		padding: 6px;
		list-style: none;
		margin: 0;
	}
	.group {
		padding: 10px 10px 4px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--color-text-muted);
	}
	li[role='option'] {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 0 10px;
		border-radius: var(--radius-s);
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	li[role='option'].active {
		background: var(--color-surface-3);
		color: var(--color-text-primary);
	}
	.label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.hint {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.empty {
		padding: 28px 10px;
		text-align: center;
		color: var(--color-text-muted);
	}
	:global(.enter) {
		flex: none;
		color: var(--color-text-muted);
	}
</style>
