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
	import { List, LayoutGrid, ArrowRight, WifiOff, Zap, Compass } from 'lucide-svelte';
	import AnimeJournal from '$lib/ui/AnimeJournal.svelte';
	import TabBar from '$lib/ui/TabBar.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import AnimeGrid from '$lib/ui/AnimeGrid.svelte';
	import ListPageSkeleton from '$lib/ui/skeletons/ListPageSkeleton.svelte';

	// ─── URL State ───

	const currentTab = $derived(getUrlParam(page.url, 'tab', 'watching'));
	const currentSort = $derived(getUrlParam(page.url, 'sort', 'updated') as SortKey);

	const currentQuery = $derived(getUrlParam(page.url, 'q', ''));

	const gridView = $derived(getUrlParam(page.url, 'view', '') === 'grid');
	const pageTitle = $derived(currentTab === 'all' ? 'All anime' : formatListStatus(currentTab));
	function setSort(key: SortKey) {
		goto(setUrlParam(page.url, 'sort', key === 'updated' || key === currentSort ? '' : key), {
			keepFocus: true,
			noScroll: true
		});
	}
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

	// What is ahead of you: titles in this view and episodes still to watch (known totals only).
	const summary = $derived.by(() => {
		const titles = filteredEntries.length;
		const ahead = filteredEntries.reduce(
			(sum, e) =>
				e.numEpisodes > 0 ? sum + Math.max(0, e.numEpisodes - e.numWatchedEpisodes) : sum,
			0
		);
		return {
			titles,
			ahead,
			showAhead: currentTab === 'watching' || currentTab === 'plan_to_watch'
		};
	});
	const summaryText = $derived(
		[
			`${summary.titles.toLocaleString()} ${summary.titles === 1 ? 'title' : 'titles'}`,
			summary.showAhead && summary.ahead > 0
				? `${summary.ahead.toLocaleString()} episodes ahead`
				: ''
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

{#if !authStore.isAuthenticated}
	<section class="welcome">
		<div class="hero">
			<p class="eyebrow">A tracker for MyAnimeList</p>
			<h1>Know where<br />you left off.</h1>
			<p class="lede">
				Your list, one tap per episode. AniDash syncs with MyAnimeList, opens offline, and keeps the
				next thing to watch within reach.
			</p>
			<div class="cta">
				<button class="btn btn-primary big" onclick={() => authStore.login()}
					>Connect MyAnimeList <ArrowRight size={17} /></button
				>
				<a class="btn btn-ghost big" href="/browse">Browse without an account</a>
			</div>
		</div>
		<div class="reel" aria-hidden="true">
			{#each Array(24) as _, i (i)}<span style:--i={i}></span>{/each}
		</div>
		<ul class="points">
			<li>
				<Zap size={18} />
				<h2>One tap per episode</h2>
				<p>Edits land instantly and sync to MyAnimeList in the background, in order.</p>
			</li>
			<li>
				<WifiOff size={18} />
				<h2>Opens offline</h2>
				<p>
					Your list is cached in this browser, so the app shell and your entries load without a
					connection.
				</p>
			</li>
			<li>
				<Compass size={18} />
				<h2>Find what is next</h2>
				<p>Search MyAnimeList, browse the season, or let the plan-to-watch roulette pick.</p>
			</li>
		</ul>
	</section>
{:else if !userListStore.initialized}
	<ListPageSkeleton />
{:else}
	<div class="page">
		<div class="page-head">
			<div>
				<h1 class="page-title">{pageTitle}</h1>
				<p class="page-sub num">{summaryText}</p>
			</div>
		</div>
		<TabBar counts={userListStore.statusCounts} />
		<div class="toolbar">
			<FilterBar />
			<div class="view-switch" role="group" aria-label="List display">
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
		{#if gridView}<AnimeGrid
				entries={filteredEntries}
				resetKey="{currentTab}-{currentSort}-{currentQuery}"
				loading={false}
				empty={emptyState}
			/>{:else}<AnimeJournal
				entries={filteredEntries}
				sort={currentSort}
				onsort={setSort}
				resetKey="{currentTab}-{currentSort}-{currentQuery}"
				empty={emptyState}
			/>{/if}
		{#if filteredEntries.length > 0}<p class="foot">
				Edits save on this device and sync when online.
			</p>{/if}
	</div>
{/if}

<style>
	.toolbar {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 16px 0 12px;
	}
	@media (min-width: 641px) {
		.toolbar {
			display: flex;
		}
	}
	.view-switch {
		display: flex;
		flex: none;
		margin-left: auto;
		padding: 3px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-m);
		background: var(--color-surface-1);
	}
	.view-switch button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 36px;
		border-radius: 7px;
		color: var(--color-text-muted);
		transition:
			background-color 0.15s,
			color 0.15s;
	}
	.view-switch button:hover {
		color: var(--color-text-primary);
	}
	.view-switch button.active {
		background: var(--color-surface-3);
		color: var(--color-text-primary);
	}
	.foot {
		padding: 24px 0 0;
		color: var(--color-text-muted);
		font-size: 12px;
		text-align: center;
	}

	/* ── Welcome ── */
	.welcome {
		max-width: 1100px;
		margin: 0 auto;
		padding: clamp(40px, 9vh, 96px) 0 48px;
	}
	.eyebrow {
		color: var(--color-primary);
		font-size: 13px;
		font-weight: 600;
	}
	.welcome h1 {
		margin: 14px 0 20px;
		font-family: var(--font-display);
		font-size: clamp(44px, 8.4vw, 104px);
		font-weight: 700;
		line-height: 0.95;
		letter-spacing: -0.055em;
	}
	.lede {
		max-width: 480px;
		color: var(--color-text-secondary);
		font-size: clamp(15px, 1.4vw, 18px);
		line-height: 1.6;
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 32px;
	}
	.big {
		min-height: 52px;
		padding: 0 22px;
		font-size: 15px;
	}
	.reel {
		display: flex;
		gap: 4px;
		margin: clamp(40px, 8vh, 80px) 0 32px;
	}
	.reel span {
		flex: 1;
		height: 10px;
		border-radius: 2px;
		background: var(--color-surface-3);
		animation: fill 3.2s var(--ease-fluid) infinite;
		animation-delay: calc(var(--i) * 70ms);
	}
	@keyframes fill {
		0%,
		12% {
			background: var(--color-surface-3);
		}
		30%,
		78% {
			background: var(--color-primary);
		}
		100% {
			background: var(--color-surface-3);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reel span {
			animation: none;
		}
		.reel span:nth-child(-n + 17) {
			background: var(--color-primary);
		}
	}
	.points {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 32px;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.points li {
		padding-top: 20px;
		border-top: 1px solid var(--color-border-strong);
	}
	.points li :global(svg) {
		color: var(--color-primary);
	}
	.points h2 {
		margin: 14px 0 6px;
		font-size: 16px;
		font-weight: 600;
	}
	.points p {
		color: var(--color-text-secondary);
		font-size: 14px;
	}
	@media (max-width: 767px) {
		.points {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		.cta :global(.btn) {
			flex: 1 1 100%;
		}
	}
</style>
