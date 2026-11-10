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
	const expanded = $derived(opened);

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

	function close() {
		opened = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		onkeydown?.(e);
		if (e.key === 'Escape') {
			e.stopPropagation();
			handleClear();
		} else if (e.key === 'Enter') {
			// Dismiss the on-screen keyboard; the query stays active (shown on the icon).
			input?.blur();
		}
	}

	function handleBlur() {
		close();
	}
</script>

{#if expanded}
	<!-- Covers the whole toolbar row on phones; sits inline beside the other controls from sm up. -->
	<div class="group absolute inset-0 z-10 bg-surface-0 sm:static sm:min-w-[14rem] sm:flex-1">
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
			class="h-10 w-full rounded-full sm:h-11 border border-white/5 bg-white/5 py-2.5 pl-10 pr-12 text-sm text-text-primary outline-none transition-all duration-500 ease-spring placeholder:text-text-muted focus:bg-white/10 focus:outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
		/>

		<button
			type="button"
			onmousedown={(e) => e.preventDefault()}
			onclick={handleClear}
			aria-label={value ? 'Clear search' : 'Close search'}
			class="absolute right-0.5 top-1/2 flex h-10 w-10 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center text-text-muted transition-colors hover:text-text-secondary"
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
		class="flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border text-sm transition-colors active:scale-95 sm:h-11 sm:min-w-11 {value
			? 'border-primary/40 bg-primary/10 px-3 text-primary'
			: 'border-white/5 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'}"
	>
		<Search size={15} />
		{#if value}<span class="hidden max-w-32 truncate sm:inline">{value}</span><span
				class="size-1.5 rounded-full bg-primary sm:hidden"
			></span>{/if}
	</button>
{/if}
