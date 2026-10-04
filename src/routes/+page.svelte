<script lang="ts">
	import { page } from '$app/state';
	import { authStore } from '$lib/auth/auth.svelte';
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { sortEntries, type SortKey } from '$lib/utils/sort';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { matchesFuzzy } from '$lib/utils/search';
	import { formatListStatus } from '$lib/utils/format';

	import { goto } from '$app/navigation';
	import { List, LayoutGrid, ArrowUpRight } from 'lucide-svelte';
	import StoryWindow from '$lib/ui/StoryWindow.svelte';
	import AnimeJournal from '$lib/ui/AnimeJournal.svelte';
	import CollectionShelf from '$lib/ui/CollectionShelf.svelte';
	import TabBar from '$lib/ui/TabBar.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import AnimeGrid from '$lib/ui/AnimeGrid.svelte';
	import ListPageSkeleton from '$lib/ui/skeletons/ListPageSkeleton.svelte';

	// ─── URL State ───

	const currentTab = $derived(getUrlParam(page.url, 'tab', 'watching'));
	const currentSort = $derived(getUrlParam(page.url, 'sort', 'updated') as SortKey);

	const currentQuery = $derived(getUrlParam(page.url, 'q', ''));

	const gridView = $derived(getUrlParam(page.url, 'view', '') === 'grid');
	const pageTitle = $derived(
		currentTab === 'all'
			? 'Your collection'
			: currentTab === 'plan_to_watch'
				? 'Planned'
				: formatListStatus(currentTab)
	);
	function setView(grid: boolean) {
		goto(setUrlParam(page.url, 'view', grid ? 'grid' : ''), { keepFocus: true, noScroll: true });
	}

	// ─── Derived Data & Stable Sort State ───
	// Keep card ordering stable while user interacts with episode counts/scores on the page,
	// only re-sorting when active tab, sort method, search query, or item membership changes.

	let orderedIds = $state.raw<number[]>([]);

	$effect(() => {
		const matching = userListStore.allEntries.filter((e) => {
			if (currentTab !== 'all' && e.status !== currentTab) return false;
			if (currentQuery && !matchesFuzzy(e.title, e.titleEnglish, currentQuery)) return false;
			if (dubStore.dubMode && dubStore.isReady && !dubStore.hasDub(e.malId)) return false;
			return true;
		});

		// Explicitly track reactive context inputs
		void currentTab;
		void currentSort;
		void currentQuery;
		void dubStore.dubMode;

		orderedIds = sortEntries(matching, currentSort).map((e) => e.malId);
	});

	// Tell "nothing here yet" apart from "your filters hide everything", and point the
	// former at something to do.
	const emptyState = $derived.by(() => {
		if (userListStore.totalCount === 0) {
			return {
				title: 'Your list is empty',
				hint: 'Add anime from Browse, or sync if you expect to see your MyAnimeList entries.',
				href: '/browse',
				cta: 'Browse anime'
			};
		}
		if (currentQuery || (dubStore.dubMode && dubStore.isReady)) {
			return {
				title: 'No matches',
				hint: currentQuery
					? `Nothing in this tab matches “${currentQuery}”.`
					: 'Nothing in this tab has an English dub. Turn off Dub Mode to see everything.'
			};
		}
		return {
			title:
				currentTab === 'all' ? 'Nothing here yet' : `Nothing in ${formatListStatus(currentTab)}`,
			hint: 'Add anime from Browse, or change its status on the anime page.',
			href: '/browse',
			cta: 'Browse anime'
		};
	});

	const filteredEntries = $derived(
		orderedIds
			.map((id) => userListStore.getEntry(id))
			.filter(
				(e): e is NonNullable<typeof e> =>
					e !== undefined && (currentTab === 'all' || e.status === currentTab)
			)
	);
</script>

