<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { Plus, Minus, Check } from 'lucide-svelte';

	let {
		malId,
		watched,
		total,
		compact = false
	}: {
		malId: number;
		watched: number;
		total: number;
		compact?: boolean;
	} = $props();

	const unknown = $derived(total === 0);
	const isComplete = $derived(!unknown && watched >= total && total > 0);

	let pulse = $state(false);
	let isFirstRun = true;

	$effect(() => {
		// Access watched to register it as a dependency
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		watched;
		if (isFirstRun) {
			isFirstRun = false;
			return;
		}
		pulse = true;
		const timer = setTimeout(() => (pulse = false), 400);
		return () => clearTimeout(timer);
	});

	function increment() {
		const result = userListStore.incrementEpisode(malId);
		if (result && result.watched >= result.total && result.total > 0) {
			userListStore.triggerCompletePrompt(malId);
		}
	}

	function decrement() {
		if (watched > 0) {
			userListStore.setEpisodeCount(malId, watched - 1);
		}
	}
</script>

<div
	class="pill-base {isComplete ? 'complete' : ''} {compact ? 'compact' : ''}"
	onclick={(e) => e.stopPropagation()}
	role="presentation"
>
	<!-- Decrement Button -->
	<button
		onclick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			decrement();
		}}
		disabled={watched <= 0}
		class="pill-btn pill-btn-minus"
		title="Decrease episode"
		aria-label="Decrease episode count"
	>
		<div class="minus-wrapper">
			<Minus size={compact ? 12 : 14} strokeWidth={2.5} />
		</div>
	</button>

	<!-- Episode count -->
	<div class="pill-count" class:pulse class:complete={isComplete}>
		<span class="watched-num">{watched}</span>/<span>{unknown ? '?' : total}</span>
		{#if !compact}
			<span class="ep-lbl">ep</span>
		{/if}
	</div>

	<!-- Increment Button -->
	<button
		onclick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			increment();
		}}
		disabled={isComplete}
		class="pill-btn pill-btn-plus {isComplete ? 'complete' : ''}"
		title="Increase episode"
		aria-label="Increase episode count"
	>
		{#if isComplete}
			<div class="animate-complete-pop">
				<Check size={compact ? 12 : 14} strokeWidth={2.5} />
			</div>
		{:else}
			<div class="plus-wrapper">
				<Plus size={compact ? 12 : 14} strokeWidth={2.5} />
			</div>
		{/if}
	</button>
</div>

<style>
	.pill-base {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		max-width: 220px; /* Cap width for detail pane / list rows */
		height: 38px;
		border-radius: 22px;
		padding: 4px 12px;
		position: relative;
		overflow: hidden;
		backdrop-filter: blur(12px);
		transition:
			border-color 0.3s,
			box-shadow 0.3s;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
	}

	.pill-base.compact {
		width: 100%;
		max-width: 100%; /* Fill the card controls space completely */
		height: 30px;
		border-radius: 16px;
		padding: 2px 6px;
	}

	.pill-base::before {
		content: '';
		position: absolute;
		inset: -30px;
		background: radial-gradient(
			circle at center,
			rgba(139, 126, 248, 0.18) 0%,
			rgba(0, 240, 255, 0.06) 50%,
			transparent 70%
		);
		opacity: 0.3;
		transition: opacity 0.5s ease;
		pointer-events: none;
		z-index: 0;
	}

	.pill-base:hover::before {
		opacity: 1;
		animation: radialShimmer 5s ease infinite alternate;
	}

	@keyframes radialShimmer {
		0% {
			transform: translate(-15px, -2px) scale(1);
		}
		50% {
			transform: translate(0px, 2px) scale(1.05);
		}
		100% {
			transform: translate(15px, -2px) scale(1.1);
		}
	}

	.pill-base:hover {
		border-color: rgba(139, 126, 248, 0.2);
	}

	.pill-base.complete {
		border-color: rgba(52, 211, 153, 0.25);
	}

	.pill-base.complete::before {
		background: radial-gradient(circle, rgba(52, 211, 153, 0.18) 0%, transparent 70%);
	}

	.pill-btn {
		display: flex;
		height: 28px;
		width: 28px;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
		color: #a3a3a3; /* text-secondary */
		transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
		outline: none;
		z-index: 1;
	}

	.pill-base.compact .pill-btn {
		height: 24px;
		width: 24px;
	}

	.pill-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
		color: #f8f8f8; /* text-primary */
	}

	.pill-btn:disabled {
		opacity: 0.15;
		cursor: not-allowed;
	}

	.pill-btn:active:not(:disabled) {
		transform: scale(0.85);
	}

	.pill-count {
		font-size: 12px;
		font-weight: 500;
		color: #a3a3a3; /* text-secondary */
		z-index: 1;
		user-select: none;
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.pill-base.compact .pill-count {
		font-size: 11px;
	}

	.pill-count.pulse {
		transform: scale(1.12);
		color: #ada3ff; /* primary-hover */
	}

	.pill-count.complete {
		color: #34d399; /* success */
		text-shadow: 0 0 8px rgba(52, 211, 153, 0.3);
	}

	.pill-count .watched-num {
		color: #f8f8f8; /* text-primary */
		font-weight: 700;
		font-size: 14px;
	}

	.pill-base.compact .pill-count .watched-num {
		font-size: 13px;
	}

	.ep-lbl {
		font-size: 8px;
		color: #666666; /* text-muted */
		text-transform: uppercase;
		margin-left: 2px;
	}

	.plus-wrapper,
	.minus-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.plus-wrapper {
		transition-duration: 0.5s;
	}

	.pill-btn-plus:hover:not(:disabled) .plus-wrapper {
		transform: rotate(90deg);
	}

	.pill-btn-minus:hover:not(:disabled) .minus-wrapper {
		transform: scaleX(1.25);
	}

	@keyframes complete-pop {
		0% {
			transform: scale(0.6);
			opacity: 0;
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
	.animate-complete-pop {
		animation: complete-pop 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards;
	}
</style>
