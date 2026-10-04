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
		SlidersHorizontal,
		LogOut,
		Command
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import Logo from './Logo.svelte';
	import Dialog from './Dialog.svelte';

	let { onsearch }: { onsearch: () => void } = $props();

	let prefsOpen = $state(false);

	const items = [
		{ href: '/', label: 'My list', icon: List },
		{ href: '/browse', label: 'Browse', icon: Search },
		{ href: '/seasonal', label: 'Seasonal', icon: Calendar },
		{ href: '/stats', label: 'Stats', icon: ChartNoAxesColumn }
	];

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	const watchingCount = $derived(
		authStore.isAuthenticated && userListStore.initialized
			? (userListStore.statusCounts.watching ?? 0)
			: 0
	);

	const sync = $derived.by(() => {
		if (!connection.isOnline) return { label: 'Offline', tone: 'warn' };
		if (syncStore.isSyncing) return { label: 'Syncing…', tone: 'busy' };
		if (syncStore.syncError) return { label: 'Sync delayed', tone: 'warn' };
		if (syncStore.lastSynced)
			return {
				label:
					'Synced ' +
					new Date(syncStore.lastSynced).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit'
					}),
				tone: 'ok'
			};
		return { label: 'Not synced yet', tone: 'warn' };
	});

	async function handleSync() {
		const result = await userListStore.syncFromRemote();
		if (result.ok) toast.success('List synced');
		else
			toast.error('Sync delayed', {
				description: 'Your local changes are saved. Try again when connected.'
			});
	}

	const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

	$effect(() => {
		void page.url.pathname;
		prefsOpen = false;
	});
</script>

