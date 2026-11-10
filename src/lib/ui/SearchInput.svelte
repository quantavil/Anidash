<script lang="ts">
	import { tick } from 'svelte';
	import { Search, X, LoaderCircle } from 'lucide-svelte';

	let {
		value = $bindable(''),
		placeholder = 'Search...',
		id,
		loading = false,
		isDebouncing = false,
		oninput,
		onclear,
		onkeydown
	}: {
		value: string;
		placeholder?: string;
		id?: string;
		loading?: boolean;
		isDebouncing?: boolean;
		oninput?: (e: Event) => void;
		onclear?: () => void;
		onkeydown?: (e: KeyboardEvent) => void;
	} = $props();

	// Collapsed to a single icon button until used; stays open while a query is active.
	let opened = $state(false);
	let input = $state<HTMLInputElement>();
	const expanded = $derived(opened || value !== '');

	/** Open the field and focus it (used by the `/` shortcut). */
	export async function focus() {
		opened = true;
		await tick();
		input?.focus();
	}

	function handleInput(e: Event) {
		value = (e.target as HTMLInputElement).value;
		oninput?.(e);
	}

	function handleClear() {
		value = '';
		opened = false;
		onclear?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		onkeydown?.(e);
		if (e.key === 'Escape') {
			e.stopPropagation();
			handleClear();
		}
	}

	function handleBlur() {
		if (value === '') opened = false;
	}
</script>

{#if expanded}
	<div class="group relative min-w-[13rem] flex-1">
		{#if loading || isDebouncing}
			<LoaderCircle
				size={15}
				class="absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary"
			/>
		{:else}
			<Search
				size={15}
				class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary"
			/>
		{/if}

		<input
			bind:this={input}
			type="text"
			{placeholder}
			{id}
			{value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			class="min-h-11 w-full rounded-full border border-white/5 bg-white/5 py-2.5 pl-10 pr-12 text-sm text-text-primary outline-none transition-all duration-500 ease-spring placeholder:text-text-muted focus:bg-white/10 focus:outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
		/>

		<button
			type="button"
			onclick={handleClear}
			aria-label={value ? 'Clear search' : 'Close search'}
			class="absolute right-0.5 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-text-muted transition-colors hover:text-text-secondary"
		>
			<X size={15} />
		</button>
	</div>
{:else}
	<button
		type="button"
		onclick={focus}
		aria-label="Search"
		title={placeholder}
		class="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/5 bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary active:scale-95"
	>
		<Search size={15} />
	</button>
{/if}
