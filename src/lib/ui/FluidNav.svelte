<script lang="ts">
	import { page } from '$app/state';
	import { authStore } from '$lib/auth/auth.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { connection } from '$lib/utils/connection.svelte';
	import {
		List,
		Search,
		Calendar,
		ChartNoAxesColumn,
		RefreshCw,
		Languages,
		Mic,
		LogOut,
		Settings2,
		X
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import Logo from './Logo.svelte';
	let settingsOpen = $state(false);
	const items = [
		{ href: '/', label: 'My list', icon: List },
		{ href: '/browse', label: 'Browse', icon: Search },
		{ href: '/seasonal', label: 'Seasonal', icon: Calendar },
		{ href: '/stats', label: 'Stats', icon: ChartNoAxesColumn }
	];
	const syncLabel = $derived(
		!connection.isOnline
			? 'Offline'
			: syncStore.isSyncing
				? 'Syncing'
				: syncStore.syncError
					? 'Sync delayed'
					: syncStore.lastSynced
						? 'Last sync ' +
							new Date(syncStore.lastSynced).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit'
							})
						: 'Not synced yet'
	);
	async function handleSync() {
		const result = await userListStore.syncFromRemote();
		if (result.ok) toast.success('List synced');
		else
			toast.error('Sync delayed', {
				description: 'Your local changes are saved. Try again when connected.'
			});
	}
	$effect(() => {
		void page.url.pathname;
		settingsOpen = false;
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') settingsOpen = false;
	}}
/>

