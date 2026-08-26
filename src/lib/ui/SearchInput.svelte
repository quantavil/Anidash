<script lang="ts">
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

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		if (oninput) oninput(e);
	}

	function handleClear() {
		value = '';
		if (onclear) onclear();
	}
</script>

<div class="relative w-full group">
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
		type="text"
		{placeholder}
		{id}
		{value}
		oninput={handleInput}
		{onkeydown}
		class="w-full rounded-full border border-white/5 bg-white/5 py-2.5 pl-10 pr-9 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-500 ease-spring focus:bg-white/10 focus:outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
	/>

	{#if value}
		<button
			onclick={handleClear}
			aria-label="Clear search"
			class="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
		>
			<X size={15} />
		</button>
	{/if}
</div>
