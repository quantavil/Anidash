<script lang="ts">
	import { authStore } from '#lib/auth/auth.svelte.js';
	import { dubStore } from '#lib/stores/dub.svelte.js';
	import { settingsStore, VIEW_SECTIONS, type ViewMode } from '#lib/stores/settings.svelte.js';
	import { LayoutGrid, List, LogOut, User } from 'lucide-svelte';

	const VIEW_MODES: { value: ViewMode; label: string; icon: typeof List }[] = [
		{ value: 'grid', label: 'Grid', icon: LayoutGrid },
		{ value: 'list', label: 'List', icon: List }
	];

	const segCls = (on: boolean) =>
		`flex min-h-9 cursor-pointer items-center justify-center gap-1.5 px-3.5 text-sm font-medium transition-colors ${
			on
				? 'bg-primary/20 text-primary'
				: 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
		}`;
</script>

<svelte:head>
	<title>Settings | AniDash</title>
</svelte:head>

<div class="mx-auto max-w-2xl py-6">
	<h1 class="text-2xl font-bold text-text-primary">Settings</h1>
	<p class="mt-1 text-sm text-text-secondary">Saved on this device.</p>

	<!-- Account -->
	<section class="mt-6" aria-labelledby="account-h">
		<h2 id="account-h" class="mb-2 text-xs font-semibold tracking-wider text-text-muted uppercase">
			Account
		</h2>
		<div
			class="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 p-3"
		>
			{#if authStore.isAuthenticated}
				<a href="/stats" class="flex min-w-0 items-center gap-3" aria-label="Open profile stats">
					{#if authStore.user?.picture}
						<img
							src={authStore.user.picture}
							alt=""
							class="h-10 w-10 shrink-0 rounded-lg object-cover"
						/>
					{:else}
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2"
						>
							<User size={18} class="text-text-muted" />
						</div>
					{/if}
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-text-primary">{authStore.user?.name}</p>
						<p class="text-xs text-text-muted">MyAnimeList · view profile stats</p>
					</div>
				</a>
				<button
					type="button"
					onclick={() => authStore.logout()}
					class="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-text-secondary transition-colors hover:border-error/40 hover:text-error"
				>
					<LogOut size={14} /> Log out
				</button>
			{:else}
				<p class="text-sm text-text-secondary">Not signed in</p>
				<button
					type="button"
					onclick={() => authStore.login()}
					class="min-h-9 shrink-0 cursor-pointer rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
				>
					Connect with MyAnimeList
				</button>
			{/if}
		</div>
	</section>

	<!-- Titles & dubs -->
	<section class="mt-6" aria-labelledby="content-h">
		<h2 id="content-h" class="mb-2 text-xs font-semibold tracking-wider text-text-muted uppercase">
			Content
		</h2>
		<div class="divide-y divide-border rounded-lg border border-border bg-surface-1">
			<div class="flex items-center justify-between gap-4 p-3">
				<div class="min-w-0">
					<p id="dub-l" class="text-sm font-medium text-text-primary">Dubbed only</p>
					<p class="text-xs text-text-muted">
						Show only anime with an English dub in My List, Browse and Seasonal.
					</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={dubStore.dubMode}
					aria-labelledby="dub-l"
					onclick={() => dubStore.toggleDubMode()}
					class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors {dubStore.dubMode
						? 'border-primary/60 bg-primary/40'
						: 'border-white/10 bg-white/10'}"
				>
					<span
						class="absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform {dubStore.dubMode
							? 'translate-x-5'
							: ''}"
					></span>
				</button>
			</div>

			<div class="flex items-center justify-between gap-4 p-3">
				<div class="min-w-0">
					<p id="lang-l" class="text-sm font-medium text-text-primary">Title language</p>
					<p class="text-xs text-text-muted">
						Which title is shown first on cards and detail pages.
					</p>
				</div>
				<div
					class="inline-flex shrink-0 overflow-hidden rounded-md border border-white/5 bg-white/5"
					role="group"
					aria-labelledby="lang-l"
				>
					<button
						type="button"
						aria-pressed={!settingsStore.preferEnglish}
						onclick={() => settingsStore.setPreferEnglish(false)}
						class={segCls(!settingsStore.preferEnglish)}>Romaji</button
					>
					<button
						type="button"
						aria-pressed={settingsStore.preferEnglish}
						onclick={() => settingsStore.setPreferEnglish(true)}
						class={segCls(settingsStore.preferEnglish)}>English</button
					>
				</div>
			</div>
		</div>
	</section>

	<!-- Layout per section -->
	<section class="mt-6" aria-labelledby="layout-h">
		<h2 id="layout-h" class="mb-2 text-xs font-semibold tracking-wider text-text-muted uppercase">
			Layout
		</h2>
		<div class="divide-y divide-border rounded-lg border border-border bg-surface-1">
			{#each VIEW_SECTIONS as sec (sec.id)}
				<div class="flex items-center justify-between gap-4 p-3">
					<p id="view-{sec.id}" class="text-sm font-medium text-text-primary">{sec.label}</p>
					<div
						class="inline-flex shrink-0 overflow-hidden rounded-md border border-white/5 bg-white/5"
						role="group"
						aria-labelledby="view-{sec.id}"
					>
						{#each VIEW_MODES as m (m.value)}
							{@const on = settingsStore.views[sec.id] === m.value}
							<button
								type="button"
								aria-pressed={on}
								onclick={() => settingsStore.setView(sec.id, m.value)}
								class={segCls(on)}
							>
								<m.icon size={14} />{m.label}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<p class="mt-2 text-xs text-text-muted">
			You can also switch any section from the toggle above its results.
		</p>
	</section>
</div>
