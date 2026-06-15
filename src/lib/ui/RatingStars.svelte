<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { Star } from 'lucide-svelte';

	let {
		malId,
		score,
		size = 20,
		showValue = true,
		interactive = true
	}: {
		malId: number;
		score: number; // 0-10 MAL scale, 0 = unrated
		size?: number;
		showValue?: boolean;
		interactive?: boolean;
	} = $props();

	const numScore = $derived(Number(score));
	let hoveredScore = $state<number | null>(null);
	const displayScore = $derived(hoveredScore ?? numScore);

	/** How much of star `i` (0-indexed) should be filled: 0, 0.5, or 1 */
	function starFill(i: number): number {
		const s = displayScore;
		if (s >= (i + 1) * 2) return 1;
		if (s === i * 2 + 1) return 0.5;
		return 0;
	}

	function handleClick(starIndex: number) {
		if (!interactive) return;
		const evenScore = (starIndex + 1) * 2;
		const oddScore = evenScore - 1;
		let finalScore = evenScore;

		if (numScore === evenScore) {
			finalScore = oddScore;
		} else if (numScore === oddScore) {
			finalScore = 0;
		}

		userListStore.setScore(malId, finalScore);
	}

	function handleMouseMove(starIndex: number) {
		if (!interactive) return;
		hoveredScore = (starIndex + 1) * 2;
	}

	function handleMouseLeave() {
		hoveredScore = null;
	}
	function handleKeyDown(e: KeyboardEvent) {
		if (!interactive) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			const next = Math.min(numScore + 1, 10);
			userListStore.setScore(malId, next);
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			const prev = Math.max(numScore - 1, 0);
			userListStore.setScore(malId, prev);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="inline-flex items-center gap-1.5 outline-none focus-visible:outline-none rounded-sm transition-shadow"
	role="slider"
	tabindex="0"
	aria-label="Rating"
	aria-valuenow={numScore}
	aria-valuemin={0}
	aria-valuemax={10}
	onmouseleave={handleMouseLeave}
	onclick={(e) => e.stopPropagation()}
	onkeydown={handleKeyDown}
>
	{#each Array(5) as _, i}
		{@const fill = starFill(i)}
		<div
			role="button"
			tabindex="0"
			class="relative transition-transform duration-200 {interactive
				? 'cursor-pointer hover:scale-110 active:scale-95'
				: ''}"
			style="width: {size}px; height: {size}px;"
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				handleClick(i);
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick(i);
				}
			}}
			onmousemove={() => handleMouseMove(i)}
		>
			<!-- Empty star (clearly visible but muted) -->
			<Star {size} class="absolute inset-0 text-white/20" fill="none" stroke-width={1.5} />
			<!-- Filled portion -->
			<div
				class="absolute inset-0 overflow-hidden pointer-events-none"
				style="width: {fill * 100}%;"
			>
				<Star
					{size}
					class="text-warning filter drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]"
					fill="currentColor"
					stroke="currentColor"
					stroke-width={0}
				/>
			</div>
		</div>
	{/each}

	{#if showValue}
		<span class="ml-1.5 text-xs font-semibold tabular-nums text-text-secondary">
			{numScore > 0 ? numScore : '—'}
		</span>
	{/if}
</div>
