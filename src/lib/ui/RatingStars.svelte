<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { Star } from 'lucide-svelte';

	let {
		malId,
		score,
		size = 14,
		showValue = true,
		interactive = true
	}: {
		malId: number;
		score: number; // 0-10 MAL scale, 0 = unrated
		size?: number;
		showValue?: boolean;
		interactive?: boolean;
	} = $props();

	let hoveredScore = $state<number | null>(null);
	const displayScore = $derived(hoveredScore ?? score);

	/** How much of star `i` (0-indexed) should be filled: 0, 0.5, or 1 */
	function starFill(i: number): number {
		const s = displayScore;
		if (s === 0) return 0;
		const starLow = i * 2 + 1; // odd boundary
		const starHigh = i * 2 + 2; // even boundary
		if (s >= starHigh) return 1;
		if (s >= starLow) return 0.5;
		return 0;
	}

	function handleClick(starIndex: number, isRightHalf: boolean) {
		if (!interactive) return;
		const newScore = isRightHalf ? (starIndex + 1) * 2 : starIndex * 2 + 1;
		// Toggle: if clicking the same score, set to 0 (unrate)
		const finalScore = newScore === score ? 0 : newScore;
		userListStore.setScore(malId, finalScore);
	}

	function handleMouseMove(starIndex: number, event: MouseEvent, starEl: HTMLElement) {
		if (!interactive) return;
		const rect = starEl.getBoundingClientRect();
		const isRightHalf = event.clientX - rect.left > rect.width / 2;
		hoveredScore = isRightHalf ? (starIndex + 1) * 2 : starIndex * 2 + 1;
	}

	function handleMouseLeave() {
		hoveredScore = null;
	}
	function handleKeyDown(e: KeyboardEvent) {
		if (!interactive) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			const next = Math.min(score + 1, 10);
			userListStore.setScore(malId, next);
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			const prev = Math.max(score - 1, 0);
			userListStore.setScore(malId, prev);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="inline-flex items-center gap-0.5 outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm transition-shadow"
	role="slider"
	tabindex="0"
	aria-label="Rating"
	aria-valuenow={score}
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
			class="relative {interactive ? 'cursor-pointer' : ''}"
			style="width: {size + 2}px; height: {size}px;"
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
				const isRight = e.clientX - rect.left > rect.width / 2;
				handleClick(i, isRight);
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick(i, true);
				}
			}}
			onmousemove={(e) => handleMouseMove(i, e, e.currentTarget as HTMLElement)}
		>
			<!-- Empty star -->
			<Star {size} class="absolute inset-0 text-surface-3" fill="none" stroke-width={1.5} />
			<!-- Filled portion -->
			<div class="absolute inset-0 overflow-hidden" style="width: {fill * 100}%;">
				<Star
					{size}
					class="text-warning"
					fill="currentColor"
					stroke="currentColor"
					stroke-width={0}
				/>
			</div>
		</div>
	{/each}

	{#if showValue}
		<span class="ml-1 text-xs tabular-nums text-text-muted">
			{score > 0 ? score : '—'}
		</span>
	{/if}
</div>
