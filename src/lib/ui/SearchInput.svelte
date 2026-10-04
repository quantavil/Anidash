<script lang="ts">
	import { Search, X, LoaderCircle } from 'lucide-svelte';

	let {
		value = $bindable(''),
		placeholder = 'Search…',
		label = 'Search anime',
		id,
		loading = false,
		isDebouncing = false,
		hint,
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
		/** Keyboard hint shown while empty, e.g. the shortcut that focuses this field. */
		hint?: string;
		oninput?: (e: Event) => void;
		onclear?: () => void;
		onkeydown?: (e: KeyboardEvent) => void;
	} = $props();

	function handleInput(e: Event) {
		value = (e.target as HTMLInputElement).value;
		oninput?.(e);
	}

	function handleClear() {
		value = '';
		onclear?.();
	}
</script>

<div class="field search-field">
	{#if loading || isDebouncing}
		<LoaderCircle size={16} class="animate-spin text-primary shrink-0" />
	{:else}
		<Search size={16} class="shrink-0" />
	{/if}
	<input
		type="text"
		aria-label={label}
		{placeholder}
		{id}
		{value}
		oninput={handleInput}
		{onkeydown}
		autocomplete="off"
		spellcheck="false"
	/>
	{#if value}
		<button class="clear" onclick={handleClear} aria-label="Clear search"><X size={15} /></button>
	{:else if hint}
		<span class="kbd hint" aria-hidden="true">{hint}</span>
	{/if}
</div>

<style>
	.search-field {
		width: 100%;
	}
	.clear {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		margin-right: -12px;
		color: var(--color-text-muted);
	}
	.clear:hover {
		color: var(--color-text-primary);
	}
	.hint {
		display: none;
	}
	@media (hover: hover) and (min-width: 900px) {
		.hint {
			display: inline-grid;
		}
	}
</style>
