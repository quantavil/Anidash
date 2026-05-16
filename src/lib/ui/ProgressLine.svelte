<script lang="ts">
	let {
		watched,
		total
	}: {
		watched: number;
		total: number;
	} = $props();

	const unknown = $derived(total === 0);
	const progressPct = $derived(unknown ? 0 : Math.min((watched / total) * 100, 100));
	const isComplete = $derived(!unknown && watched >= total && total > 0);
</script>

<div class="absolute bottom-0 left-0 h-0.5 w-full bg-white/10 z-20">
	<div
		class="h-full transition-all duration-700 ease-spring {isComplete
			? 'bg-success'
			: 'bg-gradient-to-r from-primary to-cyan-400'}"
		style="width: {progressPct}%"
	></div>
</div>
