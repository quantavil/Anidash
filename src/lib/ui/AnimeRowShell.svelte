<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Star, Mic, Users } from 'lucide-svelte';
	import { formatNumberShort } from '#lib/utils/format.js';
	import { dubStore } from '#lib/stores/dub.svelte.js';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import GenreBadge from './GenreBadge.svelte';

	// Shared list-row layout: cover on the left, details on the right.
	// AnimeRow (your list) and SearchResultRow (MAL results) only supply their own slots.
	let {
		malId,
		title,
		titleEnglish = null,
		image,
		index = 0,
		meta,
		mean = null,
		members = 0,
		genres,
		cover,
		status,
		stats,
		actions
	}: {
		malId: number;
		title: string;
		titleEnglish?: string | null;
		image: string | null;
		index?: number;
		meta: string;
		mean?: number | null;
		members?: number;
		genres: string[];
		/** Extra cover overlays (e.g. progress line). */
		cover?: Snippet;
		/** Top-right status control. */
		status?: Snippet;
		/** Extra items in the stats line (e.g. your score). */
		stats?: Snippet;
		/** Bottom action area (counter / add button). */
		actions?: Snippet;
	} = $props();
</script>

<div
	class="group relative flex gap-3 overflow-hidden rounded-lg border border-border bg-surface-1 p-2.5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 feed-card-contain"
>
	<a href="/anime/{malId}" class="absolute inset-0 z-[1]" aria-label="View {title} details"></a>

	<div
		class="relative aspect-[3/4] w-20 shrink-0 self-start overflow-hidden rounded-md bg-surface-2 sm:w-24"
	>
		<ImageWithFallback
			src={image}
			alt={title}
			{index}
			class="h-full w-full transition-transform duration-300 group-hover:scale-105"
		/>
		{@render cover?.()}
		{#if dubStore.hasDub(malId)}
			<div
				class="glass-badge absolute bottom-1.5 left-1 h-5 w-5 border-primary/20 text-primary"
				title="English dub"
			>
				<Mic size={10} fill="currentColor" />
			</div>
		{/if}
	</div>

	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<div class="flex items-start justify-between gap-2">
			<AnimeTitle
				{title}
				{titleEnglish}
				tag="h3"
				interactive={false}
				class="line-clamp-2 text-sm font-semibold leading-snug text-text-primary group-hover:text-primary"
			/>
			{#if status}
				<div class="relative z-[2] -mr-2 -mt-1.5 shrink-0">{@render status()}</div>
			{/if}
		</div>

		<p class="truncate text-xs text-text-secondary" title={meta}>{meta}</p>

		<div class="flex items-center gap-3 text-xs text-text-secondary">
			{#if mean}
				<span class="flex items-center gap-1 font-semibold text-text-primary">
					<Star size={11} class="text-warning" fill="currentColor" />{mean.toFixed(2)}
				</span>
			{/if}
			{#if members > 0}
				<span class="flex items-center gap-1"><Users size={11} />{formatNumberShort(members)}</span>
			{/if}
			{@render stats?.()}
		</div>

		{#if genres.length > 0}
			<div class="flex gap-1 overflow-hidden">
				{#each genres.slice(0, 3) as genre (genre)}
					<GenreBadge name={genre} small />
				{/each}
			</div>
		{/if}

		{@render actions?.()}
	</div>
</div>
