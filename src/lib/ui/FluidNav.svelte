<script lang="ts">
	import { goto } from '$app/navigation';
	import { setUrlParam } from '$lib/utils/url-state';
	import Dialog from './Dialog.svelte';
	import { LayoutGrid } from 'lucide-svelte';
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
	const listView = $derived(
		page.url.pathname === '/'
			? (page.url.searchParams.get('view') ?? settingsStore.listView)
			: settingsStore.listView
	);
	function setView(view: 'journal' | 'grid') {
		settingsStore.setListView(view);
		if (page.url.pathname === '/')
			goto(setUrlParam(page.url, 'view', view), { keepFocus: true, noScroll: true });
	}
	const pathname = $derived(page.url.pathname);
	$effect(() => {
		void pathname;
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
			><span class="brand-symbol"><Logo size={23} /></span><span>AniDash</span></a
		>
		<nav class="desktop-nav" aria-label="Main navigation">
			{#each items as item (item.href)}<a
					href={item.href}
					class:active={page.url.pathname === item.href}
					aria-current={page.url.pathname === item.href ? 'page' : undefined}
					><item.icon size={17} strokeWidth={1.7} />{item.label}</a
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
</header>
<Dialog label="Preferences" open={settingsOpen} onclose={() => (settingsOpen = false)}>
	<div class="settings-panel">
		<div class="settings-heading">
			<h2>Preferences</h2>
			<button aria-label="Close settings" onclick={() => (settingsOpen = false)}
				><X size={20} /></button
			>
		</div>
		<section class="view-preference" aria-label="List display">
			<h3>List view</h3>
			<div class="view-options">
				<button
					class:chosen={listView === 'journal'}
					aria-pressed={listView === 'journal'}
					aria-label="Journal view"
					onclick={() => setView('journal')}><List size={22} /><span>Journal</span></button
				>
				<button
					class:chosen={listView === 'grid'}
					aria-pressed={listView === 'grid'}
					aria-label="Poster grid"
					onclick={() => setView('grid')}><LayoutGrid size={22} /><span>Posters</span></button
				>
			</div>
		</section>
		<button
			class="preference"
			aria-pressed={dubStore.dubMode}
			onclick={() => dubStore.toggleDubMode()}
			><Mic size={18} /><span>Dubbed anime only</span><span
				class="toggle"
				class:on={dubStore.dubMode}
			></span></button
		>
		<button
			class="preference"
			aria-pressed={settingsStore.preferEnglish}
			onclick={() => settingsStore.togglePreferEnglish()}
			><Languages size={18} /><span>English titles</span><span
				class="toggle"
				class:on={settingsStore.preferEnglish}
			></span></button
		>
		{#if authStore.isAuthenticated}<div class="account-row">
				<span>{authStore.user?.name}</span><button
					class="logout"
					onclick={() => {
						settingsOpen = false;
						authStore.logout();
					}}><LogOut size={17} />Disconnect</button
				>
			</div>{/if}
	</div>
</Dialog>
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
		position: sticky;
		top: 14px;
		z-index: 40;
		margin: 14px auto 0;
		width: min(1060px, calc(100% - 48px));
	}
	.header-inner {
		min-height: 68px;
		padding: 8px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border: 1px solid var(--color-border);
		border-radius: 40px;
		background: var(--color-surface-0);
		box-shadow:
			0 8px 32px #0005,
			inset 0 1px 0 #ffffff05;
	}
	.wordmark {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
		font-size: 21px;
		font-weight: 650;
		letter-spacing: -0.04em;
		min-height: 44px;
		padding-right: 20px;
		border-right: 1px solid var(--color-border);
	}
	.brand-symbol {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: 50%;
	}
	.desktop-nav {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.desktop-nav a {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 14px;
		border-radius: 24px;
		font-size: 14px;
		white-space: nowrap;
		color: var(--color-text-secondary);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.desktop-nav a:hover {
		color: var(--color-text-primary);
		background: var(--color-surface-1);
	}
	.desktop-nav a.active {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.sync-button {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 44px;
		min-height: 44px;
		justify-content: center;
		font-size: 11px;
		color: var(--color-text-secondary);
		cursor: pointer;
		border-radius: 50%;
	}
	.sync-button:hover:not(:disabled) {
		background: var(--color-surface-2);
		color: var(--color-text-primary);
	}
	.sync-button > span:not(.sync-dot) {
		display: none;
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
		background: var(--color-surface-1);
		cursor: pointer;
	}
	.settings-trigger:hover {
		border-color: var(--color-primary);
	}
	.connect-button {
		min-height: 44px;
		padding: 0 20px;
		border-radius: 24px;
		background: var(--color-primary);
		color: var(--color-on-primary);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.connect-button:hover {
		background: var(--color-primary-hover);
	}
	:global(.anidash-dialog:has(.settings-panel)) {
		width: min(380px, calc(100vw - 32px));
		padding: 0;
		margin: 100px max(24px, calc((100vw - 1060px) / 2)) auto auto;
	}
	.settings-panel {
		padding: 22px;
		background: var(--color-surface-1);
	}
	.settings-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}
	.settings-heading h2 {
		font-size: 23px;
		font-weight: 600;
		letter-spacing: -0.035em;
	}
	.settings-heading button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--color-surface-2);
		cursor: pointer;
	}
	.view-preference {
		padding-bottom: 20px;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 8px;
	}
	.view-preference h3 {
		font-size: 13px;
		color: var(--color-text-secondary);
		margin-bottom: 10px;
	}
	.view-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.view-options button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 64px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-surface-2);
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 14px;
	}
	.view-options button.chosen {
		color: var(--color-primary);
		border-color: var(--color-primary);
		background: var(--color-primary-dim);
	}
	.preference {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		text-align: left;
		cursor: pointer;
		font-size: 14px;
	}
	.toggle {
		margin-left: auto;
		width: 34px;
		height: 20px;
		padding: 3px;
		background: var(--color-surface-3);
		border-radius: 20px;
	}
	.toggle::after {
		content: '';
		display: block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-text-secondary);
	}
	.toggle.on {
		background: var(--color-primary);
	}
	.toggle.on::after {
		transform: translateX(14px);
		background: var(--color-on-primary);
	}
	.account-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--color-border);
		font-size: 13px;
	}
	.logout {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		color: var(--color-error);
		cursor: pointer;
	}
	.mobile-nav {
		display: none;
	}
	@media (max-width: 1000px) {
		.desktop-nav :global(svg) {
			display: none;
		}
		.desktop-nav a {
			padding: 0 10px;
			gap: 6px;
			font-size: 13px;
		}
		.header-inner {
			gap: 10px;
		}
		.wordmark {
			padding-right: 12px;
		}
	}
	@media (max-width: 767px) {
		.app-header {
			top: 0;
			margin: 0;
			width: 100%;
		}
		.header-inner {
			min-height: 64px;
			padding: 8px 16px;
			border-radius: 0;
			border: 0;
			border-bottom: 1px solid var(--color-border);
			box-shadow: none;
		}
		.wordmark {
			border: 0;
			padding: 0;
			font-size: 21px;
			gap: 8px;
		}
		.brand-symbol {
			width: 34px;
			height: 34px;
		}
		.desktop-nav {
			display: none;
		}
		.header-actions {
			gap: 6px;
		}
		.connect-button {
			padding: 0 14px;
		}
		.mobile-nav {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			z-index: 40;
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
			background: var(--color-surface-0);
			border-top: 1px solid var(--color-border);
		}
		.mobile-nav a {
			min-height: 52px;
			display: flex;
			flex-direction: column;
			gap: 5px;
			align-items: center;
			justify-content: center;
			color: var(--color-text-secondary);
			font-size: 11px;
			border-radius: 12px;
		}
		.mobile-nav a.active {
			color: var(--color-primary);
			background: color-mix(in srgb, var(--color-primary) 8%, transparent);
		}
		:global(.anidash-dialog:has(.settings-panel)) {
			margin: auto 0 0;
			width: 100%;
			max-width: none;
			border-radius: 20px 20px 0 0;
			max-height: 90dvh;
		}
		.settings-panel {
			padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
		}
	}
</style>
