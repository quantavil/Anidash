<script lang="ts">
  import type { UserListRecord } from '$lib/cache/db';
  import AnimeCard from './AnimeCard.svelte';
  import AnimeCardSkeleton from './skeletons/AnimeCardSkeleton.svelte';

  let {
    entries = [],
    loading = false,
    onComplete,
  }: {
    entries: UserListRecord[];
    loading?: boolean;
    onComplete?: (malId: number) => void;
  } = $props();
</script>

{#if loading}
  <div class="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    <AnimeCardSkeleton count={12} />
  </div>
{:else if entries.length === 0}
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
    <div class="mb-3 text-4xl">📺</div>
    <p class="text-sm text-text-secondary">No anime found</p>
    <p class="mt-1 text-xs text-text-muted">Try a different filter or add anime from Browse</p>
  </div>
{:else}
  <div class="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {#each entries as entry, i (entry.malId)}
      <AnimeCard {entry} {onComplete} index={i} />
    {/each}
  </div>
{/if}