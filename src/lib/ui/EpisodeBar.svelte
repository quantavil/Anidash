<script lang="ts">
	let {
		watched,
		total,
		label = 'Episodes watched',
		class: className = ''
	}: { watched: number; total: number; label?: string; class?: string } = $props();

	const known = $derived(total > 0);
	const percent = $derived(known ? Math.max(0, Math.min(100, (watched / total) * 100)) : 0);
	const complete = $derived(known && watched >= total);
	/** Short series read as discrete episodes; long ones as one continuous bar. */
	const segments = $derived(known && total <= 30 ? total : 0);
</script>

<div
	class="bar {className}"
	class:complete
	class:segmented={segments > 0}
	style:--n={segments || undefined}
	role="progressbar"
	aria-label={label}
	aria-valuenow={known ? Math.min(watched, total) : undefined}
	aria-valuemin={0}
	aria-valuemax={known ? total : undefined}
	aria-valuetext="{watched} of {known ? total : 'unknown'} episodes"
>
	<span style:width="{percent}%"></span>
</div>

<style>
	.bar {
		position: relative;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: var(--color-surface-3);
		overflow: hidden;
	}
	span {
		display: block;
		height: 100%;
		background: var(--color-primary);
		transition: width 0.25s var(--ease-fluid);
	}
	.complete span {
		background: var(--color-success);
	}
	/* One element, N gaps: cheaper than N spans per row on a 1,500-entry list. */
	.segmented {
		background: transparent;
		height: 5px;
		overflow: visible;
		-webkit-mask-image: repeating-linear-gradient(
			90deg,
			#000 0,
			#000 calc(100% / var(--n) - 2px),
			transparent calc(100% / var(--n) - 2px),
			transparent calc(100% / var(--n))
		);
		mask-image: repeating-linear-gradient(
			90deg,
			#000 0,
			#000 calc(100% / var(--n) - 2px),
			transparent calc(100% / var(--n) - 2px),
			transparent calc(100% / var(--n))
		);
	}
	.segmented::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--color-surface-3);
	}
	.segmented span {
		position: relative;
	}
</style>
