<script lang="ts">
	import { authStore } from '$lib/auth/auth.svelte';
	import { page } from '$app/state';
	import Logo from '$lib/ui/Logo.svelte';
	import { goto } from '$app/navigation';

	const errorCode = $derived(page.url.searchParams.get('error'));

	$effect(() => {
		if (authStore.isAuthenticated) {
			goto('/', { replaceState: true });
		}
	});
</script>

<div class="flex min-h-dvh items-center justify-center bg-surface-0 px-4">
	<div class="w-full max-w-sm space-y-8 text-center">
		<!-- Brand -->
		<div class="space-y-2">
			<Logo size={52} class="mx-auto" />
			<h1 class="page-title">anidash</h1>
			<p class="text-sm text-text-secondary">A tracker for your MyAnimeList</p>
		</div>

		<!-- Error display -->
		{#if errorCode}
			<div class="rounded-[var(--radius-m)] bg-error/10 px-4 py-3 text-sm text-error">
				{#if errorCode === 'access_denied'}
					Authorization was denied. Please try again.
				{:else if errorCode === 'no_code_or_state'}
					Authorization failed: missing state or code parameters.
				{:else}
					An error occurred during login: {errorCode}
				{/if}
			</div>
		{/if}

		{#if authStore.error}
			<div class="rounded-[var(--radius-m)] bg-error/10 px-4 py-3 text-sm text-error">
				{authStore.error}
			</div>
		{/if}

		<!-- Login button -->
		<button onclick={() => authStore.login()} class="btn btn-primary w-full">
			Login with MyAnimeList
		</button>

		<p class="text-xs text-text-muted">
			Your MAL credentials are handled via OAuth. We never see your password.
		</p>
	</div>
</div>
