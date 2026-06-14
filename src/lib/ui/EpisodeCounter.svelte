<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { Plus, Minus, Check } from 'lucide-svelte';

	let {
		malId,
		watched,
		total,
		onComplete
	}: {
		malId: number;
		watched: number;
		total: number;
		onComplete?: (malId: number) => void;
	} = $props();

	const unknown = $derived(total === 0);
	const isComplete = $derived(!unknown && watched >= total && total > 0);

	function increment() {
		const result = userListStore.incrementEpisode(malId);
		if (result && result.watched >= result.total && result.total > 0) {
			onComplete?.(malId);
		}
	}

	function decrement() {
		if (watched > 0) {
			userListStore.setEpisodeCount(malId, watched - 1);
		}
	}
</script>

<div class="flex items-center gap-3" onclick={(e) => e.stopPropagation()} role="presentation">
	<!-- Episode count -->
	<span class="text-xs font-semibold tabular-nums text-text-secondary whitespace-nowrap">
		<span class="text-text-primary font-bold text-sm">{watched}</span> / {unknown ? '?' : total}
		<span class="text-text-muted text-[10px] ml-0.5 uppercase tracking-wider">ep</span>
	</span>

	<!-- Controls -->
	<div class="flex items-center gap-1.5">
		<button
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				decrement();
			}}
			disabled={watched <= 0}
			class="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text-primary disabled:opacity-30 transition-all active:scale-90 border border-white/5"
			title="Decrease episode"
		>
			<Minus size={14} strokeWidth={2.5} />
		</button>
		<button
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				increment();
			}}
			disabled={isComplete}
			class="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 transition-all active:scale-90 border border-primary/10"
			title="Increase episode"
		>
			{#if isComplete}
				<Check size={14} strokeWidth={2.5} class="text-success" />
			{:else}
				<Plus size={14} strokeWidth={2.5} />
			{/if}
		</button>
	</div>
</div>
