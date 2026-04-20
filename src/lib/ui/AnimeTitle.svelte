<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let {
		title,
		titleEnglish,
		class: className = '',
		tag = 'span'
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
		if (!hasBothTitles) return;
		e.preventDefault();
		e.stopPropagation();
		showingEnglish = !showingEnglish;
		flipped = !flipped;
		key++;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
	this={tag}
	class={className}
	onclick={handleFlip}
	style:cursor={hasBothTitles ? 'pointer' : 'default'}
>
	{#key key}
		<span in:fade={{ duration: 200, easing: quintOut }}>
			{displayTitle}
		</span>
	{/key}
	{#if hasBothTitles}
		<span
			class="inline-flex items-center rounded bg-white/10 px-1 py-0.5 font-medium uppercase tracking-wider text-text-muted transition-opacity {tag === 'h1'
				? 'ml-1.5 text-[9px] opacity-60 hover:opacity-100'
				: 'ml-1 text-[8px] opacity-50 hover:opacity-90'}"
		>
			{showingEnglish ? 'EN' : 'JP'}
		</span>
	{/if}
</svelte:element>
