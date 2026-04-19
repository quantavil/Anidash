<script lang="ts">

  let {
    src,
    alt = '',
    aspectRatio = '3/4',
    fallbackIcon = 'film',
    class: className = '',
  }: {
    src: string | null | undefined;
    alt?: string;
    aspectRatio?: string;
    fallbackIcon?: 'film' | 'user';
    class?: string;
  } = $props();

  let loaded = $state(false);
  let error = $state(false);
  let imgEl: HTMLImageElement | null = $state(null);

  const ICON_MAP = {
    film: '🎬',
    user: '👤',
  };

  $effect(() => {
    // Reset state when src changes
    loaded = false;
    error = false;
  });
</script>

<div
  class="relative overflow-hidden bg-surface-2 {className}"
  style="aspect-ratio: {aspectRatio};"
>
  {#if src && !error}
    <img
      bind:this={imgEl}
      {src}
      {alt}
      loading="lazy"
      decoding="async"
      onload={() => (loaded = true)}
      onerror={() => (error = true)}
      class="h-full w-full object-cover transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
    />
    <!-- Shimmer while loading -->
    {#if !loaded}
      <div class="absolute inset-0 animate-pulse bg-surface-2"></div>
    {/if}
  {:else}
    <div class="flex h-full w-full items-center justify-center">
      <span class="text-2xl opacity-30">{ICON_MAP[fallbackIcon]}</span>
    </div>
  {/if}
</div>
