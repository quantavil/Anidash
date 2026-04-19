<script lang="ts">
  import { userListStore } from '$lib/stores/userlist.svelte';
  import { Plus, Minus, Check } from 'lucide-svelte';

  let {
    malId,
    watched,
    total,
    onComplete,
  }: {
    malId: number;
    watched: number;
    total: number;
    onComplete?: (malId: number) => void;
  } = $props();

  const unknown = $derived(total === 0);
  const pct = $derived(
    unknown || total === 0 ? 0 : Math.min((watched / total) * 100, 100),
  );
  const isComplete = $derived(!unknown && watched >= total && total > 0);

  function increment() {
    const result = userListStore.incrementEpisode(malId);
    if (result && result.watched >= result.total && result.total > 0) {
      onComplete?.(malId);
    }
  }

  function decrement() {
    if (watched > 0) {
      userListStore.setEpisodeCount(malId, watched - 1);
    }
  }
</script>

<div
  class="flex items-center gap-2"
  onclick={(e) => e.stopPropagation()}
  role="presentation"
>
  <!-- Progress bar -->
  <div class="relative h-2 w-16 overflow-hidden rounded-full bg-white/8 sm:w-20">
    <div
      class="absolute inset-y-0 left-0 rounded-full transition-all duration-300
        {isComplete ? 'bg-success' : 'bg-primary'}"
      style="width: {pct}%"
    ></div>
  </div>

  <!-- Episode count -->
  <span class="min-w-[3rem] text-xs font-medium tabular-nums text-text-secondary">
    {watched}/{unknown ? '?' : total}
  </span>

  <!-- Controls -->
  <div class="flex items-center gap-1">
    <button
      onclick={(e) => { e.preventDefault(); e.stopPropagation(); decrement(); }}
      disabled={watched <= 0}
      class="ep-btn"
      title="Decrease episode"
    >
      <Minus size={14} strokeWidth={2.5} />
    </button>
    <button
      onclick={(e) => { e.preventDefault(); e.stopPropagation(); increment(); }}
      disabled={isComplete}
      class="ep-btn ep-btn-plus"
      title="Increase episode"
    >
      {#if isComplete}
        <Check size={14} strokeWidth={2.5} class="text-success" />
      {:else}
        <Plus size={14} strokeWidth={2.5} />
      {/if}
    </button>
  </div>
</div>