{#snippet syncButton(showLabel: boolean)}
	{#if authStore.isAuthenticated}
		<button
			class="nav-action"
			disabled={syncStore.isSyncing || !connection.isOnline}
			onclick={handleSync}
			aria-label="Sync your list with MyAnimeList"
			title={sync.label}
		>
			<RefreshCw size={17} class={syncStore.isSyncing ? 'animate-spin' : ''} />
			{#if showLabel}<span class="nav-label"
					><span class="sync-dot" data-tone={sync.tone}></span>{sync.label}</span
				>{/if}
		</button>
	{/if}
{/snippet}

<!-- Desktop sidebar / tablet icon rail -->
<aside class="side" aria-label="Sidebar">
	<a class="brand" href="/" aria-label="AniDash home"
		><Logo size={30} /><span class="brand-name">anidash</span></a
	>
	<button class="search-trigger" onclick={onsearch} aria-label="Search and jump (command palette)">
		<Search size={16} /><span class="nav-label">Jump to…</span>
		<span class="nav-label kbd-wrap"
			>{#if isMac}<span class="kbd"><Command size={11} /></span>{:else}<span class="kbd">Ctrl</span
				>{/if}<span class="kbd">K</span></span
		>
	</button>
	<nav class="side-nav" aria-label="Main navigation">
		{#each items as item (item.href)}
			<a
				href={item.href}
				class="side-link"
				class:active={isActive(item.href)}
				aria-current={isActive(item.href) ? 'page' : undefined}
				title={item.label}
				><item.icon size={18} strokeWidth={1.8} /><span class="nav-label">{item.label}</span
				>{#if item.href === '/' && watchingCount > 0}<span
						class="nav-label count num"
						title="{watchingCount} watching">{watchingCount}</span
					>{/if}</a
			>
		{/each}
	</nav>
	<div class="side-foot">
		{@render syncButton(true)}
		<button
			class="nav-action"
			aria-label="Settings and account"
			aria-haspopup="dialog"
			onclick={() => (prefsOpen = true)}
			title="Settings and account"
			><SlidersHorizontal size={17} /><span class="nav-label"
				>{authStore.isAuthenticated ? (authStore.user?.name ?? 'Settings') : 'Settings'}</span
			></button
		>
		{#if !authStore.isAuthenticated && !authStore.isLoading}
			<button class="btn btn-primary connect" onclick={() => authStore.login()}
				><span class="nav-label">Connect MAL</span><span class="rail-only">MAL</span></button
			>
		{/if}
	</div>
</aside>

<!-- Phone: compact top bar + bottom tab bar -->
<header class="topbar">
	<a class="brand" href="/" aria-label="AniDash home"
		><Logo size={28} /><span class="brand-name">anidash</span></a
	>
	<div class="topbar-actions">
		<button class="icon-btn" onclick={onsearch} aria-label="Search and jump"
			><Search size={19} /></button
		>
		{#if authStore.isAuthenticated}
			<button
				class="icon-btn"
				disabled={syncStore.isSyncing || !connection.isOnline}
				onclick={handleSync}
				aria-label="Sync your list with MyAnimeList"
				title={sync.label}
				><RefreshCw size={18} class={syncStore.isSyncing ? 'animate-spin' : ''} /><span
					class="sync-dot corner"
					data-tone={sync.tone}
				></span></button
			>
		{:else if !authStore.isLoading}
			<button class="btn btn-primary" onclick={() => authStore.login()}>Connect</button>
		{/if}
		<button
			class="icon-btn"
			aria-label="Settings and account"
			aria-haspopup="dialog"
			onclick={() => (prefsOpen = true)}><SlidersHorizontal size={19} /></button
		>
	</div>
</header>
<nav class="tabbar" aria-label="Mobile navigation">
	{#each items as item (item.href)}
		<a
			href={item.href}
			class:active={isActive(item.href)}
			aria-current={isActive(item.href) ? 'page' : undefined}
			><item.icon size={21} strokeWidth={1.8} /><span>{item.label}</span></a
		>
	{/each}
</nav>

<Dialog bind:open={prefsOpen} sheet label="Your preferences">
	<div class="prefs">
		<h2>Your preferences</h2>
		<button
			class="pref"
			role="switch"
			aria-checked={dubStore.dubMode}
			onclick={() => dubStore.toggleDubMode()}
			><span>Dubbed anime only</span><span class="switch" aria-hidden="true"></span></button
		>
		<button
			class="pref"
			role="switch"
			aria-checked={settingsStore.preferEnglish}
			onclick={() => settingsStore.togglePreferEnglish()}
			><span>English titles</span><span class="switch" aria-hidden="true"></span></button
		>
		{#if authStore.isAuthenticated}
			<p class="account">Connected as <strong>{authStore.user?.name}</strong></p>
			<button
				class="pref danger"
				onclick={() => {
					prefsOpen = false;
					authStore.logout();
				}}><LogOut size={16} /><span>Disconnect account</span></button
			>
		{/if}
	</div>
</Dialog>

<style>
	/* ── Shared ── */
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
	}
	.brand-name {
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 700;
		letter-spacing: -0.04em;
	}
	.sync-dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		margin-right: 8px;
		border-radius: 50%;
		background: var(--color-success);
	}
	.sync-dot[data-tone='warn'] {
		background: var(--color-warning);
	}
	.sync-dot[data-tone='busy'] {
		background: var(--color-info);
	}

	/* ── Sidebar (>= 1100px), rail (768–1099px) ── */
	.side {
		position: sticky;
		top: 0;
		height: 100dvh;
		display: none;
		flex-direction: column;
		gap: 16px;
		padding: 16px 12px;
		border-right: 1px solid var(--color-border);
		background: var(--color-surface-0);
		z-index: 30;
	}
	.side .brand {
		padding: 0 8px;
	}
	.search-trigger {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-m);
		color: var(--color-text-secondary);
		font-size: 13px;
		transition:
			border-color 0.15s,
			color 0.15s;
	}
	.search-trigger:hover {
		border-color: var(--color-border-strong);
		color: var(--color-text-primary);
	}
	.kbd-wrap {
		display: inline-flex;
		gap: 3px;
		margin-left: auto;
	}
	.side-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.side-link,
	.nav-action {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 0 12px;
		border-radius: var(--radius-m);
		color: var(--color-text-secondary);
		font-size: 14px;
		font-weight: 500;
		transition:
			background-color 0.15s,
			color 0.15s;
	}
	.side-link:hover,
	.nav-action:hover:not(:disabled) {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
	}
	.side-link.active {
		background: var(--color-surface-2);
		color: var(--color-text-primary);
	}
	.side-link.active::before {
		content: '';
		position: absolute;
		left: -12px;
		top: 12px;
		bottom: 12px;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: var(--color-primary);
	}
	.side-link.active :global(svg) {
		color: var(--color-primary);
	}
	.count {
		margin-left: auto;
		padding: 1px 7px;
		border-radius: 999px;
		background: var(--color-surface-3);
		font-size: 11px;
		color: var(--color-text-secondary);
	}
	.side-foot {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.nav-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.nav-action .nav-label {
		font-size: 13px;
		display: flex;
		align-items: center;
	}
	.connect {
		margin-top: 8px;
	}
	.rail-only {
		display: none;
	}

	.topbar,
	.tabbar {
		display: none;
	}

	@media (min-width: 768px) {
		.side {
			display: flex;
		}
	}
	/* Icon rail */
	@media (min-width: 768px) and (max-width: 1099px) {
		.side {
			align-items: center;
			padding: 14px 8px;
		}
		.side .brand {
			padding: 0;
		}
		.brand-name,
		.nav-label,
		.nav-action .nav-label {
			display: none;
		}
		.rail-only {
			display: inline;
		}
		.search-trigger,
		.side-link,
		.nav-action {
			justify-content: center;
			width: 48px;
			padding: 0;
		}
		.side-link.active::before {
			left: -8px;
		}
		.side-foot {
			align-items: center;
		}
		.connect {
			width: 48px;
			padding: 0;
			font-size: 11px;
		}
	}

	/* ── Phone ── */
	@media (max-width: 767px) {
		.topbar {
			position: sticky;
			top: 0;
			z-index: 40;
			display: flex;
			align-items: center;
			justify-content: space-between;
			height: calc(var(--header-h) + env(safe-area-inset-top));
			padding: env(safe-area-inset-top) 8px 0 16px;
			background: color-mix(in srgb, var(--color-surface-0) 92%, transparent);
			backdrop-filter: blur(12px);
			border-bottom: 1px solid var(--color-border);
		}
		.topbar-actions {
			display: flex;
			align-items: center;
			gap: 2px;
		}
		.icon-btn {
			position: relative;
			display: grid;
			place-items: center;
			width: 44px;
			height: 44px;
			border-radius: var(--radius-m);
			color: var(--color-text-secondary);
		}
		.icon-btn:active {
			background: var(--color-surface-2);
		}
		.sync-dot.corner {
			position: absolute;
			right: 9px;
			top: 9px;
			width: 6px;
			height: 6px;
			margin: 0;
			box-shadow: 0 0 0 2px var(--color-surface-0);
		}
		.tabbar {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 40;
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
			background: color-mix(in srgb, var(--color-surface-0) 94%, transparent);
			backdrop-filter: blur(14px);
			border-top: 1px solid var(--color-border);
		}
		.tabbar a {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 3px;
			min-height: 48px;
			border-radius: var(--radius-m);
			color: var(--color-text-secondary);
			font-size: 11px;
			font-weight: 500;
		}
		.tabbar a.active {
			color: var(--color-primary);
		}
	}

	/* ── Preferences ── */
	.prefs h2 {
		font-family: var(--font-display);
		font-size: 20px;
		font-weight: 650;
		letter-spacing: -0.02em;
		margin-bottom: 8px;
	}
	.pref {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		min-height: 52px;
		text-align: left;
		font-size: 14px;
		border-bottom: 1px solid var(--color-border);
	}
	.switch {
		position: relative;
		flex: none;
		width: 40px;
		height: 24px;
		border-radius: 999px;
		background: var(--color-surface-3);
		transition: background-color 0.15s;
	}
	.switch::after {
		content: '';
		position: absolute;
		left: 3px;
		top: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--color-text-secondary);
		transition:
			transform 0.18s var(--ease-spring),
			background-color 0.15s;
	}
	.pref[aria-checked='true'] .switch {
		background: var(--color-primary);
	}
	.pref[aria-checked='true'] .switch::after {
		transform: translateX(16px);
		background: var(--color-on-primary);
	}
	.account {
		padding: 16px 0 4px;
		font-size: 13px;
		color: var(--color-text-secondary);
	}
	.account strong {
		color: var(--color-text-primary);
		font-weight: 600;
	}
	.pref.danger {
		justify-content: flex-start;
		color: var(--color-error);
		border-bottom: 0;
	}
</style>
