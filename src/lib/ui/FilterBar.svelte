<script lang="ts">
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { debounce } from '$lib/utils/debounce';
	import type { SortKey } from '$lib/utils/sort';
	import { ArrowDownUp } from 'lucide-svelte';
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

<svelte:window
	onkeydown={(e) => {
		const t = e.target as HTMLElement;
		if (e.key === '/' && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
			e.preventDefault();
			document.getElementById('list-search')?.focus();
		}
	}}
/>

<div class="filters">
	<SearchInput
		id="list-search"
		value={currentQuery}
		placeholder="Find in your list"
		label="Search your list"
		hint="/"
		oninput={(e) => search((e.target as HTMLInputElement).value)}
		onclear={clearSearch}
	/>
	<label class="field sort">
		<ArrowDownUp size={15} class="shrink-0" />
		<span class="sr-only">Sort anime list</span>
		<select
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
		>
			{#each options as option (option.key)}<option value={option.key}>{option.label}</option
				>{/each}
		</select>
	</label>
</div>

<style>
	.filters {
		display: flex;
		flex: 1;
		gap: 10px;
		min-width: 0;
	}
	.filters :global(.search-field) {
		flex: 1 1 280px;
		max-width: 440px;
	}
	.sort {
		flex: none;
	}
	.sort select {
		padding-right: 4px;
	}
	@media (max-width: 640px) {
		.filters {
			display: contents;
		}
		.filters :global(.search-field) {
			grid-column: 1 / -1;
			max-width: none;
		}
		.sort {
			min-width: 0;
		}
	}
</style>
