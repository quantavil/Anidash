<script lang="ts">
  import { connection } from '$lib/utils/connection.svelte';
  import { Wifi, WifiOff, CloudOff } from 'lucide-svelte';
</script>

{#if !connection.isOnline}
  <div class="sticky top-14 z-30 flex items-center justify-center gap-2 bg-error/90 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
    <WifiOff size={12} />
    You're offline — changes will sync when reconnected
  </div>
{:else if connection.wasOffline}
  <div class="sticky top-14 z-30 flex items-center justify-center gap-2 bg-success/90 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-opacity">
    <Wifi size={12} />
    Back online
  </div>
{/if}
