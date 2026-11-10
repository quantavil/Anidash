<script lang="ts">
	import { getUrlParam, setUrlParam, setUrlParams } from '#lib/utils/url-state.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ArrowUpDown, ArrowDown, ArrowUp, Dices } from 'lucide-svelte';
	import SearchInput from './SearchInput.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import type { AnimeFilters, FacetOptions } from '#lib/utils/filters.js';

	import { NATURAL_DIR, type SortKey, type SortDir } from '#lib/utils/sort.js';

	let {
		filters,
		options,
		onchange,
		onrandom,
		randomCount = 0
	}: {
		filters: AnimeFilters;
		options: FacetOptions;
		onchange: (next: AnimeFilters) => void;
		onrandom?: () => void;
		randomCount?: number;
	} = $props();

	const SORT_OPTIONS: { key: SortKey; label: string }[] = [
		{ key: 'updated', label: 'Last Updated' },
		{ key: 'title', label: 'Title' },
		{ key: 'score', label: 'My Score' },
		{ key: 'mean', label: 'Rating' },
		{ key: 'progress', label: 'Progress' },
		{ key: 'start', label: 'Release date' },
		{ key: 'popularity', label: 'Popularity' },
		{ key: 'episodes', label: 'Episodes' }
	];

	const currentSort = $derived.by(() => {
		const raw = getUrlParam(page.url, 'sort', 'updated');
		return (SORT_OPTIONS.some((o) => o.key === raw) ? raw : 'updated') as SortKey;
	});
	const currentDir = $derived.by((): SortDir => {
		const raw = getUrlParam(page.url, 'dir', '');
		return raw === 'asc' || raw === 'desc' ? raw : NATURAL_DIR[currentSort];
	});

	function toggleDir() {
		const flipped: SortDir = currentDir === 'asc' ? 'desc' : 'asc';
		goto(setUrlParam(page.url, 'dir', flipped === NATURAL_DIR[currentSort] ? '' : flipped), {
			reset: false
		});
	}
	const currentQuery = $derived(getUrlParam(page.url, 'q', ''));

	import { debounce } from '#lib/utils/debounce.js';

	let showSortMenu = $state(false);
	let focusedIndex = $state(-1);

	function setSort(key: SortKey) {
		goto(
			setUrlParams(page.url, [
				{ key: 'sort', value: key === 'updated' ? '' : key },
				{ key: 'dir', value: '' }
			]),
			{
				reset: false
			}
		);
		showSortMenu = false;
		focusedIndex = -1;
	}

	function handleSortKeydown(e: KeyboardEvent) {
		if (!showSortMenu) {
			if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				showSortMenu = true;
				focusedIndex = 0;
			}
			return;
		}
		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				showSortMenu = false;
				focusedIndex = -1;
				break;
			case 'ArrowDown':
				e.preventDefault();
				focusedIndex = (focusedIndex + 1) % SORT_OPTIONS.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				focusedIndex = (focusedIndex - 1 + SORT_OPTIONS.length) % SORT_OPTIONS.length;
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				if (focusedIndex >= 0) setSort(SORT_OPTIONS[focusedIndex].key);
				break;
		}
	}

	const debouncedSearch = debounce((value: string) => {
		goto(setUrlParam(page.url, 'q', value), { reset: false });
	}, 250);

	function handleSearch(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		debouncedSearch(value);
	}

	$effect(() => {
		return () => {
			debouncedSearch.cancel();
		};
	});

	function clearSearch() {
		goto(setUrlParam(page.url, 'q', ''), { reset: false });
	}

	const sortLabel = $derived(
		SORT_OPTIONS.find((o) => o.key === currentSort)?.label ?? 'Last Updated'
	);
</script>

{#snippet search()}
	<SearchInput
		value={currentQuery}
		placeholder="Search your list…"
		oninput={handleSearch}
		onclear={clearSearch}
	/>
{/snippet}

{#snippet controls()}
	{#if onrandom}
		<button
			onclick={onrandom}
			disabled={randomCount === 0}
			title="Open a random title from the current view"
			aria-label="Random pick from the {randomCount} shown"
			class="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/5 bg-white/5 text-sm text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary active:scale-95 disabled:opacity-40 sm:px-4"
		>
			<Dices size={15} /><span class="hidden sm:inline">Random</span>
		</button>
	{/if}
	<!-- Sort -->
	<div class="relative">
		<button
			onclick={() => (showSortMenu = !showSortMenu)}
			onkeydown={handleSortKeydown}
			aria-haspopup="true"
			aria-expanded={showSortMenu}
			aria-label="Sort anime list: currently {sortLabel}"
			class="flex min-h-11 items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 text-sm text-text-secondary transition-all duration-500 ease-spring hover:bg-white/10 hover:text-text-primary active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
		>
			<ArrowUpDown size={14} />
			{sortLabel}
		</button>

		{#if showSortMenu}
			<!-- Click-away overlay -->
			<div
				class="fixed inset-0 z-40"
				onclick={() => {
					showSortMenu = false;
					focusedIndex = -1;
				}}
				role="presentation"
			></div>
			<div class="absolute left-0 top-full mt-2 glass-dropdown border-border!" role="menu">
				{#each SORT_OPTIONS as option, idx (option.key)}
					<button
						onclick={() => setSort(option.key)}
						role="menuitem"
						tabindex="-1"
						class="glass-dropdown-item w-full
              {currentSort === option.key
							? '!bg-primary/10 !text-primary'
							: idx === focusedIndex
								? '!bg-white/10 !text-text-primary'
								: 'text-text-secondary'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	<button
		onclick={toggleDir}
		aria-label="Sort direction: {currentDir === 'asc' ? 'ascending' : 'descending'}"
		title={currentDir === 'asc' ? 'Ascending' : 'Descending'}
		class="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/5 bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary active:scale-95"
	>
		{#if currentDir === 'asc'}<ArrowUp size={14} />{:else}<ArrowDown size={14} />{/if}
	</button>
{/snippet}

<FilterPanel {filters} {options} mode="list" {onchange} leading={search} trailing={controls} />
