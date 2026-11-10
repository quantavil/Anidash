<script lang="ts">
	import type { List } from 'lucide-svelte';

	// Square icon button for the filter toolbars; an optional text label shows from `sm` up.
	let {
		icon: Icon,
		label,
		text,
		disabled = false,
		onclick,
		class: className = ''
	}: {
		icon: typeof List;
		label: string;
		text?: string;
		disabled?: boolean;
		onclick: () => void;
		class?: string;
	} = $props();
</script>

<button
	type="button"
	{onclick}
	{disabled}
	aria-label={label}
	title={label}
	class="flex h-9 w-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-white/5 bg-white/5 text-sm text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary active:scale-95 disabled:opacity-40 sm:h-10 {className} {text
		? 'sm:w-auto sm:px-4'
		: 'sm:w-10'}"
>
	<Icon size={15} />{#if text}<span class="hidden sm:inline">{text}</span>{/if}
</button>
