<script lang="ts">
	import { authStore } from '$lib/auth/auth.svelte';
	import { page } from '$app/stores';
	import Logo from '$lib/ui/Logo.svelte';

	const errorCode = $derived($page.url.searchParams.get('error'));
</script>

<div class="flex min-h-screen items-center justify-center bg-surface-0 px-4">
	<div class="w-full max-w-sm space-y-8 text-center">
		<!-- Brand -->
		<div class="space-y-2">
			<div
				class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
			>
				<Logo size={36} />
			</div>
			<h1 class="text-3xl font-bold text-text-primary">AniDash</h1>
			<p class="text-sm text-text-secondary">Personal anime tracker powered by MAL</p>
		</div>

		<!-- Error display -->
		{#if errorCode === 'access_denied'}
			<div class="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
				Authorization was denied. Please try again.
			</div>
		{/if}

		{#if authStore.error}
			<div class="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
				{authStore.error}
			</div>
		{/if}

		<!-- Login button -->
		<button
			onclick={() => authStore.login()}
			class="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-0"
		>
			Login with MyAnimeList
		</button>

		<p class="text-xs text-text-muted">
			Your MAL credentials are handled via OAuth. We never see your password.
		</p>
	</div>
</div>
