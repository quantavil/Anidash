# Anime Details Mobile UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the mobile UI redesign for the Anime Details page to fix header overlap and improve visual density.

**Architecture:** Use CSS utility classes (Tailwind) to adjust layout containers, primarily targeting mobile breakpoints. Add `overflow-x-auto whitespace-nowrap` to create horizontal scrolling lists and hide scrollbars if needed. Increase header opacity to prevent scrolling text bleed-through.

**Tech Stack:** Svelte 5, Tailwind CSS

---

### Task 1: Fix Mobile Header Background Opacity

**Files:**
- Modify: `src/lib/ui/FluidNav.svelte`

- [ ] **Step 1: Update header classes**

Modify the mobile header to have a less transparent background so text scrolling behind it is legible. Change `bg-surface-1/80` to `bg-surface-1/95`.

```svelte
<!-- Mobile Top Header -->
<header
	class="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-white/5 bg-surface-1/95 px-4 py-3 backdrop-blur-xl md:hidden"
>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ui/FluidNav.svelte
git commit -m "style(ui): increase mobile header background opacity"
```

### Task 2: Refactor Metadata Layout

**Files:**
- Modify: `src/routes/anime/[id]/+page.svelte`

- [ ] **Step 1: Combine metadata into a scrolling row**

Find the "Quick stats row" and the "Season + Studios" blocks. Combine them into a single `overflow-x-auto whitespace-nowrap scrollbar-none` flex container. Use `&bull;` (or a styled dot) as separators instead of stacked components.

```svelte
<!-- Quick stats row -->
<div class="mt-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 text-sm text-text-secondary scrollbar-none max-w-full">
	{#if anime.mean}
		<div class="flex items-center gap-1 shrink-0" title={anime.numScoringUsers ? anime.numScoringUsers.toLocaleString() + ' users scored this' : ''}>
			<Star size={16} class="text-warning" fill="currentColor" />
			<span class="font-semibold text-text-primary">{anime.mean.toFixed(1)}</span>
		</div>
		<span class="text-white/20 shrink-0">&bull;</span>
	{/if}
	{#if anime.mediaType}
		<div class="flex items-center gap-1 shrink-0">
			<Tv size={14} class="text-text-muted" />
			{formatMediaType(anime.mediaType)}
		</div>
		<span class="text-white/20 shrink-0">&bull;</span>
	{/if}
	{#if anime.numEpisodes > 0}
		<div class="flex items-center gap-1 shrink-0">
			<Film size={14} class="text-text-muted" />
			{anime.numEpisodes} eps
		</div>
		<span class="text-white/20 shrink-0">&bull;</span>
	{/if}
	{#if anime.animeStatus}
		<span class="{STATUS_COLORS[anime.animeStatus] ?? 'text-text-muted'} shrink-0">
			{formatAnimeStatus(anime.animeStatus)}
		</span>
		<span class="text-white/20 shrink-0">&bull;</span>
	{/if}
	{#if anime.startSeason}
		<div class="flex items-center gap-1 shrink-0 text-text-muted">
			<Calendar size={12} />
			{formatSeason(anime.startSeason.year, anime.startSeason.season)}
		</div>
	{/if}
</div>

<!-- Studios & Broadcast row (can stay below or be removed if too dense, but let's keep it tight) -->
<div class="mt-1 flex items-center gap-3 text-xs text-text-muted overflow-x-auto whitespace-nowrap scrollbar-none">
	{#if anime.studios.length > 0}
		<div class="flex items-center gap-1 shrink-0">
			<Users size={12} />
			{anime.studios.map((s) => s.name).join(', ')}
		</div>
	{/if}
	{#if anime.broadcast?.day_of_the_week}
		{#if anime.studios.length > 0}
			<span class="text-white/20 shrink-0">&bull;</span>
		{/if}
		<div class="flex items-center gap-1 shrink-0">
			<Clock size={12} />
			{anime.animeStatus === 'finished_airing' ? 'Aired' : 'Airs'}
			<span>{formatLocalBroadcast(anime.broadcast.day_of_the_week, anime.broadcast.start_time)}</span>
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/anime/[id]/+page.svelte
git commit -m "style(anime): compress metadata layout on mobile"
```

### Task 3: Refactor Tracking Card

**Files:**
- Modify: `src/routes/anime/[id]/+page.svelte`

- [ ] **Step 1: Update User List Controls layout**

Change the grid/flex layout of the "User List Controls" div to be more compact on mobile. Use `flex-row` and `justify-between` instead of a wrapping flex block, and simplify the typography.

```svelte
<!-- ─── User List Controls ─── -->
<div class="mt-5 rounded-xl border border-white/10 bg-surface-1/40 backdrop-blur-md p-4 shadow-xl">
	{#if inList && listEntry}
		<div class="flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
			<!-- Status -->
			<div class="shrink-0 flex flex-col items-center">
				<p class="mb-1 text-[9px] font-medium uppercase tracking-wider text-text-muted">Status</p>
				<StatusBadge {malId} status={listEntry.status} />
			</div>

			<!-- Progress -->
			<div class="shrink-0 flex flex-col items-center">
				<p class="mb-1 text-[9px] font-medium uppercase tracking-wider text-text-muted">Progress</p>
				<EpisodeCounter
					{malId}
					watched={listEntry.numWatchedEpisodes}
					total={listEntry.numEpisodes}
					onComplete={handleCompletePrompt}
				/>
			</div>

			<!-- Score -->
			<div class="shrink-0 flex flex-col items-center">
				<p class="mb-1 text-[9px] font-medium uppercase tracking-wider text-text-muted">Score</p>
				<RatingStars {malId} score={listEntry.score} size={14} />
			</div>
		</div>
	{:else}
		<button
			onclick={() => (showAddModal = true)}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
		>
			<Plus size={16} />
			Add to My List
		</button>
	{/if}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/anime/[id]/+page.svelte
git commit -m "style(anime): refactor tracking card for mobile"
```

### Task 4: Fix Action Buttons Wrapping

**Files:**
- Modify: `src/routes/anime/[id]/+page.svelte`

- [ ] **Step 1: Wrap external links in a scrolling container**

Modify the "External Links" container to use `overflow-x-auto flex-nowrap` so the `ExternalSitesRow` links scroll horizontally.

```svelte
<!-- External Links -->
<div class="mt-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none">
	<a
		href="https://myanimelist.net/anime/{malId}"
		target="_blank"
		rel="noopener noreferrer"
		class="ext-link shrink-0"
		style="--site-color: var(--color-primary)"
	>
		<ExternalLink size={12} />
		<span class="font-bold tracking-wide">MAL</span>
	</a>
	<div class="flex items-center gap-2 shrink-0">
		<ExternalSitesRow animeTitle={anime.title} />
	</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/anime/[id]/+page.svelte
git commit -m "style(anime): make external links scroll horizontally"
```
