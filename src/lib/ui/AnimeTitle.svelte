<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';

	let {
		title,
		titleEnglish,
		class: className = '',
		tag: tag = 'span'
	}: {
		title: string;
		titleEnglish: string | null;
		class?: string;
		tag?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
	} = $props();

	let showingEnglish = $state(settingsStore.preferEnglish);
	let flipped = $state(false);
	let key = $state(0);

	const hasBothTitles = $derived(titleEnglish !== null && titleEnglish !== title);

	const displayTitle = $derived.by(() => {
		if (!hasBothTitles) return title;
		return showingEnglish ? titleEnglish! : title;
	});

	$effect(() => {
		showingEnglish = settingsStore.preferEnglish;
		flipped = false;
	});

	function handleFlip(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!hasBothTitles) return;
		showingEnglish = !showingEnglish;
		flipped = !flipped;
		key++;
	}
</script>

{#if tag === 'h1'}
	<h1 class={className} onclick={handleFlip} style:cursor={hasBothTitles ? 'pointer' : 'default'}>
		{#key key}
			<span
				animate:flip={{ duration: 200, easing: quintOut }}
			>
				{displayTitle}
			</span>
		{/key}
		{#if hasBothTitles}
			<span class="ml-1.5 inline-flex items-center rounded bg-white/10 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-muted opacity-60 transition-opacity hover:opacity-100">
				{showingEnglish ? 'EN' : 'JP'}
			</span>
		{/if}
	</h1>
{:else if tag === 'h3'}
	<h3 class={className} onclick={handleFlip} style:cursor={hasBothTitles ? 'pointer' : 'default'}>
		{#key key}
			<span
				animate:flip={{ duration: 200, easing: quintOut }}
			>
				{displayTitle}
			</span>
		{/key}
		{#if hasBothTitles}
			<span class="ml-1 inline-flex items-center rounded bg-white/10 px-1 py-0.5 text-[8px] font-medium uppercase tracking-wider text-text-muted opacity-50 transition-opacity hover:opacity-90">
				{showingEnglish ? 'EN' : 'JP'}
			</span>
		{/if}
	</h3>
{:else}
	<span class={className} onclick={handleFlip} style:cursor={hasBothTitles ? 'pointer' : 'default'}>
		{#key key}
			<span
				animate:flip={{ duration: 200, easing: quintOut }}
			>
				{displayTitle}
			</span>
		{/key}
		{#if hasBothTitles}
			<span class="ml-1 inline-flex items-center rounded bg-white/10 px-1 py-0.5 text-[8px] font-medium uppercase tracking-wider text-text-muted opacity-50 transition-opacity hover:opacity-90">
				{showingEnglish ? 'EN' : 'JP'}
			</span>
		{/if}
	</span>
{/if}
