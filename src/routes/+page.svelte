<script lang="ts">
	import { page } from '$app/state';
	import { authStore } from '$lib/auth/auth.svelte';
	import { getUrlParam } from '$lib/utils/url-state';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { sortEntries, type SortKey } from '$lib/utils/sort';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { matchesFuzzy } from '$lib/utils/search';

	import TabBar from '$lib/ui/TabBar.svelte';
	import FilterBar from '$lib/ui/FilterBar.svelte';
	import AnimeGrid from '$lib/ui/AnimeGrid.svelte';
	import ListPageSkeleton from '$lib/ui/skeletons/ListPageSkeleton.svelte';

	// ─── URL State ───

	const currentTab = $derived(getUrlParam(page.url, 'tab', 'watching'));
	const currentSort = $derived(getUrlParam(page.url, 'sort', 'updated') as SortKey);

	const currentQuery = $derived(getUrlParam(page.url, 'q', ''));

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
	<div class="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
		<div class="mb-6 rounded-full bg-surface-2 p-6 shadow-xl shadow-black/20 border border-white/5">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="text-primary"
				><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z"
				></path></svg
			>
		</div>
		<h1 class="text-3xl font-bold text-text-primary mb-3">Track Your Anime</h1>
		<p class="text-text-secondary max-w-md mb-8">
			AniDash connects securely with your MyAnimeList account to provide a fast, beautiful, and
			offline-capable dashboard.
		</p>
		<button
			onclick={() => authStore.login()}
			class="rounded-full bg-primary px-8 py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
		>
			Connect with MyAnimeList
		</button>
	</div>
{:else if !userListStore.initialized}
	<ListPageSkeleton />
{:else}
	<div class="py-6">
		<!-- Header -->
		<div class="mb-5">
			<h1 class="text-2xl font-bold text-text-primary">My Anime List</h1>
		</div>

		<!-- Tabs -->
		<div class="mb-4">
			<TabBar counts={userListStore.statusCounts} />
		</div>

		<!-- Filters -->
		<div class="mb-5">
			<FilterBar />
		</div>

		<!-- Grid / List -->
		<AnimeGrid
			entries={filteredEntries}
			resetKey="{currentTab}-{currentSort}-{currentQuery}"
			loading={false}
		/>

		<!-- Stats footer -->
		{#if filteredEntries.length > 0}
			<div class="mt-6 border-t border-border pt-4 text-center text-xs text-text-muted">
				Showing {filteredEntries.length} of {userListStore.totalCount} entries
			</div>
		{/if}
	</div>
{/if}
