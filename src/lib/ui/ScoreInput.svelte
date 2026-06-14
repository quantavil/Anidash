<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { Star, RotateCcw } from 'lucide-svelte';

	let {
		malId,
		score
	}: {
		malId: number;
		score: number; // 0-10 MAL scale, 0 = unrated
	} = $props();

	let hoveredScore = $state<number | null>(null);
	const displayScore = $derived(hoveredScore ?? score);

	const SCORE_DESCRIPTIONS: Record<number, string> = {
		1: 'Appalling',
		2: 'Horrible',
		3: 'Very Bad',
		4: 'Bad',
		5: 'Average',
		6: 'Fine',
		7: 'Good',
		8: 'Very Good',
		9: 'Great',
		10: 'Masterpiece'
	};

	let containerEl = $state<HTMLDivElement | null>(null);
	let isDragging = $state(false);

	const size = 28; // Standard elegant size

	function starFill(i: number): number {
		const s = displayScore;
		if (s >= (i * 2) + 2) return 1;
		if (s === (i * 2) + 1) return 0.5;
		return 0;
	}

	function handleSelect(val: number) {
		const newScore = score === val ? 0 : val;
		userListStore.setScore(malId, newScore);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			const next = Math.min(score + 1, 10);
			userListStore.setScore(malId, next);
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			const prev = Math.max(score - 1, 0);
			userListStore.setScore(malId, prev);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			userListStore.setScore(malId, 0);
		}
	}

	// Touch drag support for mobile
	function handleTouchStart(e: TouchEvent) {
		isDragging = true;
		handleTouchUpdate(e);
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		if (e.cancelable) e.preventDefault();
		handleTouchUpdate(e);
	}

	function handleTouchEnd() {
		if (isDragging) {
			if (hoveredScore !== null) {
				userListStore.setScore(malId, hoveredScore);
			}
			hoveredScore = null;
			isDragging = false;
		}
	}

	function handleTouchUpdate(e: TouchEvent) {
		if (!containerEl) return;
		const rect = containerEl.getBoundingClientRect();
		const touch = e.touches[0];
		const relativeX = touch.clientX - rect.left;
		const pct = Math.max(0, Math.min(1, relativeX / rect.width));
		const scoreVal = Math.round(pct * 10);
		hoveredScore = scoreVal;
	}
</script>

<!-- SVG Gradient definition for half-stars -->
<svg width="0" height="0" class="absolute pointer-events-none">
	<defs>
		<linearGradient id="halfGrad-{malId}" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="50%" stop-color="var(--color-warning)" />
			<stop offset="50%" stop-color="transparent" stop-opacity="0" />
		</linearGradient>
	</defs>
</svg>

<div class="flex flex-col gap-2 w-full">
	<!-- Label, Score, and Clear Button in one row -->
	<div class="flex items-center justify-between w-full">
		<div class="flex items-center gap-2">
			<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">
				Your Rating
			</span>
			{#if displayScore > 0}
				<div class="flex items-center gap-1.5">
					<span class="text-sm font-bold text-warning tabular-nums">
						{displayScore}
					</span>
					<span class="text-[10px] text-text-muted">/10</span>
					<span class="text-[10px] text-text-secondary font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
						{SCORE_DESCRIPTIONS[displayScore]}
					</span>
				</div>
			{:else}
				<span class="text-[10px] text-text-muted font-semibold bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
					Not Rated
				</span>
			{/if}
		</div>

		{#if score > 0}
			<button
				onclick={() => userListStore.setScore(malId, 0)}
				class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold text-text-muted hover:text-error hover:bg-error/10 transition-all active:scale-95"
				title="Clear rating"
			>
				<RotateCcw size={10} />
				<span>Clear</span>
			</button>
		{/if}
	</div>

	<!-- 5-Star Interactive Rating Bar -->
	<div
		bind:this={containerEl}
		class="flex items-center justify-start gap-3 py-1 select-none touch-none w-full max-w-[220px]"
		role="slider"
		tabindex="0"
		aria-label="Anime rating out of 10 represented by 5 stars"
		aria-valuenow={score}
		aria-valuemin={0}
		aria-valuemax={10}
		onmouseleave={() => (hoveredScore = null)}
		onkeydown={handleKeyDown}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		{#each Array(5) as _, i}
			{@const fill = starFill(i)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="relative aspect-square w-8 h-8 flex items-center justify-center transition-all duration-200 hover:scale-120 active:scale-90"
			>
				{#if fill === 1}
					<Star
						{size}
						class="text-warning fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
						stroke-width={0}
					/>
				{:else}
					<Star
						{size}
						class={fill === 0.5 ? 'text-warning' : 'text-white/10'}
						fill={fill === 0.5 ? `url(#halfGrad-${malId})` : 'none'}
						stroke={fill === 0.5 ? 'var(--color-warning)' : 'currentColor'}
						stroke-width={1.5}
					/>
				{/if}

				<!-- Mouse Hover/Tap Zones (Invisible overlays) -->
				<div
					class="absolute left-0 top-0 w-1/2 h-full cursor-pointer z-10"
					onmouseenter={() => (hoveredScore = i * 2 + 1)}
					onclick={() => handleSelect(i * 2 + 1)}
				></div>
				<div
					class="absolute right-0 top-0 w-1/2 h-full cursor-pointer z-10"
					onmouseenter={() => (hoveredScore = i * 2 + 2)}
					onclick={() => handleSelect(i * 2 + 2)}
				></div>
			</div>
		{/each}
	</div>
</div>
