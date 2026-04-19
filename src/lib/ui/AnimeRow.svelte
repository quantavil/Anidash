<script lang="ts">
  import type { UserListRecord } from '$lib/cache/db';
  import {
    formatMediaType,
    formatRelativeDate,
    formatSeason,
  } from '$lib/utils/format';

  import StatusBadge from './StatusBadge.svelte';
  import EpisodeCounter from './EpisodeCounter.svelte';
  import RatingStars from './RatingStars.svelte';
  import ImageWithFallback from './ImageWithFallback.svelte';
  import { Mic } from 'lucide-svelte';
  import { dubStore } from '$lib/stores/dub.svelte';

  let {
    entry,
    onComplete,
  }: {
    entry: UserListRecord;
    onComplete?: (malId: number) => void;
  } = $props();

  const imageUrl = $derived(
    entry.mainPicture?.medium ?? entry.mainPicture?.large ?? null,
  );

  const progressPct = $derived(
    entry.numEpisodes > 0
      ? Math.min((entry.numWatchedEpisodes / entry.numEpisodes) * 100, 100)
      : 0,
  );
</script>

<div
  class="group flex items-center gap-4 rounded-lg border border-border bg-surface-0 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-surface-1"
>
  <!-- Thumbnail -->
  <a href="/anime/{entry.malId}" class="shrink-0 h-16 w-11">
    <ImageWithFallback
      src={imageUrl}
      alt={entry.title}
      class="h-16 w-11 rounded-md transition-opacity hover:opacity-80"
    />
  </a>

  <!-- Title + Meta -->
  <div class="min-w-0 flex-1">
    <a
      href="/anime/{entry.malId}"
      class="block truncate text-sm font-medium text-text-primary hover:text-primary"
    >
      {entry.title}
      {#if dubStore.hasDub(entry.malId)}
        <span class="inline-flex ml-2 align-middle items-center justify-center shrink-0 rounded-md border border-primary/20 bg-primary/10 px-1 py-0.5 text-primary" title="Dubbed">
          <Mic size={10} fill="currentColor" />
        </span>
      {/if}
    </a>
    <div class="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
      {#if entry.mediaType}
        <span>{formatMediaType(entry.mediaType)}</span>
      {/if}
      {#if entry.startSeason}
        <span>· {formatSeason(entry.startSeason.year, entry.startSeason.season)}</span>
      {/if}
      {#if entry.mean}
        <span>· ★ {entry.mean.toFixed(1)}</span>
      {/if}
    </div>
  </div>

  <!-- Status -->
  <div class="hidden sm:block">
    <StatusBadge malId={entry.malId} status={entry.status} />
  </div>

  <!-- Progress -->
  <div class="hidden md:block">
    <EpisodeCounter
      malId={entry.malId}
      watched={entry.numWatchedEpisodes}
      total={entry.numEpisodes}
      {onComplete}
    />
  </div>

  <!-- Rating -->
  <div class="hidden lg:flex">
    <RatingStars malId={entry.malId} score={entry.score} size={12} showValue={false} />
  </div>

  <!-- Updated -->
  <div class="hidden xl:block min-w-[4rem] text-right text-xs text-text-muted">
    {entry.updatedAt ? formatRelativeDate(entry.updatedAt) : '—'}
  </div>
</div>