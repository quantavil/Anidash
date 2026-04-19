<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import { formatMediaType } from '$lib/utils/format';
	import { Star, Mic } from 'lucide-svelte';
	import StatusBadge from './StatusBadge.svelte';
	import EpisodeCounter from './EpisodeCounter.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';

	let {
		entry,
		onComplete,
		index = 0
	}: {
		entry: UserListRecord;
		onComplete?: (malId: number) => void;
		index?: number;
	} = $props();

	const imageUrl = $derived(entry.mainPicture?.large ?? entry.mainPicture?.medium ?? null);
</script>

<a
	href="/anime/{entry.malId}"
	class="group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-0.5 transition-all duration-500 ease-spring hover:bg-white/10 active:scale-[0.98] will-change-transform"
>
	<div
		class="flex flex-col h-full overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
	>
		<!-- Cover Image -->
		<div class="relative aspect-[3/4] w-full overflow-hidden bg-surface-2 border-b border-border">
			<ImageWithFallback
				src={imageUrl}
				alt={entry.title}
				class="h-full w-full transition-transform duration-700 ease-spring group-hover:scale-105"
			/>

			<!-- Status badge overlay -->
			<div class="absolute left-2 top-2">
				<StatusBadge malId={entry.malId} status={entry.status} />
			</div>

			<!-- Dub overlay -->
			{#if dubStore.hasDub(entry.malId)}
				<div class="glass-badge absolute bottom-2 left-2 h-6 w-6 border-primary/20 text-primary">
					<Mic size={12} fill="currentColor" />
				</div>
			{/if}

			<!-- Score overlay -->
			{#if entry.mean}
				<div class="glass-badge absolute right-2 top-2 px-2 py-0.5 text-xs font-medium">
					<Star size={10} class="mr-1 text-warning" fill="currentColor" />
					{entry.mean.toFixed(1)}
				</div>
			{/if}

			<!-- User score overlay -->
			{#if entry.score > 0}
				<div
					class="glass-badge absolute bottom-2 right-2 px-2 py-0.5 text-xs font-bold border-primary/30 bg-primary/20"
				>
					<Star size={10} class="mr-1 text-warning" fill="currentColor" />
					{entry.score}
				</div>
			{/if}
		</div>

		<!-- Info -->
		<div class="flex flex-1 flex-col gap-2 p-3">
			<!-- Title -->
			<h3
				class="line-clamp-2 text-sm font-medium leading-tight text-text-primary transition-colors duration-300 group-hover:text-primary"
			>
				{entry.title}
			</h3>

			<!-- Type + Season -->
			<div class="flex items-center gap-2 text-xs text-text-muted">
				{#if entry.mediaType}
					<span>{formatMediaType(entry.mediaType)}</span>
				{/if}
				{#if entry.startSeason?.year && entry.startSeason?.season}
					<span>· {entry.startSeason.year}</span>
				{/if}
			</div>

			<!-- Progress -->
			<div class="mt-auto pt-1">
				<EpisodeCounter
					malId={entry.malId}
					watched={entry.numWatchedEpisodes}
					total={entry.numEpisodes}
					{onComplete}
				/>
			</div>
		</div>
	</div>
</a>
