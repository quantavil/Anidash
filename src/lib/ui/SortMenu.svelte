<script lang="ts">
	import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-svelte';
	import type { SortDir } from '#lib/utils/sort.js';

	let {
		options,
		value,
		dir,
		label = 'Sort',
		dirDisabled = false,
		onselect,
		ondir
	}: {
		options: { value: string; label: string }[];
		value: string;
		dir: SortDir;
		label?: string;
		dirDisabled?: boolean;
		onselect: (value: string) => void;
		ondir: () => void;
	} = $props();

	let open = $state(false);
	let focused = $state(-1);

	const current = $derived(options.find((o) => o.value === value)?.label ?? options[0]?.label);

	function close() {
		open = false;
		focused = -1;
	}

	function pick(v: string) {
		onselect(v);
		close();
	}

	function onkeydown(e: KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				open = true;
				focused = Math.max(
					0,
					options.findIndex((o) => o.value === value)
				);
			}
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			focused = (focused + 1) % options.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focused = (focused - 1 + options.length) % options.length;
		} else if ((e.key === 'Enter' || e.key === ' ') && focused >= 0) {
			e.preventDefault();
			pick(options[focused].value);
		}
	}

	const btn =
		'flex h-9 items-center justify-center rounded-md border border-white/5 bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary active:scale-95 sm:h-10';
</script>

<div class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		{onkeydown}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="{label}: {current}"
		title="{label}: {current}"
		class="{btn} w-9 gap-1.5 text-sm sm:w-auto sm:px-4"
	>
		<ArrowUpDown size={14} />
		<span class="hidden sm:inline">{current}</span>
	</button>

	{#if open}
		<div class="fixed inset-0 z-40" onclick={close} role="presentation"></div>
		<div class="glass-dropdown absolute right-0 top-full z-50 mt-2 border-border!" role="menu">
			{#each options as option, idx (option.value)}
				<button
					type="button"
					onclick={() => pick(option.value)}
					role="menuitemradio"
					aria-checked={value === option.value}
					tabindex="-1"
					class="glass-dropdown-item w-full whitespace-nowrap {value === option.value
						? '!bg-primary/10 !text-primary'
						: idx === focused
							? '!bg-white/10 !text-text-primary'
							: 'text-text-secondary'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
<button
	type="button"
	onclick={ondir}
	disabled={dirDisabled}
	aria-label="Sort direction: {dir === 'asc' ? 'ascending' : 'descending'}"
	title={dir === 'asc' ? 'Ascending' : 'Descending'}
	class="{btn} w-9 cursor-pointer disabled:cursor-default disabled:opacity-40 sm:w-10"
>
	{#if dir === 'asc'}<ArrowUp size={14} />{:else}<ArrowDown size={14} />{/if}
</button>
