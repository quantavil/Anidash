<script lang="ts">
	import type { UserListRecord } from '#lib/cache/db.js';
	import { formatMediaType, formatNumberShort } from '#lib/utils/format.js';
	import { Star, Mic, Users } from 'lucide-svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ProgressLine from './ProgressLine.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import GenreBadge from './GenreBadge.svelte';
	import EpisodeCounter from './EpisodeCounter.svelte';
	import { dubStore } from '#lib/stores/dub.svelte.js';

	// List-view counterpart of AnimeCard: cover on the left, details and progress on the right.
	let { entry, index = 0 }: { entry: UserListRecord; index?: number } = $props();

	const imageUrl = $derived(entry.mainPicture?.large ?? entry.mainPicture?.medium ?? null);
	const meta = $derived(
		[
			entry.mediaType ? formatMediaType(entry.mediaType) : '',
			entry.startSeason?.year ? String(entry.startSeason.year) : '',
			entry.numEpisodes > 0 ? `${entry.numEpisodes} eps` : ''
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<div
	class="group relative flex gap-3 overflow-hidden rounded-lg border border-border bg-surface-1 p-2.5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 feed-card-contain"
>
	<a
		href="/anime/{entry.malId}"
		class="absolute inset-0 z-[1]"
		aria-label="View {entry.title} details"
	></a>

	<!-- Cover -->
	<div
		class="relative aspect-[3/4] w-20 shrink-0 self-start overflow-hidden rounded-md bg-surface-2 sm:w-24"
	>
		<ImageWithFallback
			src={imageUrl}
			alt={entry.title}
			{index}
			class="h-full w-full transition-transform duration-300 group-hover:scale-105"
		/>
		<ProgressLine watched={entry.numWatchedEpisodes} total={entry.numEpisodes} />
		{#if dubStore.hasDub(entry.malId)}
			<div
				class="glass-badge absolute bottom-1.5 left-1 h-5 w-5 border-primary/20 text-primary"
				title="English dub"
			>
				<Mic size={10} fill="currentColor" />
			</div>
		{/if}
	</div>

	<!-- Details -->
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<div class="flex items-start justify-between gap-2">
			<AnimeTitle
				title={entry.title}
				titleEnglish={entry.titleEnglish ?? null}
				tag="h3"
				interactive={false}
				class="line-clamp-2 text-sm font-semibold leading-snug text-text-primary group-hover:text-primary"
			/>
			<div class="relative z-[2] -mr-2 -mt-1.5 shrink-0">
				<StatusBadge malId={entry.malId} status={entry.status} />
			</div>
		</div>

		<p class="truncate text-xs text-text-secondary" title={meta}>{meta}</p>

		<div class="flex items-center gap-3 text-xs text-text-secondary">
			{#if entry.mean}
				<span class="flex items-center gap-1 font-semibold text-text-primary">
					<Star size={11} class="text-warning" fill="currentColor" />{entry.mean.toFixed(2)}
				</span>
			{/if}
			{#if entry.numListUsers > 0}
				<span class="flex items-center gap-1"
					><Users size={11} />{formatNumberShort(entry.numListUsers)}</span
				>
			{/if}
			{#if entry.score > 0}
				<span
					class="flex items-center gap-1 rounded border border-primary/30 bg-primary/15 px-1.5 font-semibold text-text-primary"
					title="Your score"
				>
					<Star size={10} class="text-warning" fill="currentColor" />{entry.score}
				</span>
			{/if}
		</div>

		{#if entry.genres.length > 0}
			<div class="flex gap-1 overflow-hidden">
				{#each entry.genres.slice(0, 3) as genre (genre.name)}
					<GenreBadge name={genre.name} small />
				{/each}
			</div>
		{/if}

		<div class="relative z-[2] mt-auto w-44 max-w-full pt-1">
			<EpisodeCounter
				malId={entry.malId}
				watched={entry.numWatchedEpisodes}
				total={entry.numEpisodes}
				compact={true}
			/>
		</div>
	</div>
</div>
