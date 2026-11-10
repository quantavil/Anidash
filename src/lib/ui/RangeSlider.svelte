<script lang="ts">
	// Two-handle range: two native range inputs stacked over one track, so keyboard and
	// touch behave natively. Live while dragging, committed on release.
	let {
		min,
		max,
		step = 1,
		lo,
		hi,
		format = String,
		label,
		oncommit
	}: {
		min: number;
		max: number;
		step?: number;
		lo: number;
		hi: number;
		format?: (n: number) => string;
		label: string;
		oncommit: (lo: number, hi: number) => void;
	} = $props();

	let dragLo = $state<number | null>(null);
	let dragHi = $state<number | null>(null);
	const a = $derived(Math.min(Math.max(dragLo ?? lo, min), max));
	const b = $derived(Math.min(Math.max(dragHi ?? hi, min), max));
	const pct = (n: number) => ((n - min) / (max - min)) * 100;

	function commit() {
		const l = dragLo ?? a;
		const h = dragHi ?? b;
		dragLo = dragHi = null;
		oncommit(l, h);
	}
</script>

<div class="range">
	<div class="mb-1 flex items-baseline justify-between text-xs text-text-primary">
		<span class="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
		<span class="tabular-nums">{format(a)} – {format(b)}</span>
	</div>
	<div class="relative h-6">
		<div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10"></div>
		<div
			class="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
			style="left:{pct(a)}%;right:{100 - pct(b)}%"
		></div>
		<input
			type="range"
			{min}
			{max}
			{step}
			value={a}
			aria-label="{label} minimum"
			oninput={(e) => (dragLo = Math.min(Number(e.currentTarget.value), b))}
			onchange={commit}
		/>
		<input
			type="range"
			{min}
			{max}
			{step}
			value={b}
			aria-label="{label} maximum"
			oninput={(e) => (dragHi = Math.max(Number(e.currentTarget.value), a))}
			onchange={commit}
		/>
	</div>
</div>

<style>
	.range input[type='range'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		background: none;
		pointer-events: none;
		appearance: none;
		-webkit-appearance: none;
	}
	.range input[type='range']::-webkit-slider-runnable-track {
		background: none;
	}
	.range input[type='range']::-moz-range-track {
		background: none;
	}
	.range input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		pointer-events: auto;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid #17122e;
		background: var(--color-primary, #8b7ef8);
		cursor: grab;
	}
	.range input[type='range']::-moz-range-thumb {
		pointer-events: auto;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid #17122e;
		background: var(--color-primary, #8b7ef8);
		cursor: grab;
	}
	.range input[type='range']:focus-visible::-webkit-slider-thumb {
		outline: 2px solid var(--color-primary, #8b7ef8);
		outline-offset: 2px;
	}
</style>
