<div class="mx-auto max-w-5xl px-4 py-6">
  <!-- Header skeleton -->
  <div class="flex gap-6">
    <div class="h-[300px] w-[200px] shrink-0 animate-pulse rounded-xl bg-surface-2"></div>
    <div class="flex-1 space-y-3">
      <div class="h-8 w-3/4 animate-pulse rounded bg-surface-2"></div>
      <div class="h-5 w-1/3 animate-pulse rounded bg-surface-2"></div>
      <div class="h-4 w-1/2 animate-pulse rounded bg-surface-2"></div>
      <div class="mt-4 flex gap-2">
        <div class="h-9 w-32 animate-pulse rounded-lg bg-surface-2"></div>
        <div class="h-9 w-24 animate-pulse rounded-lg bg-surface-2"></div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        {#each Array(6) as _}
          <div class="h-4 w-full animate-pulse rounded bg-surface-2"></div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Tabs skeleton -->
  <div class="mt-8 flex gap-4 border-b border-border pb-3">
    {#each Array(5) as _}
      <div class="h-4 w-20 animate-pulse rounded bg-surface-2"></div>
    {/each}
  </div>

  <!-- Content skeleton -->
  <div class="mt-6 space-y-3">
    {#each Array(5) as _}
      <div class="h-4 w-full animate-pulse rounded bg-surface-2"></div>
    {/each}
    <div class="h-4 w-2/3 animate-pulse rounded bg-surface-2"></div>
  </div>
</div>
