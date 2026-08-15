<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let {
		title,
		titleEnglish,
		class: className = '',
		tag = 'span',
		interactive = true
	}: {
		title: string;
		titleEnglish: string | null;
		class?: string;
		tag?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
		interactive?: boolean;
	} = $props();

	// eslint-disable-next-line svelte/prefer-writable-derived
	let showingEnglish = $state(settingsStore.preferEnglish);

	const hasBothTitles = $derived(titleEnglish !== null && titleEnglish !== title);

	const displayTitle = $derived.by(() => {
		if (!hasBothTitles) return title;
		return showingEnglish ? titleEnglish! : title;
	});

	$effect(() => {
		showingEnglish = settingsStore.preferEnglish;
	});

	function handleFlip(e: Event) {
		if (!hasBothTitles || !interactive) return;
		e.preventDefault();
		e.stopPropagation();
		showingEnglish = !showingEnglish;
	}
</script>

<svelte:element
	this={tag}
	class={className}
	onclick={interactive && hasBothTitles ? handleFlip : undefined}
	onkeydown={interactive && hasBothTitles
		? (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && handleFlip(e)
		: undefined}
	role={interactive && hasBothTitles ? 'button' : undefined}
	tabindex={interactive && hasBothTitles ? 0 : undefined}
	style:cursor={interactive && hasBothTitles ? 'pointer' : 'default'}
>
	{#if interactive && hasBothTitles}
		{#key showingEnglish}
			<span in:fade={{ duration: 150, easing: quintOut }}>
				{displayTitle}
			</span>
		{/key}
	{:else}
		<span>{displayTitle}</span>
	{/if}
	{#if interactive && hasBothTitles}
		<span
			class="inline-flex items-center rounded bg-white/10 px-1 py-0.5 font-medium uppercase tracking-wider text-text-muted transition-opacity {tag ===
			'h1'
				? 'ml-1.5 text-[9px] opacity-60 hover:opacity-100'
				: 'ml-1 text-[8px] opacity-50 hover:opacity-90'}"
		>
			{showingEnglish ? 'EN' : 'JP'}
		</span>
		<span class="block mt-0.5 text-[11px] font-normal leading-normal text-text-muted line-clamp-1">
			{showingEnglish ? title : titleEnglish}
		</span>
	{/if}
</svelte:element>
