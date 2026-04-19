<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import { Check, ChevronDown } from 'lucide-svelte';
  import { userListStore } from '$lib/stores/userlist.svelte';
  import { formatStatus } from '$lib/utils/format';
  import { tick } from 'svelte';

  type AnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

  let { malId, status }: { malId: number; status: AnimeStatus } = $props();

  const ALL_STATUSES: AnimeStatus[] = [
    'watching',
    'completed',
    'on_hold',
    'dropped',
    'plan_to_watch',
  ];

  const STATUS_COLORS: Record<AnimeStatus, string> = {
    watching: 'bg-primary/15 text-primary border-primary/30',
    completed: 'bg-success/15 text-success border-success/30',
    on_hold: 'bg-warning/15 text-warning border-warning/30',
    dropped: 'bg-error/15 text-error border-error/30',
    plan_to_watch: 'bg-info/15 text-info border-info/30',
  };

  const DOT_COLORS: Record<AnimeStatus, string> = {
    watching: 'bg-primary',
    completed: 'bg-success',
    on_hold: 'bg-warning',
    dropped: 'bg-error',
    plan_to_watch: 'bg-info',
  };

  function handleSelect(newStatus: AnimeStatus) {
    if (newStatus !== status) {
      userListStore.setStatus(malId, newStatus);
    }
  }

  function handleRemove() {
    userListStore.removeFromList(malId);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div onclick={(e) => e.stopPropagation()}>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-primary {STATUS_COLORS[status]}"
    >
      <span class="h-1.5 w-1.5 rounded-full {DOT_COLORS[status]}"></span>
      {formatStatus(status)}
      <ChevronDown size={12} class="opacity-60" />
    </DropdownMenu.Trigger>

    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class="glass-dropdown"
        sideOffset={4}
        align="start"
      >
        {#each ALL_STATUSES as s}
          <DropdownMenu.Item
            class="glass-dropdown-item"
            onSelect={() => handleSelect(s)}
          >
            <span class="h-2 w-2 shrink-0 rounded-full {DOT_COLORS[s]}"></span>
            <span class="flex-1">{formatStatus(s)}</span>
            {#if s === status}
              <Check size={14} class="text-text-muted" />
            {/if}
          </DropdownMenu.Item>
        {/each}

        <DropdownMenu.Separator class="my-1 block h-px bg-border" />

        <DropdownMenu.Item
          class="glass-dropdown-item !text-error !hover:bg-error/20"
          onSelect={handleRemove}
        >
          <span class="h-2 w-2 shrink-0 rounded-full bg-error"></span>
          <span class="flex-1">Remove</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
</div>