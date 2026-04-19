<script lang="ts">
  import { page } from '$app/stores';
  import { getUrlParam } from '$lib/utils/url-state';
  import { userListStore } from '$lib/stores/userlist.svelte';
  import { sortEntries, filterByStatus, filterByQuery, filterByDub, type SortKey } from '$lib/utils/sort';
  import { dubStore } from '$lib/stores/dub.svelte';

  import TabBar from '$lib/ui/TabBar.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import AnimeGrid from '$lib/ui/AnimeGrid.svelte';
  import CompleteAnimeDialog from '$lib/ui/CompleteAnimeDialog.svelte';
  import ListPageSkeleton from '$lib/ui/skeletons/ListPageSkeleton.svelte';

  // ─── URL State ───

  const currentTab = $derived(getUrlParam($page.url, 'tab', 'watching'));
  const currentSort = $derived(getUrlParam($page.url, 'sort', 'updated') as SortKey);

  const currentQuery = $derived(getUrlParam($page.url, 'q', ''));

  // ─── Derived Data ───

  const filteredEntries = $derived(
    sortEntries(
      filterByDub(
        filterByQuery(
          filterByStatus(userListStore.allEntries, currentTab),
          currentQuery,
        ),
        dubStore.dubMode,
        (malId) => dubStore.hasDub(malId)
      ),
      currentSort,
    ),
  );

  // ─── Complete Prompt ───

  let showCompleteDialog = $state(false);
  let completeTargetId = $state<number | null>(null);

  function handleCompletePrompt(malId: number) {
    completeTargetId = malId;
    showCompleteDialog = true;
  }


</script>

{#if !userListStore.initialized}
  <ListPageSkeleton />
{:else}
  <div class="mx-auto max-w-7xl px-4 py-6">
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
      loading={false}
      onComplete={handleCompletePrompt}
    />

    <!-- Stats footer -->
    {#if filteredEntries.length > 0}
      <div class="mt-6 border-t border-border pt-4 text-center text-xs text-text-muted">
        Showing {filteredEntries.length} of {userListStore.totalCount} entries
      </div>
    {/if}
  </div>
{/if}

<!-- Complete Confirmation Dialog -->
<CompleteAnimeDialog
  bind:open={showCompleteDialog}
  bind:malId={completeTargetId}
/>