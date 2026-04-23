<script lang="ts">
	import { page } from '$app/stores';
	import { authStore } from '$lib/auth/auth.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import {
		List,
		Search,
		Calendar,
		LogOut,
		RefreshCw,
		User,
		Languages,
		Mic,
		Clock
	} from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import Logo from './Logo.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	async function handleSync() {
		await import('$lib/stores/userlist.svelte').then((m) => m.userListStore.syncFromRemote());
	}

	function handleLogout() {
		authStore.logout();
	}

	const NAV_ITEMS = [
		{ href: '/', label: 'My List', icon: List },
		{ href: '/browse', label: 'Browse', icon: Search },
		{ href: '/seasonal', label: 'Seasonal', icon: Calendar },
		{ href: '/stats', label: 'Stats', icon: User }
	];
</script>

{#snippet globalActions(isMobile: boolean)}
	<div class="flex items-center {isMobile ? 'gap-2' : 'gap-2 pr-1'}">
		<!-- Dub Mode Toggle -->
		<button
			onclick={() => dubStore.toggleDubMode()}
			class="flex items-center justify-center rounded-full bg-white/5 transition-all duration-700 ease-spring hover:bg-white/15 active:scale-90 {isMobile
				? 'h-8 w-8'
				: 'group h-9 w-9'} {dubStore.dubMode ? 'text-primary' : 'text-text-muted'}"
			title="Toggle Dub Mode"
		>
			<Mic size={isMobile ? 14 : 16} class={dubStore.dubMode ? 'animate-pulse' : ''} />
		</button>

		<!-- Title Preference Toggle -->
		<button
			onclick={() => settingsStore.togglePreferEnglish()}
			class="flex items-center justify-center rounded-full bg-white/5 transition-all duration-700 ease-spring hover:bg-white/15 active:scale-90 {isMobile
				? 'h-8 w-8'
				: 'group h-9 w-9'} {settingsStore.preferEnglish ? 'text-primary' : 'text-text-muted'}"
			title="Toggle English/Romaji titles"
		>
			<Languages size={isMobile ? 14 : 16} />
		</button>

		<!-- Sync Button -->
		<button
			onclick={handleSync}
			disabled={syncStore.isSyncing}
			class="flex items-center justify-center rounded-full bg-white/5 transition-all duration-700 ease-spring hover:bg-white/15 active:scale-90 disabled:opacity-50 text-text-secondary {isMobile
				? 'h-8 w-8'
				: 'group h-9 w-9'}"
			title="Sync"
		>
			<RefreshCw
				size={isMobile ? 14 : 16}
				class="transition-transform duration-700 ease-spring {isMobile
					? ''
					: 'group-hover:scale-110'} {syncStore.isSyncing ? 'animate-spin' : ''}"
			/>
		</button>

		<!-- Profile / Logout / Login -->
		{#if authStore.isAuthenticated}
			<div
				class="flex items-center {isMobile
					? 'gap-1.5 ml-1 pr-2'
					: 'gap-2 pl-1 pr-3'} rounded-full border border-white/5 bg-surface-2/50 py-1 pl-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
			>
				<a
					href="/stats"
					data-sveltekit-reload
					class="flex items-center transition-transform hover:scale-105 active:scale-95"
					title="View Profile Stats"
				>
					{#if authStore.user?.picture}
						<img
							src={authStore.user.picture}
							alt={authStore.user.name}
							class="{isMobile ? 'h-6 w-6' : 'h-7 w-7'} rounded-full object-cover"
						/>
					{:else}
						<div
							class="flex {isMobile
								? 'h-6 w-6'
								: 'h-7 w-7'} items-center justify-center rounded-full bg-surface-3"
						>
							<User size={isMobile ? 12 : 14} class="text-text-muted" />
						</div>
					{/if}
				</a>
				<button
					onclick={handleLogout}
					class="text-text-muted transition-colors hover:text-error {isMobile ? '' : 'ml-1'}"
					title="Logout"
				>
					<LogOut size={isMobile ? 14 : 16} />
				</button>
			</div>
		{:else}
			<button
				onclick={() => authStore.login()}
				class="ml-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover active:scale-95"
			>
				Login
			</button>
		{/if}
	</div>
{/snippet}

<!-- Desktop / Floating Pill Nav -->
<header
	class="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-max hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-surface-1/40 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-700 ease-spring"
>
	<!-- Brand -->
	<a
		href="/"
		class="flex items-center gap-2 px-3 pl-1 transition-transform duration-700 ease-spring hover:scale-105 active:scale-95 group"
	>
		<div
			class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors group-hover:bg-primary/20"
		>
			<Logo size={18} />
		</div>
		<span class="text-sm font-bold tracking-wide text-text-primary">AniDash</span>
	</a>

	<div class="mx-2 h-6 w-px bg-white/10"></div>

	<!-- Links -->
	<nav class="flex items-center gap-1">
		{#each NAV_ITEMS as item}
			{@const isActive =
				$page.url.pathname === item.href ||
				(item.href !== '/' && $page.url.pathname.startsWith(item.href + '/'))}
			<a
				href={item.href}
				class="group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-700 ease-spring active:scale-95
          {isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}"
			>
				{#if isActive}
					<div
						class="absolute inset-0 -z-10 rounded-full bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all"
						in:fade={{ duration: 200 }}
					></div>
				{/if}
				<item.icon
					size={16}
					class="transition-transform duration-700 ease-spring group-hover:scale-110 group-hover:-translate-y-[1px]"
				/>
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="mx-2 h-6 w-px bg-white/10"></div>

	<!-- Actions -->
	{@render globalActions(false)}
</header>

<!-- Mobile Top Header -->
<header
	class="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-white/5 bg-surface-1/80 px-4 py-3 backdrop-blur-xl md:hidden"
>
	<!-- Brand -->
	<a href="/" class="flex items-center gap-2 group">
		<div
			class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
		>
			<Logo size={16} />
		</div>
		<span class="text-sm font-bold tracking-wide text-text-primary">AniDash</span>
	</a>

	<!-- Actions -->
	{@render globalActions(true)}
</header>

<!-- Mobile Bottom Tab Bar -->
<nav
	class="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-white/10 bg-surface-1/80 backdrop-blur-xl md:hidden pb-SAFE"
>
	{#each NAV_ITEMS as item}
		{@const isActive =
			$page.url.pathname === item.href ||
			(item.href !== '/' && $page.url.pathname.startsWith(item.href + '/'))}
		<a
			href={item.href}
			class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors
        {isActive ? 'text-primary' : 'text-text-muted'}"
		>
			<item.icon size={20} />
			{item.label}
		</a>
	{/each}
</nav>
