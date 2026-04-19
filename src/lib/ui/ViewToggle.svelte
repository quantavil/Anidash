<script lang="ts">
  import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { LayoutGrid, List } from 'lucide-svelte';

  const currentView = $derived(getUrlParam($page.url, 'view', 'grid') as 'grid' | 'list');

  function setView(view: 'grid' | 'list') {
    goto(setUrlParam($page.url, 'view', view === 'grid' ? '' : view), { keepFocus: true, noScroll: true });
  }
</script>

<div class="flex overflow-hidden rounded-lg border border-border">
  <button
    onclick={() => setView('grid')}
    class="flex h-8 w-8 items-center justify-center transition-colors
      {currentView === 'grid'
        ? 'bg-primary/15 text-primary'
        : 'bg-surface-1 text-text-muted hover:text-text-secondary'}"
    title="Grid view"
    aria-label="Grid view"
    aria-pressed={currentView === 'grid'}
  >
    <LayoutGrid size={15} />
  </button>
  <button
    onclick={() => setView('list')}
    class="flex h-8 w-8 items-center justify-center transition-colors
      {currentView === 'list'
        ? 'bg-primary/15 text-primary'
        : 'bg-surface-1 text-text-muted hover:text-text-secondary'}"
    title="List view"
    aria-label="List view"
    aria-pressed={currentView === 'list'}
  >
    <List size={15} />
  </button>
</div>