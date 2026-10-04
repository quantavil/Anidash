<script lang="ts">
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { debounce } from '$lib/utils/debounce';
	import type { SortKey } from '$lib/utils/sort';
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
		><span class="sr-only">Sort anime list</span><select
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
		gap: 12px;
		align-items: center;
		min-width: 0;
	}
	.filter-bar :global(.search-field) {
		max-width: 440px;
	}
	.sort-control {
		flex: none;
	}
	select {
		min-height: 48px;
		max-width: 100%;
		padding: 0 30px 0 12px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-1);
		color: var(--color-text-secondary);
		font-size: 12px;
		cursor: pointer;
	}
	option {
		background: var(--color-surface-1);
	}
	@media (max-width: 640px) {
		.filter-bar {
			flex-wrap: wrap;
			gap: 10px;
		}
		.filter-bar :global(.search-field) {
			flex-basis: 100%;
			max-width: none;
		}
		select {
			min-height: 46px;
			padding-left: 10px;
		}
	}
</style>
