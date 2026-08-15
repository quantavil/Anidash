<script lang="ts">
	import type { DisplayAnime } from '$lib/utils/types';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { authStore } from '$lib/auth/auth.svelte';
	import { toast } from 'svelte-sonner';
	import { formatMediaType, formatNumberShort } from '$lib/utils/format';
	import { Star, Plus, Mic } from 'lucide-svelte';
	import GenreBadge from './GenreBadge.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import StatusBadge from './StatusBadge.svelte';

	let { anime, index = 0 }: { anime: DisplayAnime; index?: number } = $props();

	const listEntry = $derived(userListStore.getEntry(anime.malId));
	const inList = $derived(listEntry !== undefined);

	let adding = $state(false);

	async function handleAdd(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!authStore.isAuthenticated) {
			toast.info('Please login to add to your list');
			authStore.login();
			return;
		}
		adding = true;
		const result = await userListStore.addToList(
			anime.malId,
			'plan_to_watch',
			anime.titleEnglish,
			anime.title,
			anime.mainPicture,
			anime.genres
		);
		adding = false;
		if (result.ok) {
			toast.success(`Added ${anime.title} to Plan to Watch`);
		} else {
			toast.error(result.error.message || 'Failed to add anime');
		}
	}
</script>

<div
	class="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
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

		<!-- Status badge overlay -->
		{#if inList && listEntry}
			<div class="absolute left-2 top-2 z-10">
				<StatusBadge malId={listEntry.malId} status={listEntry.status} />
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
	<div class="flex flex-1 flex-col gap-1.5 p-3">
		<AnimeTitle
			title={anime.title}
			titleEnglish={anime.titleEnglish}
			tag="h3"
			interactive={false}
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
				{#each anime.genres.slice(0, 2) as genre, _idx (_idx)}
					<GenreBadge name={genre} small />
				{/each}
			</div>
		{/if}

		<!-- Add to List button (if not in list) -->
		{#if !inList}
			<button
				onclick={handleAdd}
				disabled={adding}
				aria-label="Add {anime.title} to Plan to Watch"
				class="relative z-[2] mt-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
			>
				{#if adding}
					<div
						class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<span>Adding...</span>
				{:else}
					<Plus size={12} />
					<span>Add to List</span>
				{/if}
			</button>
		{/if}
	</div>
</div>
