<script lang="ts">
  import '../app.css';

  import { authStore } from '$lib/auth/auth.svelte';
  import { userListStore } from '$lib/stores/userlist.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Toaster, toast } from 'svelte-sonner';

  import FluidNav from '$lib/ui/FluidNav.svelte';
  import OfflineBanner from '$lib/ui/OfflineBanner.svelte';
  import { dubStore } from '$lib/stores/dub.svelte';

  import { purgeStaleAnime } from '$lib/cache/anime.cache';
  import { deleteDB, closeDB } from '$lib/cache/db';
  import { tokens } from '$lib/auth/tokens';
  import { refreshTokens, needsRefresh } from '$lib/auth/tokens';

  let { children } = $props();

  let initialized = $state(false);

  onMount(async () => {
    await authStore.init();

    if (authStore.isAuthenticated) {
      await userListStore.loadFromCache();
      await syncStore.init();
      dubStore.init(); // non-blocking load of dub info

      // Purge stale cache in background
      purgeStaleAnime().catch(() => {});

      // Background sync if stale (>5 min) or never synced
      if (!syncStore.lastSynced || Date.now() - syncStore.lastSynced > 5 * 60 * 1000) {
        syncStore.fullSync().then((result) => {
          if (result.success) {
            userListStore.loadFromCache();
          }
        });
      }
    }

    initialized = true;
  });

  // Auth guard
  $effect(() => {
    if (!initialized) return;
    if (authStore.isLoading) return;

    const pathname = $page.url.pathname;
    if (!authStore.isAuthenticated && !authStore.isAuthRoute(pathname)) {
      goto('/login');
    }
  });

  // Auto-refresh token every 5 minutes
  onMount(() => {
    const interval = setInterval(async () => {
      if (authStore.isAuthenticated && needsRefresh()) {
        const result = await refreshTokens();
        if (!result.ok) {
          // Token refresh failed — clear session
          tokens.clear();
          authStore.logout();
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  });

  // Flush pending syncs when page is hidden
  onMount(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        userListStore.flushPendingSyncs();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  });

  // Save before unload
  onMount(() => {
    const handler = (e: BeforeUnloadEvent) => {
      userListStore.flushPendingSyncs();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });
</script>

<Toaster
  theme="dark"
  position="bottom-right"
  toastOptions={{
    style: 'background: #18181b; border: 1px solid #27272a; color: #f4f4f5;',
    duration: 3000,
  }}
/>

{#if !initialized || authStore.isLoading}
  <!-- App loading shell -->
  <div class="flex min-h-screen items-center justify-center bg-surface-0">
    <div class="space-y-4 text-center">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      <p class="text-sm text-text-secondary">Loading AniDash…</p>
    </div>
  </div>
{:else if authStore.isAuthenticated}
  <!-- ─── Authenticated Layout ─── -->
  <div class="flex min-h-screen flex-col bg-surface-0">
    <FluidNav />

    <!-- Main content area -->
    <div class="flex flex-1 flex-col min-w-0 pt-0 md:pt-24 pb-20 md:pb-0 max-w-7xl mx-auto w-full">
      <!-- Offline banner -->
      <OfflineBanner />

      <!-- Page content -->
      <main class="flex-1 px-4 lg:px-8">
        {@render children()}
      </main>
    </div>
  </div>
{:else}
  <!-- ─── Unauthenticated ─── -->
  {@render children()}
{/if}