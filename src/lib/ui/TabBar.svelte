<script lang="ts">
  import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { userListStore } from '$lib/stores/userlist.svelte';
  import { formatStatus } from '$lib/utils/format';

  type TabKey = 'all' | 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

  let { counts }: { counts: Record<string, number> } = $props();

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'watching', label: 'Watching' },
    { key: 'plan_to_watch', label: 'Plan to Watch' },
    { key: 'completed', label: 'Completed' },
    { key: 'on_hold', label: 'On Hold' },
    { key: 'dropped', label: 'Dropped' },
    { key: 'all', label: 'All' },
  ];

  const activeColors: Record<string, string> = {
    all: 'bg-surface-2 text-text-primary',
    watching: 'bg-primary/15 text-primary',
    completed: 'bg-success/15 text-success',
    on_hold: 'bg-warning/15 text-warning',
    dropped: 'bg-error/15 text-error',
    plan_to_watch: 'bg-info/15 text-info',
  };

  const currentTab = $derived(getUrlParam($page.url, 'tab', 'watching') as TabKey);

  function selectTab(key: TabKey) {
    goto(setUrlParam($page.url, 'tab', key === 'watching' ? '' : key), { keepFocus: true, noScroll: true });
  }

  function getCount(key: TabKey): number {
    if (key === 'all') return userListStore.totalCount;
    return counts[key] ?? 0;
  }
</script>

<div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist">
  {#each tabs as tab}
    {@const isActive = currentTab === tab.key}
    <button
      role="tab"
      aria-selected={isActive}
      onclick={() => selectTab(tab.key)}
      class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
        {isActive
          ? activeColors[tab.key] ?? activeColors.all
          : 'text-text-muted hover:bg-surface-2 hover:text-text-secondary'}"
    >
      {tab.label}
      <span
        class="min-w-[1.25rem] rounded-full px-1.5 text-center text-xs
          {isActive ? 'opacity-80' : 'bg-surface-2 text-text-muted'}"
      >
        {getCount(tab.key)}
      </span>
    </button>
  {/each}
</div>