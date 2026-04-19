<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	let {
		label,
		value,
		icon,
		color = 'text-text-primary'
	}: {
		label: string;
		value: string | number;
		icon?: typeof SvelteComponent<any>;
		color?: string;
	} = $props();
</script>

<div
	class="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-1 p-2.5 text-center transition-colors hover:bg-surface-2"
>
	{#if icon}
		{@const Icon = icon}
		<Icon size={20} class="{color} opacity-80" />
	{/if}
	<div class="min-w-0">
		<div class="text-lg font-bold leading-tight {color}">{value}</div>
		<div class="text-[10px] leading-tight text-text-muted line-clamp-1">{label}</div>
	</div>
</div>
