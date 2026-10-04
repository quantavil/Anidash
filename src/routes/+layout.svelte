<script lang="ts">
	import '../app.css';

	import { authStore } from '$lib/auth/auth.svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { onMount } from 'svelte';
	import { Toaster, toast } from 'svelte-sonner';

	import ListPageSkeleton from '$lib/ui/skeletons/ListPageSkeleton.svelte';
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

	const STALE_AFTER_MS = 5 * 60 * 1000;

	/** Sync on a fresh session (new tab/window) or when data is older than 5 minutes. */
	async function syncIfNeeded(): Promise<void> {
		// Offline: the banner already informs the user; a doomed request only adds toast spam.
		if (typeof navigator !== 'undefined' && !navigator.onLine) return;

		const hasSyncedThisSession = sessionStorage.getItem(STORAGE_KEYS.HAS_SYNCED_THIS_SESSION);
		const isStale = !syncStore.lastSynced || Date.now() - syncStore.lastSynced > STALE_AFTER_MS;
		if (hasSyncedThisSession && !isStale) return;

		const result = await userListStore.syncFromRemote();
		if (result.ok) {
			sessionStorage.setItem(STORAGE_KEYS.HAS_SYNCED_THIS_SESSION, 'true');
		} else {
			sessionStorage.removeItem(STORAGE_KEYS.HAS_SYNCED_THIS_SESSION);
			logger.error('Background sync failed:', syncStore.syncError);
			toast.error('Sync failed — showing cached data', {
				description: 'Your list may be out of date. It will retry next load.'
			});
		}
	}

	$effect(() => {
		if (authStore.isAuthenticated && !dataLoaded) {
			dataLoaded = true;

			Promise.all([userListStore.loadFromCache(), syncStore.init()])
				.then(syncIfNeeded)
				.catch((e) => logger.error('Data loading failed:', e));
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

		// ─── Auto-sync when reconnecting online if list is unsynced or stale ───
		const onlineHandler = () => {
			if (authStore.isAuthenticated) void syncIfNeeded();
		};
		window.addEventListener('online', onlineHandler);

		// ─── Cleanup ───
		return () => {
			clearInterval(refreshInterval);
			document.removeEventListener('visibilitychange', visibilityHandler);
			window.removeEventListener('online', onlineHandler);
		};
	});
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
			{#if !initialized || authStore.isLoading}<ListPageSkeleton />{:else}{@render children()}{/if}
		</main>
	</div>
</div>

<CompleteAnimeDialog
	bind:open={userListStore.showCompleteDialog}
	bind:malId={userListStore.completeTargetId}
/>
