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
	import { settingsStore } from '$lib/stores/settings.svelte';

	import { purgeStaleAnime } from '$lib/cache/anime.cache';
	import { deleteDB, closeDB } from '$lib/cache/db';
	import { tokens } from '$lib/auth/tokens';
	import { refreshTokens, needsRefresh } from '$lib/auth/tokens';

	let { children } = $props();

	let initialized = $state(false);

	let dataLoaded = false;

	$effect(() => {
		if (authStore.isAuthenticated && !dataLoaded) {
			dataLoaded = true;
			
			userListStore.loadFromCache().then(() => {
				// Background sync if stale (>5 min) or never synced
				if (!syncStore.lastSynced || Date.now() - syncStore.lastSynced > 5 * 60 * 1000) {
					syncStore.fullSync().then((result) => {
						if (result.success) {
							userListStore.loadFromCache();
						}
					});
				}
			});
			syncStore.init();
			dubStore.init(); // non-blocking load of dub info

			// Purge stale cache in background
			purgeStaleAnime().catch(() => {});
		}
	});

	onMount(async () => {
		await authStore.init();
		settingsStore.init();
		initialized = true;
	});

	// Auth guard
	let showLoginPrompt = $state(false);

	$effect(() => {
		if (!initialized) return;
		if (authStore.isLoading) return;

		if (!authStore.isAuthenticated) {
			const hasSeenPrompt = sessionStorage.getItem('seen_login_prompt');
			if (!hasSeenPrompt && !authStore.isAuthRoute($page.url.pathname)) {
				showLoginPrompt = true;
				sessionStorage.setItem('seen_login_prompt', 'true');
			}
		}
	});

	function closeLoginPrompt() {
		showLoginPrompt = false;
	}

	// Auto-refresh token every 5 minutes
	onMount(() => {
		const interval = setInterval(
			async () => {
				if (authStore.isAuthenticated && needsRefresh()) {
					const result = await refreshTokens();
					if (!result.ok) {
						// Token refresh failed — clear session
						tokens.clear();
						authStore.logout();
					}
				}
			},
			5 * 60 * 1000
		);

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
		duration: 3000
	}}
/>

{#if !initialized || authStore.isLoading}
	<!-- App loading shell -->
	<div class="flex min-h-screen items-center justify-center bg-surface-0">
		<div class="space-y-4 text-center">
			<div
				class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
			<p class="text-sm text-text-secondary">Loading AniDash…</p>
		</div>
	</div>
{:else}
	<!-- ─── Main Layout ─── -->
	<div class="flex min-h-screen flex-col bg-surface-0">
		<FluidNav />

		<!-- Main content area -->
		<div class="flex flex-1 flex-col min-w-0 pt-16 md:pt-24 pb-20 md:pb-0 max-w-7xl mx-auto w-full">
			<!-- Offline banner -->
			{#if authStore.isAuthenticated}
				<OfflineBanner />
			{/if}

			<!-- Page content -->
			<main class="flex-1 px-4 lg:px-8">
				{@render children()}
			</main>
		</div>
	</div>

	<!-- Login Prompt Modal -->
	{#if !authStore.isAuthenticated && showLoginPrompt}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div class="w-full max-w-md rounded-2xl bg-surface-1 p-6 shadow-xl border border-white/10 text-center space-y-6">
				<h2 class="text-2xl font-bold text-text-primary">Welcome to AniDash</h2>
				<p class="text-text-secondary">
					Log in with your MyAnimeList account to manage your list, track progress, and get personalized recommendations.
				</p>
				<div class="flex flex-col gap-3">
					<button
						onclick={() => { closeLoginPrompt(); authStore.login(); }}
						class="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-hover transition-colors"
					>
						Login with MyAnimeList
					</button>
					<button
						onclick={closeLoginPrompt}
						class="w-full rounded-lg bg-surface-2 px-4 py-3 font-medium text-text-primary hover:bg-surface-3 transition-colors"
					>
						Maybe Later
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
