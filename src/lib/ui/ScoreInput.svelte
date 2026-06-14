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

	const size = 32; // Comfortable size for touch targets

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

<div class="flex flex-col gap-2.5 w-full">
	<!-- Label and Descriptor -->
	<div class="flex items-center justify-between w-full">
		<div class="flex flex-col">
			<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">
				Your Rating
			</span>
			<div class="flex items-center gap-2 mt-0.5 min-h-[1.5rem]">
				{#if displayScore > 0}
					<span class="text-lg font-bold text-warning tabular-nums">
						{displayScore}
					</span>
					<span class="text-xs text-text-muted font-medium">/ 10</span>
					<span class="text-xs text-text-secondary font-semibold ml-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
						{SCORE_DESCRIPTIONS[displayScore]}
					</span>
				{:else}
					<span class="text-sm text-text-muted font-medium">
						Not Rated
					</span>
				{/if}
			</div>
		</div>

		{#if score > 0}
			<button
				onclick={() => userListStore.setScore(malId, 0)}
				class="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-error hover:bg-error/10 border border-transparent hover:border-error/20 transition-all active:scale-95"
				title="Clear rating"
			>
				<RotateCcw size={12} />
				<span>Clear</span>
			</button>
		{/if}
	</div>

	<!-- 5-Star Interactive Rating Bar -->
	<div
		bind:this={containerEl}
		class="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/40 border border-white/5 shadow-inner focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all select-none touch-none max-w-[260px]"
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
			<div
				class="relative flex-1 aspect-square max-w-[44px] flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
			>
				<!-- Empty star icon -->
				<Star
					{size}
					class="text-white/10 fill-transparent pointer-events-none"
					stroke-width={1.5}
				/>

				<!-- Filled star portion -->
				{#if fill > 0}
					<div
						class="absolute inset-0 flex items-center overflow-hidden pointer-events-none"
						style="width: {fill * 100}%;"
					>
						<div style="width: {size}px; height: {size}px;" class="flex items-center justify-center shrink-0">
							<Star
								{size}
								class="text-warning fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
								stroke-width={0}
							/>
						</div>
					</div>
				{/if}

				<!-- Mouse Hover/Tap Zones (Invisible overlays) -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="absolute left-0 top-0 w-1/2 h-full cursor-pointer z-10"
					onmouseenter={() => (hoveredScore = i * 2 + 1)}
					onclick={() => handleSelect(i * 2 + 1)}
				></div>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="absolute right-0 top-0 w-1/2 h-full cursor-pointer z-10"
					onmouseenter={() => (hoveredScore = i * 2 + 2)}
					onclick={() => handleSelect(i * 2 + 2)}
				></div>
			</div>
		{/each}
	</div>
</div>
