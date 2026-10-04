<script lang="ts">
	import { Search, X, LoaderCircle } from 'lucide-svelte';

	let {
		value = $bindable(''),
		placeholder = 'Search...',
		label = 'Search anime',
		id,
		loading = false,
		isDebouncing = false,
		oninput,
		onclear,
		onkeydown
	}: {
		value: string;
		placeholder?: string;
		label?: string;
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

<div class="search-field relative w-full group">
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
		aria-label={label}
		{placeholder}
		{id}
		{value}
		oninput={handleInput}
		{onkeydown}
		class="search-box w-full rounded-lg border border-border bg-surface-1 py-3 pl-10 pr-12 text-sm text-text-primary placeholder:text-text-secondary transition-colors focus:border-primary"
	/>

	{#if value}
		<button
			onclick={handleClear}
			aria-label="Clear search"
			class="absolute right-1 top-1/2 flex h-11 w-11 items-center justify-center -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
		>
			<X size={15} />
		</button>
	{/if}
</div>
