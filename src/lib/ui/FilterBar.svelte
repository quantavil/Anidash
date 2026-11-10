<script lang="ts">
	import { getUrlParam, setUrlParam, setUrlParams } from '#lib/utils/url-state.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import SearchInput from './SearchInput.svelte';
	import SortMenu from './SortMenu.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import RandomButton from './RandomButton.svelte';
	import ViewToggle from './ViewToggle.svelte';
	import type { AnimeFilters, FacetOptions } from '#lib/utils/filters.js';
	import { debounce } from '#lib/utils/debounce.js';
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

	const SORT_OPTIONS: { value: SortKey; label: string }[] = [
		{ value: 'updated', label: 'Last Updated' },
		{ value: 'title', label: 'Title' },
		{ value: 'score', label: 'My Score' },
		{ value: 'mean', label: 'Rating' },
		{ value: 'progress', label: 'Progress' },
		{ value: 'start', label: 'Release date' },
		{ value: 'popularity', label: 'Popularity' },
		{ value: 'episodes', label: 'Episodes' }
	];

	const currentSort = $derived.by(() => {
		const raw = getUrlParam(page.url, 'sort', 'updated');
		return (SORT_OPTIONS.some((o) => o.value === raw) ? raw : 'updated') as SortKey;
	});
	const currentDir = $derived.by((): SortDir => {
		const raw = getUrlParam(page.url, 'dir', '');
		return raw === 'asc' || raw === 'desc' ? raw : NATURAL_DIR[currentSort];
	});
	const currentQuery = $derived(getUrlParam(page.url, 'q', ''));

	function toggleDir() {
		const flipped: SortDir = currentDir === 'asc' ? 'desc' : 'asc';
		goto(setUrlParam(page.url, 'dir', flipped === NATURAL_DIR[currentSort] ? '' : flipped), {
			reset: false
		});
	}

	function setSort(key: string) {
		goto(
			setUrlParams(page.url, [
				{ key: 'sort', value: key === 'updated' ? '' : key },
				{ key: 'dir', value: '' }
			]),
			{ reset: false }
		);
	}

	const debouncedSearch = debounce((value: string) => {
		goto(setUrlParam(page.url, 'q', value), { reset: false });
	}, 250);

	function handleSearch(e: Event) {
		debouncedSearch((e.target as HTMLInputElement).value);
	}

	$effect(() => {
		return () => {
			debouncedSearch.cancel();
		};
	});

	function clearSearch() {
		debouncedSearch.cancel();
		goto(setUrlParam(page.url, 'q', ''), { reset: false });
	}
</script>

{#snippet search()}
	<SearchInput
		value={currentQuery}
		placeholder="Search your list… (3+ letters)"
		oninput={handleSearch}
		onclear={clearSearch}
	/>
{/snippet}

{#snippet controls()}
	{#if onrandom}
		<RandomButton count={randomCount} onclick={onrandom} />
	{/if}
	<ViewToggle section="list" />
	<SortMenu
		options={SORT_OPTIONS}
		value={currentSort}
		dir={currentDir}
		label="Sort list"
		onselect={setSort}
		ondir={toggleDir}
	/>
{/snippet}

<FilterPanel {filters} {options} mode="list" {onchange} leading={search} trailing={controls} />
