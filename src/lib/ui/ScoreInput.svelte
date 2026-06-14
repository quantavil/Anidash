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
</script>

<div class="flex flex-col gap-3 w-full animate-fade-in">
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

	<!-- 10-Star Rating Bar -->
	<div
		class="flex items-center justify-between gap-1 p-2 rounded-xl bg-surface-2/40 border border-white/5 shadow-inner focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all select-none"
		role="slider"
		tabindex="0"
		aria-label="Anime rating out of 10"
		aria-valuenow={score}
		aria-valuemin={0}
		aria-valuemax={10}
		onmouseleave={() => (hoveredScore = null)}
		onkeydown={handleKeyDown}
	>
		{#each Array(10) as _, i}
			{@const starValue = i + 1}
			{@const isFilled = starValue <= displayScore}
			<button
				type="button"
				class="relative flex-1 flex items-center justify-center p-1 rounded-lg transition-all duration-200 outline-none
					{isFilled ? 'text-warning' : 'text-white/10 hover:text-white/30'}
					hover:scale-120 active:scale-90"
				onclick={() => handleSelect(starValue)}
				onmouseenter={() => (hoveredScore = starValue)}
				aria-label="Rate {starValue} out of 10"
			>
				<Star
					size={20}
					class="transition-all duration-300
						{isFilled ? 'fill-current drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]' : 'fill-transparent'}"
					stroke-width={isFilled ? 0 : 1.5}
				/>
				<!-- Subtle indicator dot for key rating levels (5 and 10) -->
				{#if !isFilled && (starValue === 5 || starValue === 10)}
					<div class="absolute bottom-1 w-1 h-1 rounded-full bg-white/20"></div>
				{/if}
			</button>
		{/each}
	</div>
</div>
