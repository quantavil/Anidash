<script lang="ts">
	import type { DisplayAnime } from '$lib/utils/types';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { formatMediaType, formatNumberShort, formatStatus } from '$lib/utils/format';
	import { Star, Plus, Check, Mic, Users } from 'lucide-svelte';
	import GenreBadge from './GenreBadge.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';

	let { anime }: { anime: DisplayAnime } = $props();

	const listEntry = $derived(userListStore.getEntry(anime.malId));
	const inList = $derived(listEntry !== undefined);
</script>

<a
	href="/anime/{anime.malId}"
	class="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
>
	<!-- Cover Image -->
	<div class="relative aspect-[3/4] w-full overflow-hidden bg-surface-2">
		<ImageWithFallback
			src={anime.mainPicture}
			alt={anime.title}
			class="h-full w-full transition-transform duration-300 group-hover:scale-105"
		/>

		<!-- Score overlay -->
		{#if anime.mean}
			<div
				class="glass-badge absolute right-2 top-2 px-2 py-0.5 text-[10px] font-bold tracking-tight"
			>
				<Star size={10} class="text-warning" fill="currentColor" />
				<span class="text-text-primary">{anime.mean.toFixed(1)}</span>
				{#if anime.numListUsers && anime.numListUsers > 0}
					<span class="mx-0.5 opacity-40">|</span>
					<span class="text-text-secondary">{formatNumberShort(anime.numListUsers)}</span>
				{/if}
			</div>
		{/if}

		<!-- In-list indicator -->
		{#if inList && listEntry}
			<div
				class={[
					'absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white shadow-sm backdrop-blur-md',
					listEntry.status === 'watching' && 'bg-primary/90',
					listEntry.status === 'completed' && 'bg-success/90',
					listEntry.status === 'on_hold' && 'bg-warning/90',
					listEntry.status === 'dropped' && 'bg-error/90',
					listEntry.status === 'plan_to_watch' && 'bg-info/90'
				]}
			>
				{formatStatus(listEntry.status)}
				{#if listEntry.status === 'watching'}
					<span class="opacity-75 font-bold ml-0.5"
						>{listEntry.numWatchedEpisodes}/{anime.numEpisodes || '?'}</span
					>
				{/if}
			</div>
		{/if}

		<!-- Dub overlay -->
		{#if dubStore.hasDub(anime.malId)}
			<div class="glass-badge absolute bottom-2 left-2 h-6 w-6 border-primary/20 text-primary">
				<Mic size={12} fill="currentColor" />
			</div>
		{/if}
	</div>

	<!-- Info -->
	<div class="flex flex-1 flex-col gap-1.5 p-3">
		<AnimeTitle
			title={anime.title}
			titleEnglish={anime.titleEnglish}
			tag="h3"
			class="line-clamp-2 text-sm font-medium leading-tight text-text-primary group-hover:text-primary"
		/>

		<div class="flex items-center gap-2 text-xs text-text-muted">
			{#if anime.mediaType}
				<span>{formatMediaType(anime.mediaType)}</span>
			{/if}
			{#if anime.numEpisodes > 0}
				<span>· {anime.numEpisodes} eps</span>
			{/if}
			{#if anime.startSeason}
				<span>· {anime.startSeason}</span>
			{/if}
		</div>

		<!-- Genres (show first 2) -->
		{#if anime.genres.length > 0}
			<div class="mt-auto flex flex-wrap gap-1 pt-1">
				{#each anime.genres.slice(0, 2) as genre}
					<GenreBadge name={genre} small />
				{/each}
			</div>
		{/if}

		<!-- Add to List button (if not in list) -->
		{#if !inList}
			<button
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					userListStore.addToList(anime.malId, 'plan_to_watch', anime.titleEnglish, anime.title, anime.mainPicture);
				}}
				class="mt-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
			>
				<Plus size={12} />
				Add to List
			</button>
		{/if}
	</div>
</a>
