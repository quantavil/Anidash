<script lang="ts" generics="T extends string">
	import type { List } from 'lucide-svelte';

	let {
		options,
		value,
		onselect,
		labelledby
	}: {
		options: { value: T; label: string; icon?: typeof List }[];
		value: T;
		onselect: (value: T) => void;
		labelledby: string;
	} = $props();
</script>

<div
	class="inline-flex shrink-0 overflow-hidden rounded-md border border-white/5 bg-white/5"
	role="group"
	aria-labelledby={labelledby}
>
	{#each options as o (o.value)}
		{@const on = o.value === value}
		<button
			type="button"
			aria-pressed={on}
			onclick={() => onselect(o.value)}
			class="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 px-3.5 text-sm font-medium transition-colors {on
				? 'bg-primary/20 text-primary'
				: 'text-text-secondary hover:bg-white/10 hover:text-text-primary'}"
		>
			{#if o.icon}<o.icon size={14} />{/if}{o.label}
		</button>
	{/each}
</div>
