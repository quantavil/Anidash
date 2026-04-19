<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	let {
		label,
		value,
		icon,
		color = 'text-text-primary',
		href,
		onclick
	}: {
		label: string;
		value: string | number;
		icon?: typeof SvelteComponent<any>;
		color?: string;
		href?: string;
		onclick?: (e: MouseEvent) => void;
	} = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
	this={href ? 'a' : onclick ? 'button' : 'div'}
	{href}
	{onclick}
	class="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-1/40 p-2.5 text-center backdrop-blur-md transition-all duration-300 {href || onclick ? 'cursor-pointer hover:-translate-y-1 hover:border-primary/30 hover:bg-surface-2/60 active:scale-95' : ''}"
>
	{#if icon}
		{@const Icon = icon}
		<Icon size={20} class="{color} opacity-80 transition-transform duration-300 group-hover:scale-110" />
	{/if}
	<div class="min-w-0">
		<div class="text-lg font-bold leading-tight {color}">{value}</div>
		<div class="text-[10px] leading-tight text-text-muted line-clamp-1">{label}</div>
	</div>
</svelte:element>
