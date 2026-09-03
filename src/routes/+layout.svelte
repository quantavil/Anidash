<script lang="ts">
	import '../app.css';

	import { authStore } from '$lib/auth/auth.svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Toaster, toast } from 'svelte-sonner';

	import FluidNav from '$lib/ui/FluidNav.svelte';
	import OfflineBanner from '$lib/ui/OfflineBanner.svelte';
	import CompleteAnimeDialog from '$lib/ui/CompleteAnimeDialog.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { logger } from '$lib/utils/logger';

	import { refreshTokens, needsRefresh } from '$lib/auth/tokens';
	import { STORAGE_KEYS } from '$lib/constants';

	let { children } = $props();

	let initialized = $state(false);

	let dataLoaded = $state(false);

	$effect(() => {
		if (authStore.isAuthenticated && !dataLoaded) {
			dataLoaded = true;

			Promise.all([userListStore.loadFromCache(), syncStore.init()])
				.then(async () => {
					// Sync if it's a fresh session (new tab/window) OR if data is stale (>5 min)
					const hasSyncedThisSession = sessionStorage.getItem(STORAGE_KEYS.HAS_SYNCED_THIS_SESSION);
					const isStale =
						!syncStore.lastSynced || Date.now() - syncStore.lastSynced > 5 * 60 * 1000;

					if (!hasSyncedThisSession || isStale) {
						sessionStorage.setItem(STORAGE_KEYS.HAS_SYNCED_THIS_SESSION, 'true');
						// Flush offline queue BEFORE full sync to prevent overwriting local edits
						await userListStore.flushPersistentQueue();
						const result = await syncStore.fullSync();
						if (result.success) {
							userListStore.loadFromCache();
						} else {
							logger.error('Background sync failed:', syncStore.syncError);
							toast.error('Sync failed — showing cached data', {
								description: 'Your list may be out of date. It will retry next load.'
							});
						}
					}
				})
				.catch((e) => {
					logger.error('Data loading failed:', e);
					dataLoaded = false;
				});
		} else if (!authStore.isAuthenticated && dataLoaded) {
			dataLoaded = false;
		}
	});

	onMount(() => {
		// ─── Init ───
		authStore
			.init()
			.then(() => {
				initialized = true;
			})
			.catch((err) => {
				logger.error('Auth store init failed:', err);
				initialized = true;
			});
		settingsStore.init();
		dubStore.init();

		// ─── Auto-refresh token every 5 minutes ───
		const refreshInterval = setInterval(
			async () => {
				if (authStore.isAuthenticated && needsRefresh()) {
					const result = await refreshTokens();
					if (!result.ok && result.error.type !== 'network') {
						// logout() clears tokens itself.
						authStore.logout();
					}
				}
			},
			5 * 60 * 1000
		);

		// ─── Flush pending syncs on visibility change ───
		const visibilityHandler = () => {
			if (document.visibilityState === 'hidden') {
				userListStore.flushPendingSyncs();
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);

		// ─── Cleanup ───
		return () => {
			clearInterval(refreshInterval);
			document.removeEventListener('visibilitychange', visibilityHandler);
		};
	});

	// Auth guard
	let showLoginPrompt = $state(false);

	$effect(() => {
		if (!initialized) return;
		if (authStore.isLoading) return;

		if (!authStore.isAuthenticated) {
			const hasSeenPrompt = sessionStorage.getItem(STORAGE_KEYS.SEEN_LOGIN_PROMPT);
			if (!hasSeenPrompt && !authStore.isAuthRoute(page.url.pathname)) {
				showLoginPrompt = true;
				sessionStorage.setItem(STORAGE_KEYS.SEEN_LOGIN_PROMPT, 'true');
			}
		}
	});

	function closeLoginPrompt() {
		showLoginPrompt = false;
	}
</script>

<svelte:head>
	<title>AniDash</title>
</svelte:head>

<Toaster
	theme="dark"
	position="top-right"
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
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onclick={closeLoginPrompt}
			onkeydown={(e) => {
				if (e.key === 'Escape') closeLoginPrompt();
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Login prompt"
			tabindex="-1"
		>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="w-full max-w-md rounded-2xl bg-surface-1 p-6 shadow-xl border border-white/10 text-center space-y-6"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<h2 class="text-2xl font-bold text-text-primary">Welcome to AniDash</h2>
				<p class="text-text-secondary">
					Log in with your MyAnimeList account to manage your list, track progress, and get
					personalized recommendations.
				</p>
				<div class="flex flex-col gap-3">
					<!-- svelte-ignore a11y_autofocus -->
					<button
						autofocus
						onclick={() => {
							closeLoginPrompt();
							authStore.login();
						}}
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
	<CompleteAnimeDialog
		bind:open={userListStore.showCompleteDialog}
		bind:malId={userListStore.completeTargetId}
	/>
{/if}
