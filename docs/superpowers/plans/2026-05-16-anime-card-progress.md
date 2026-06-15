# AnimeCard Progress Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standard progress bar in `AnimeCard` with a 2px gradient line at the bottom of the thumbnail and move numerical progress to an overlay.

**Architecture:**

- Calculate progress percentage inside `AnimeCard`.
- Add an absolute-positioned `div` for the progress line.
- Add an absolute-positioned "glass" badge for the numerical progress.
- Clean up the bottom info section by removing `EpisodeCounter`.

**Tech Stack:** Svelte 5, Tailwind CSS

---

### Task 1: Refactor AnimeCard Component

**Files:**

- Modify: `src/lib/ui/AnimeCard.svelte`

- [ ] **Step 1: Calculate Progress Percentage**

Add `$derived` values to calculate the progress percentage and completion status.

```svelte
<script lang="ts">
	// ... imports

	// Existing code ...
	const imageUrl = $derived(entry.mainPicture?.large ?? entry.mainPicture?.medium ?? null);

	// NEW Progress Calculations
	const unknown = $derived(entry.numEpisodes === 0);
	const progressPct = $derived(
		unknown ? 0 : Math.min((entry.numWatchedEpisodes / entry.numEpisodes) * 100, 100)
	);
	const isComplete = $derived(
		!unknown && entry.numWatchedEpisodes >= entry.numEpisodes && entry.numEpisodes > 0
	);
</script>
```

- [ ] **Step 2: Add Progress Line and Numerical Overlay**

Modify the "Cover Image" section to include the new UI elements.

```svelte
<!-- Cover Image -->
<div class="relative aspect-[3/4] w-full overflow-hidden bg-surface-2 border-b border-white/5">
	<ImageWithFallback ... />

	<!-- Progress Line (New) -->
	<div class="absolute bottom-0 left-0 h-0.5 w-full bg-white/10 z-20">
		<div
			class="h-full transition-all duration-700 ease-spring {isComplete
				? 'bg-success'
				: 'bg-gradient-to-r from-primary to-cyan-400'}"
			style="width: {progressPct}%"
		></div>
	</div>

	<!-- Numerical Progress Overlay (New) -->
	<div
		class="glass-badge absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-bold z-10 {dubStore.hasDub(
			entry.malId
		)
			? 'ml-8'
			: ''}"
	>
		<span class="text-text-primary">{entry.numWatchedEpisodes}</span>
		<span class="mx-0.5 opacity-40">/</span>
		<span class="text-text-secondary">{unknown ? '?' : entry.numEpisodes}</span>
	</div>

	<!-- ... rest of overlays (Status, Score, Dub) -->
</div>
```

- [ ] **Step 3: Remove EpisodeCounter from Info Section**

Remove the `EpisodeCounter` block from the bottom of the card.

```svelte
<!-- Info -->
<div class="flex flex-1 flex-col gap-2 p-3">
	<!-- ... Title and Metadata ... -->

	<!-- REMOVE THIS BLOCK -->
	<!-- <div class="relative z-10 mt-auto pt-1">
        <EpisodeCounter ... />
    </div> -->
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/AnimeCard.svelte
git commit -m "feat(ui): redesign AnimeCard progress indicator with gradient line"
```
