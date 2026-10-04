<script lang="ts">
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { debounce } from '$lib/utils/debounce';
	import type { SortKey } from '$lib/utils/sort';
	import { ArrowDownWideNarrow } from 'lucide-svelte';
	import SearchInput from './SearchInput.svelte';
	const options: { key: SortKey; label: string }[] = [
		{ key: 'updated', label: 'Recently updated' },
		{ key: 'title', label: 'Title A–Z' },
		{ key: 'score', label: 'Your rating' },
		{ key: 'mean', label: 'MAL rating' },
		{ key: 'progress', label: 'Episode progress' }
	];
	const currentSort = $derived(getUrlParam(page.url, 'sort', 'updated'));
	const currentQuery = $derived(getUrlParam(page.url, 'q', ''));
	const search = debounce((value: string) => {
		goto(setUrlParam(page.url, 'q', value), { keepFocus: true, noScroll: true });
	}, 250);
	$effect(() => () => search.cancel());
	function clearSearch() {
		search.cancel();
		goto(setUrlParam(page.url, 'q', ''), { keepFocus: true, noScroll: true });
	}
</script>

<div class="filter-bar">
	<SearchInput
		value={currentQuery}
		placeholder="Find in your list…"
		label="Search your list"
		oninput={(e) => search((e.target as HTMLInputElement).value)}
		onclear={clearSearch}
	/>
	<label class="sort-control"
		><ArrowDownWideNarrow size={20} /><span class="sr-only">Sort anime list</span><select
			aria-label="Sort anime list"
			value={currentSort}
			onchange={(e) =>
				goto(
					setUrlParam(
						page.url,
						'sort',
						e.currentTarget.value === 'updated' ? '' : e.currentTarget.value
					),
					{ keepFocus: true, noScroll: true }
				)}
			>{#each options as option (option.key)}<option value={option.key}>{option.label}</option
				>{/each}</select
		></label
	>
</div>

<style>
	.filter-bar {
		display: flex;
		gap: 10px;
		align-items: center;
		min-width: 0;
		width: 100%;
	}
	.filter-bar :global(.search-field) {
		flex: 1;
		min-width: 0;
	}
	.filter-bar :global(.search-box) {
		height: 48px;
	}
	.sort-control {
		position: relative;
		display: grid;
		place-items: center;
		flex: 0 0 48px;
		height: 48px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-1);
		color: var(--color-text-secondary);
	}
	.sort-control:focus-within {
		outline: 2px solid var(--color-primary);
		outline-offset: 3px;
	}
	select {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}
	option {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
	}
</style>
