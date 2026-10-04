<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import { formatMediaType } from '$lib/utils/format';
	import { Star, Mic } from 'lucide-svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ProgressLine from './ProgressLine.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import RatingSelect from './RatingSelect.svelte';
	import EpisodeCounter from './EpisodeCounter.svelte';

	let {
		entry,
		index = 0
	}: {
		entry: UserListRecord;
		index?: number;
	} = $props();

	const imageUrl = $derived(entry.mainPicture?.medium ?? entry.mainPicture?.large ?? null);
</script>

<div
	class="group relative flex flex-col rounded-xl border border-white/10 bg-white/5 p-0.5 transition-all duration-200 hover:bg-white/10 hover:border-white/20 feed-card-contain"
>
	<div
		class="relative flex flex-col h-full overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
	>
		<a
			href="/anime/{entry.malId}"
			class="absolute inset-0 z-[1]"
			aria-label="View {entry.title} details"
		></a>
		<!-- Cover Image -->
		<div class="relative aspect-[3/4] w-full overflow-hidden bg-surface-2 border-b border-white/5">
			<ImageWithFallback
				src={imageUrl}
				alt={entry.title}
				{index}
				class="h-full w-full transition-transform duration-200 ease-spring group-hover:scale-105"
			/>

			<!-- Progress Line -->
			<ProgressLine watched={entry.numWatchedEpisodes} total={entry.numEpisodes} />

			<!-- Status badge overlay -->
			<div class="absolute left-2 top-2 z-10">
				<StatusBadge malId={entry.malId} status={entry.status} />
			</div>

			<!-- Dub overlay -->
			{#if dubStore.hasDub(entry.malId)}
				<div class="glass-badge absolute bottom-2 left-2 h-6 w-6 border-primary/20 text-primary">
					<Mic size={12} fill="currentColor" />
				</div>
			{/if}
		</div>

		<!-- Info -->
		<div class="flex flex-1 flex-col gap-2 p-3">
			<!-- Title -->
			<AnimeTitle
				title={entry.title}
				titleEnglish={entry.titleEnglish ?? null}
				tag="h3"
				interactive={false}
				class="line-clamp-2 text-sm font-medium leading-tight text-text-primary transition-colors duration-300 group-hover:text-primary"
			/>

			<div class="flex items-center gap-1.5 text-xs text-warning">
				<Star size={12} fill="currentColor" /><span
					>{entry.mean != null ? entry.mean.toFixed(2) : '—'}</span
				><span class="text-text-secondary">MAL</span>
			</div>

			<!-- Type + Season -->
			<div class="flex items-center gap-2 text-xs text-text-muted">
				{#if entry.mediaType}
					<span>{formatMediaType(entry.mediaType)}</span>
				{/if}
				{#if entry.startSeason?.year && entry.startSeason?.season}
					<span>· {entry.startSeason.year}</span>
				{/if}
			</div>

			<div class="relative z-[2]">
				<RatingSelect malId={entry.malId} title={entry.title} score={entry.score} />
			</div>

			<!-- Progress Controls -->
			<div
				class="relative z-[2] mt-auto pt-2 flex items-center justify-between"
				onclick={(e) => e.stopPropagation()}
				role="presentation"
			>
				<EpisodeCounter
					malId={entry.malId}
					watched={entry.numWatchedEpisodes}
					total={entry.numEpisodes}
					compact={true}
				/>
			</div>
		</div>
	</div>
</div>