{#if !authStore.isAuthenticated}
	<section class="welcome-page">
		<div class="welcome-copy">
			<span class="welcome-note">Your anime, all together</span>
			<h1>Great stories.<br />A place to keep them.</h1>
			<p>Keep track of what you’re watching, rate your favourites, and find what comes next.</p>
			<button class="primary-button" onclick={() => authStore.login()}
				>Connect with MyAnimeList <ArrowUpRight size={17} /></button
			><a class="welcome-browse" href="/browse">Explore anime first <ArrowUpRight size={15} /></a
			><span class="welcome-footnote">Your list stays with you, even offline.</span>
		</div>
		<div class="welcome-art"><StoryWindow /></div>
	</section>
{:else if !userListStore.initialized}
	<ListPageSkeleton />
{:else}
	<div class="list-page">
		<div class="page-heading">
			<div>
				<h1>{pageTitle}</h1>
			</div>
			<p class="collection-context">
				<strong>{filteredEntries.length} titles</strong><span
					>{currentTab === 'watching'
						? `${filteredEntries.reduce((sum, entry) => sum + (entry.numEpisodes > 0 ? Math.max(0, entry.numEpisodes - entry.numWatchedEpisodes) : 0), 0)} known episodes ahead`
						: 'In your collection'}</span
				>
			</p>
		</div>
		<TabBar counts={userListStore.statusCounts} />
		<div class="list-toolbar">
			<FilterBar />
			<div class="view-switch" aria-label="List display">
				<button
					class:active={!gridView}
					aria-pressed={!gridView}
					aria-label="Journal view"
					title="Journal view"
					onclick={() => setView(false)}><List size={18} /></button
				><button
					class:active={gridView}
					aria-pressed={gridView}
					aria-label="Poster grid"
					title="Poster grid"
					onclick={() => setView(true)}><LayoutGrid size={17} /></button
				>
			</div>
		</div>
		<div class="journal-layout" class:full-width={gridView}>
			<div class="list-content">
				{#if gridView}<AnimeGrid
						entries={filteredEntries}
						resetKey="{currentTab}-{currentSort}-{currentQuery}"
						loading={false}
						empty={emptyState}
					/>{:else}<AnimeJournal
						entries={filteredEntries}
						feature={currentTab === 'watching' && !currentQuery}
						resetKey="{currentTab}-{currentSort}-{currentQuery}"
						empty={emptyState}
					/>{/if}
				{#if filteredEntries.length > 0}<footer class="list-footer">
						<span
							>{filteredEntries.length}
							{currentTab === 'watching' ? 'in your rotation' : 'in this list'}</span
						><span>Edits save on this device</span>
					</footer>{/if}
			</div>
			{#if !gridView}<CollectionShelf />{/if}
		</div>
	</div>
{/if}

<style>
	.list-page {
		padding: 40px 0 24px;
	}
	.page-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 28px;
	}
	h1 {
		font-family: var(--font-display);
		font-size: clamp(32px, 3.8vw, 46px);
		font-weight: 600;
		line-height: 1.05;
		letter-spacing: -0.045em;
		text-wrap: balance;
	}
	.collection-context {
		display: flex;
		flex-direction: column;
		gap: 4px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.collection-context strong {
		color: var(--color-text-primary);
		font-weight: 500;
	}
	.page-heading p {
		color: var(--color-text-secondary);
		font-size: 13px;
		padding-bottom: 8px;
	}
	.list-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 22px 0 26px;
	}
	.list-toolbar :global(.filter-bar) {
		flex: 1;
	}
	.view-switch {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 3px;
		flex-shrink: 0;
		background: var(--color-surface-1);
	}
	.view-switch button {
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		color: var(--color-text-secondary);
		border-radius: 5px;
		cursor: pointer;
	}
	.view-switch button.active {
		background: var(--color-surface-3);
		color: var(--color-text-primary);
		box-shadow: 0 2px 5px #0003;
	}
	.journal-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 260px;
		gap: 28px;
		align-items: start;
	}
	.journal-layout.full-width {
		grid-template-columns: minmax(0, 1fr);
	}
	.list-content {
		min-width: 0;
	}
	.list-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px;
		padding: 20px 0;
		color: var(--color-text-secondary);
		font-size: 11px;
	}
	.welcome-page {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		align-items: center;
		gap: 40px;
		min-height: calc(100dvh - 100px);
		padding: 40px 0;
	}
	.welcome-note {
		color: var(--color-primary);
		font-size: 13px;
	}
	.welcome-copy h1 {
		font-size: clamp(42px, 5vw, 68px);
		margin: 22px 0;
	}
	.welcome-copy p {
		color: var(--color-text-secondary);
		max-width: 410px;
		font-size: 16px;
		line-height: 1.8;
		margin-bottom: 32px;
	}
	.welcome-browse {
		display: flex;
		align-items: center;
		gap: 8px;
		width: fit-content;
		min-height: 44px;
		margin-top: 12px;
		font-size: 13px;
	}
	.welcome-footnote {
		display: block;
		font-size: 11px;
		margin-top: 32px;
		color: var(--color-text-secondary);
	}
	.welcome-art {
		width: 100%;
		max-width: 470px;
		justify-self: center;
	}

	@media (max-width: 1100px) {
		.journal-layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.welcome-page {
			gap: 32px;
			padding: 50px 0;
		}
	}
	@media (max-width: 640px) {
		.list-page {
			padding-top: 28px;
		}
		.page-heading {
			margin-bottom: 22px;
		}
		.page-heading p {
			font-size: 11px;
			text-align: left;
			padding: 0;
		}
		.page-heading {
			align-items: start;
			flex-direction: column;
			gap: 12px;
		}
		.collection-context {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 12px;
		}
		.list-toolbar {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 10px;
			padding: 18px 0 22px;
		}
		.list-toolbar :global(.filter-bar) {
			display: contents;
		}
		.list-toolbar :global(.search-field) {
			grid-column: 1 / -1;
			max-width: none;
		}
		.list-toolbar :global(.sort-control) {
			grid-column: 1;
		}
		.view-switch {
			grid-column: 2;
			margin-left: auto;
		}

		.welcome-page {
			grid-template-columns: 1fr;
			padding: 42px 0;
			gap: 40px;
		}
		.welcome-copy h1 {
			font-size: clamp(38px, 10vw, 48px);
		}
		.welcome-copy p {
			font-size: 15px;
		}
		.welcome-art {
			max-width: 340px;
		}
	}
</style>
