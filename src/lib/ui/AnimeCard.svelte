<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import { formatMediaType } from '$lib/utils/format';
	import { Star, Mic } from 'lucide-svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ProgressLine from './ProgressLine.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import EpisodeStepper from './EpisodeStepper.svelte';

	let {
		entry,
		index = 0
	}: {
		entry: UserListRecord;
		index?: number;
	} = $props();

	const imageUrl = $derived(entry.mainPicture?.medium ?? entry.mainPicture?.large ?? null);
</script>

<div class="poster-card group relative flex flex-col feed-card-contain">
	<div class="poster-inner relative flex flex-col h-full">
		<a
			href="/anime/{entry.malId}"
			class="absolute inset-0 z-[1]"
			aria-label="View {entry.title} details"
		></a>
		<!-- Cover Image -->
		<div class="poster-art relative aspect-[2/3] w-full">
			<ImageWithFallback
				src={imageUrl}
				alt={entry.title}
				{index}
				class="rounded-xl h-full w-full transition-transform duration-200 ease-spring group-hover:scale-[1.02]"
			/>

			<div class="poster-status absolute left-2 top-2 z-[3]">
				<StatusBadge
					malId={entry.malId}
					status={entry.status}
					showLabel
					class="!bg-surface-0/95 !border-white/20 !shadow-none !transform-none"
				/>
			</div>
			<!-- Progress Line -->
			<ProgressLine watched={entry.numWatchedEpisodes} total={entry.numEpisodes} />

			<!-- Dub overlay -->
			{#if dubStore.hasDub(entry.malId)}
				<div class="glass-badge absolute bottom-2 left-2 h-6 w-6 border-primary/20 text-primary">
					<Mic size={12} fill="currentColor" />
				</div>
			{/if}
		</div>

		<!-- Info -->
		<div class="card-body">
			<!-- Title -->
			<AnimeTitle
				title={entry.title}
				titleEnglish={entry.titleEnglish ?? null}
				tag="h3"
				interactive={false}
				class="poster-title line-clamp-2 text-[15px] font-medium leading-tight text-text-primary transition-colors duration-300 group-hover:text-primary"
			/>

			<div class="flex items-center gap-1.5 text-xs text-warning">
				<Star size={12} fill="currentColor" /><span
					>{entry.mean != null ? entry.mean.toFixed(2) : '—'}</span
				><span class="text-text-secondary">MAL</span>
			</div>

			<!-- Type + Season -->
			<div class="card-metadata">
				{#if entry.mediaType}
					<span>{formatMediaType(entry.mediaType)}</span>
				{/if}
				{#if entry.startSeason?.year && entry.startSeason?.season}
					<span>· {entry.startSeason.year}</span>
				{/if}
			</div>

			<!-- Progress Controls -->
			<div class="card-action" onclick={(e) => e.stopPropagation()} role="presentation">
				<EpisodeStepper
					malId={entry.malId}
					watched={entry.numWatchedEpisodes}
					total={entry.numEpisodes}
					title={entry.title}
					size="card"
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.poster-card {
		min-width: 0;
	}
	.poster-card:has(:global([aria-expanded='true'])) {
		z-index: 20;
	}
</style>
