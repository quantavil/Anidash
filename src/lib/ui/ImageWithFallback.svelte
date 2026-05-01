<script lang="ts">
	import { Film, User } from 'lucide-svelte';

	let {
		src,
		alt = '',
		aspectRatio = '3/4',
		fallbackIcon = 'film',
		index,
		class: className = ''
	}: {
		src: string | null | undefined;
		alt?: string;
		aspectRatio?: string;
		fallbackIcon?: 'film' | 'user';
		index?: number;
		class?: string;
	} = $props();

	let loaded = $state(false);
	let error = $state(false);
	let imgEl: HTMLImageElement | null = $state(null);

	$effect(() => {
		// Reset state when src changes
		loaded = false;
		error = false;
	});
</script>

<div class="relative overflow-hidden bg-surface-2 {className}" style="aspect-ratio: {aspectRatio};">
	{#if src && !error}
		<img
			bind:this={imgEl}
			{src}
			{alt}
			loading={index !== undefined && index < 5 ? 'eager' : 'lazy'}
			decoding="async"
			onload={() => (loaded = true)}
			onerror={() => (error = true)}
			class="h-full w-full object-cover transition-opacity duration-300 {loaded
				? 'opacity-100'
				: 'opacity-0'}"
		/>
		<!-- Shimmer while loading -->
		{#if !loaded}
			<div class="absolute inset-0 animate-pulse bg-surface-2"></div>
		{/if}
	{:else}
		<div class="flex h-full w-full items-center justify-center text-text-muted/30">
			{#if fallbackIcon === 'user'}
				<User size={32} />
			{:else}
				<Film size={32} />
			{/if}
		</div>
	{/if}
</div>
