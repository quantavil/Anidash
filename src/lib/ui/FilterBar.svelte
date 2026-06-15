<script lang="ts">
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ArrowUpDown } from 'lucide-svelte';
	import SearchInput from './SearchInput.svelte';

	import type { SortKey } from '$lib/utils/sort';

	const SORT_OPTIONS: { key: SortKey; label: string }[] = [
		{ key: 'updated', label: 'Last Updated' },
		{ key: 'title', label: 'Title' },
		{ key: 'score', label: 'My Score' },
		{ key: 'mean', label: 'Rating' },
		{ key: 'progress', label: 'Progress' }
	];

	const currentSort = $derived(getUrlParam(page.url, 'sort', 'updated') as SortKey);
	const currentQuery = $derived(getUrlParam(page.url, 'q', ''));

	import { debounce } from '$lib/utils/debounce';

	let showSortMenu = $state(false);
	let focusedIndex = $state(-1);

	function setSort(key: SortKey) {
		goto(setUrlParam(page.url, 'sort', key === 'updated' ? '' : key), {
			keepFocus: true,
			noScroll: true
		});
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
		goto(setUrlParam(page.url, 'q', value), { keepFocus: true, noScroll: true });
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
		goto(setUrlParam(page.url, 'q', ''), { keepFocus: true, noScroll: true });
	}

	const sortLabel = $derived(
		SORT_OPTIONS.find((o) => o.key === currentSort)?.label ?? 'Last Updated'
	);
</script>

<div class="flex w-full flex-wrap items-center justify-between gap-3">
	<!-- Search -->
	<div class="flex-1 min-w-[200px]">
		<SearchInput
			value={currentQuery}
			placeholder="Search your list…"
			oninput={handleSearch}
			onclear={clearSearch}
		/>
	</div>

	<!-- Controls -->
	<div class="flex items-center gap-2">
		<!-- Sort -->
		<div class="relative">
			<button
				onclick={() => (showSortMenu = !showSortMenu)}
				onkeydown={handleSortKeydown}
				aria-haspopup="true"
				aria-expanded={showSortMenu}
				class="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-sm text-text-secondary transition-all duration-500 ease-spring hover:bg-white/10 hover:text-text-primary active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
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
				<div class="absolute right-0 top-full mt-2 glass-dropdown border-border!" role="menu">
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
	</div>
</div>