<header class="app-header">
	<div class="header-inner">
		<a class="wordmark" href="/" aria-label="AniDash home"
			><Logo size={25} /><span>AniDash<span class="wordmark-dot">.</span></span></a
		>
		<nav class="desktop-nav" aria-label="Main navigation">
			{#each items as item (item.href)}<a
					href={item.href}
					class:active={page.url.pathname === item.href}
					aria-current={page.url.pathname === item.href ? 'page' : undefined}>{item.label}</a
				>{/each}
		</nav>
		<div class="header-actions">
			{#if authStore.isAuthenticated}<button
					class="sync-button"
					disabled={syncStore.isSyncing || !connection.isOnline}
					onclick={handleSync}
					aria-label="Sync your list with MyAnimeList"
					title={syncLabel}
					><span class="sync-dot" class:delayed={!connection.isOnline || !!syncStore.syncError}
					></span><span>{syncLabel}</span><RefreshCw
						size={14}
						class={syncStore.isSyncing ? 'animate-spin' : ''}
					/></button
				>{/if}
			<button
				class="settings-trigger"
				aria-label="Settings and account"
				aria-expanded={settingsOpen}
				onclick={() => (settingsOpen = !settingsOpen)}
				>{#if settingsOpen}<X size={18} />{:else}<Settings2 size={18} />{/if}</button
			>
			{#if !authStore.isAuthenticated && !authStore.isLoading}<button
					class="connect-button"
					onclick={() => authStore.login()}>Connect MAL</button
				>{/if}
		</div>
	</div>
	{#if settingsOpen}
		<div class="settings-panel" role="region" aria-label="Your preferences">
			<h2>Your preferences</h2>
			<button
				class="preference"
				aria-pressed={dubStore.dubMode}
				onclick={() => dubStore.toggleDubMode()}
				><Mic size={17} /><span>Dubbed anime only</span><span class="preference-value"
					>{dubStore.dubMode ? 'On' : 'Off'}</span
				></button
			>
			<button
				class="preference"
				aria-pressed={settingsStore.preferEnglish}
				onclick={() => settingsStore.togglePreferEnglish()}
				><Languages size={17} /><span>English titles</span><span class="preference-value"
					>{settingsStore.preferEnglish ? 'On' : 'Off'}</span
				></button
			>
			{#if authStore.isAuthenticated}<p class="account-name">Connected as {authStore.user?.name}</p>
				<button
					class="preference logout"
					onclick={() => {
						settingsOpen = false;
						authStore.logout();
					}}><LogOut size={17} /><span>Disconnect account</span></button
				>{/if}
		</div>
	{/if}
</header>
{#if settingsOpen}
	<button
		class="settings-dismiss"
		aria-label="Close settings"
		onclick={() => (settingsOpen = false)}
	></button>
{/if}
<nav class="mobile-nav" aria-label="Mobile navigation">
	{#each items as item (item.href)}<a
			href={item.href}
			class:active={page.url.pathname === item.href}
			aria-current={page.url.pathname === item.href ? 'page' : undefined}
			><item.icon size={20} strokeWidth={1.6} /><span>{item.label}</span></a
		>{/each}
</nav>

<style>
	.app-header {
		position: relative;
		z-index: 40;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-0);
	}
	.header-inner {
		height: 80px;
		padding: 0 32px;
		max-width: 1440px;
		margin: auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}
	.wordmark {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--font-display);
		font-size: 25px;
		letter-spacing: -0.035em;
		flex-shrink: 0;
	}
	.wordmark-dot {
		color: var(--color-primary);
	}
	.desktop-nav {
		display: flex;
		align-self: stretch;
		gap: 32px;
	}
	.desktop-nav a {
		display: flex;
		align-items: center;
		font-size: 13px;
		color: var(--color-text-secondary);
		position: relative;
	}
	.desktop-nav a:hover,
	.desktop-nav a.active {
		color: var(--color-text-primary);
	}
	.desktop-nav a.active::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		background: var(--color-primary);
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.sync-button {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 11px;
	}
	.sync-button:hover:not(:disabled) {
		color: var(--color-text-primary);
	}
	.sync-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-success);
	}
	.sync-dot.delayed {
		background: var(--color-warning);
	}
	.settings-trigger {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 1px solid var(--color-border);
		border-radius: 50%;
		cursor: pointer;
		background: var(--color-surface-1);
	}
	.settings-trigger:hover {
		border-color: var(--color-primary);
	}
	.connect-button {
		min-height: 44px;
		padding: 0 14px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-size: 12px;
		cursor: pointer;
	}
	.settings-panel {
		position: absolute;
		right: max(16px, calc((100vw - 1376px) / 2));
		top: 70px;
		width: min(300px, calc(100vw - 32px));
		padding: 18px;
		border-radius: 12px;
		border: 1px solid var(--color-border);
		background: var(--color-surface-1);
		box-shadow:
			0 12px 50px #0008,
			inset 0 1px 0 #ffffff0a;
		z-index: 50;
	}
	.settings-panel h2 {
		font-family: var(--font-display);
		font-size: 21px;
		margin-bottom: 12px;
	}
	.preference {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 48px;
		text-align: left;
		cursor: pointer;
		font-size: 13px;
	}
	.preference-value {
		margin-left: auto;
		color: var(--color-primary);
	}
	.account-name {
		padding-top: 16px;
		margin-top: 8px;
		border-top: 1px solid var(--color-border);
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.logout {
		color: var(--color-error);
	}
	.settings-dismiss {
		position: fixed;
		inset: 0;
		z-index: 35;
		cursor: default;
	}
	.mobile-nav {
		display: none;
	}
	@media (max-width: 900px) {
		.header-inner {
			padding: 0 24px;
			gap: 20px;
		}
		.desktop-nav {
			gap: 22px;
		}
		.sync-button > span:not(.sync-dot) {
			display: none;
		}
	}
	@media (max-width: 640px) {
		.header-inner {
			height: 64px;
			padding: 0 18px;
			gap: 12px;
		}
		.wordmark {
			font-size: 23px;
		}
		.desktop-nav {
			display: none;
		}
		.header-actions {
			gap: 6px;
		}
		.settings-trigger {
			width: 44px;
			height: 44px;
		}
		.mobile-nav {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			z-index: 40;
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
			background: var(--color-surface-1);
			border-top: 1px solid var(--color-border);
			box-shadow: 0 -6px 20px #0002;
		}
		.mobile-nav a {
			min-height: 48px;
			display: flex;
			flex-direction: column;
			gap: 5px;
			align-items: center;
			justify-content: center;
			color: var(--color-text-secondary);
			font-size: 10px;
		}
		.mobile-nav a.active {
			color: var(--color-primary);
		}
		.settings-panel {
			top: 58px;
		}
	}
</style>
