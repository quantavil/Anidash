<script lang="ts">
	import type { DisplayAnime } from '#lib/utils/types.js';
	import { userListStore } from '#lib/stores/userlist.svelte.js';
	import { dubStore } from '#lib/stores/dub.svelte.js';
	import { formatMediaType, formatNumberShort } from '#lib/utils/format.js';
	import { Star, Mic } from 'lucide-svelte';
	import GenreBadge from './GenreBadge.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import AddToListButton from './AddToListButton.svelte';

	let { anime, index = 0 }: { anime: DisplayAnime; index?: number } = $props();

	const listEntry = $derived(userListStore.getEntry(anime.malId));
	const inList = $derived(listEntry !== undefined);
	const metaParts = $derived({
		type: anime.mediaType ? formatMediaType(anime.mediaType) : '',
		eps: anime.numEpisodes > 0 ? `${anime.numEpisodes} eps` : '',
		season: anime.startSeason ?? ''
	});
	const meta = $derived(
		[metaParts.type, metaParts.eps, metaParts.season].filter(Boolean).join(' · ')
	);
	// Below 360px the episode count is dropped so type and season stay on one line.
	const metaShort = $derived([metaParts.type, metaParts.season].filter(Boolean).join(' · '));
</script>

<div
	class="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface-1 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 feed-card-contain"
>
	<a
		href="/anime/{anime.malId}"
		class="absolute inset-0 z-[1]"
		aria-label="View {anime.title} details"
	></a>

	<!-- Cover Image -->
	<div class="relative aspect-[3/4] w-full overflow-hidden bg-surface-2">
		<ImageWithFallback
			src={anime.mainPicture}
			alt={anime.title}
			{index}
			class="h-full w-full transition-transform duration-300 group-hover:scale-105"
		/>

		<!-- Score overlay -->
		{#if anime.mean}
			<div
				class="glass-badge absolute right-2 top-2 px-2 py-0.5 text-[10px] font-bold tracking-tight z-10"
			>
				<Star size={10} class="text-warning" fill="currentColor" />
				<span class="text-text-primary">{anime.mean.toFixed(1)}</span>
				{#if anime.numListUsers && anime.numListUsers > 0}
					<span class="mx-0.5 opacity-40">|</span>
					<span class="text-text-secondary">{formatNumberShort(anime.numListUsers)}</span>
				{/if}
			</div>
		{/if}

		<!-- Dub overlay -->
		{#if dubStore.hasDub(anime.malId)}
			<div class="glass-badge absolute bottom-2 left-2 h-6 w-6 border-primary/20 text-primary z-10">
				<Mic size={12} fill="currentColor" />
			</div>
		{/if}
	</div>

	<!-- Info -->
	<div class="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
		<AnimeTitle
			title={anime.title}
			titleEnglish={anime.titleEnglish}
			tag="h3"
			interactive={false}
			class="line-clamp-2 text-sm font-medium leading-tight text-text-primary group-hover:text-primary"
		/>

		<div class="flex items-center justify-between gap-1">
			<p class="min-w-0 truncate text-[11px] text-text-secondary sm:text-xs" title={meta}>
				<span class="max-[359px]:hidden">{meta}</span>
				<span class="min-[360px]:hidden">{metaShort}</span>
			</p>

			{#if listEntry}
				<div class="relative z-[2] -mr-3 shrink-0">
					<StatusBadge malId={listEntry.malId} status={listEntry.status} />
				</div>
			{/if}
		</div>

		<!-- Genres (first 2, one line) -->
		{#if anime.genres.length > 0}
			<div class="mt-auto flex gap-1 overflow-hidden pt-1">
				{#each anime.genres.slice(0, 2) as genre, _idx (_idx)}
					<GenreBadge name={genre} small />
				{/each}
			</div>
		{/if}

		<!-- Add to List button (if not in list) -->
		{#if !inList}
			<AddToListButton {anime} class="mt-2 min-h-9 py-1.5" />
		{/if}
	</div>
</div>
