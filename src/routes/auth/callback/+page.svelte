<script lang="ts">
  import { authStore } from '$lib/auth/auth.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(async () => {
    const code = $page.url.searchParams.get('code');
    const error = $page.url.searchParams.get('error');

    if (error) {
      // MAL denied access
      goto(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      goto('/login?error=no_code');
      return;
    }

    const exchangeResult = await authStore.handleCallback(code);

    if (exchangeResult.ok) {
      goto('/');
    } else {
      const message = exchangeResult.error.message || 'Authentication failed. Please try again.';
      goto(`/login?error=${encodeURIComponent(message)}`);
    }
  });
</script>

<div class="flex min-h-screen items-center justify-center bg-surface-0">
  <div class="text-center space-y-4">
    <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    <p class="text-sm text-text-secondary">Authenticating with MyAnimeList…</p>
  </div>
</div>
