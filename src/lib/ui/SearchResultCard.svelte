<script lang="ts">
	import type { DisplayAnime } from '$lib/utils/types';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { authStore } from '$lib/auth/auth.svelte';
	import { toast } from 'svelte-sonner';
	import { formatMediaType } from '$lib/utils/format';
	import { Star, Plus, Mic } from 'lucide-svelte';
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

<div class="search-card group relative flex flex-col min-w-0 feed-card-contain">
	<a
		href="/anime/{anime.malId}"
		class="absolute inset-0 z-[1]"
		aria-label="View {anime.title} details"
	></a>

	<!-- Cover Image -->
	<div class="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface-2">
		<ImageWithFallback
			src={anime.mainPicture}
			alt={anime.title}
			{index}
			class="h-full w-full transition-transform duration-300 group-hover:scale-105"
		/>
	</div>

	<!-- Info -->
	<div class="card-body">
		<AnimeTitle
			title={anime.title}
			titleEnglish={anime.titleEnglish}
			tag="h3"
			interactive={false}
			class="poster-title line-clamp-2 text-[15px] font-medium leading-tight text-text-primary group-hover:text-primary"
		/>

		<div class="flex items-center gap-1.5 text-xs text-warning">
			<Star size={12} fill="currentColor" /><span
				>{anime.mean != null ? anime.mean.toFixed(2) : '—'}</span
			><span class="text-text-secondary">MAL</span>
		</div>

		<div class="card-metadata">
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

		<div class="card-dub">
			{#if dubStore.hasDub(anime.malId)}<Mic size={12} /> English dub{/if}
		</div>
		<div class="card-action">
			{#if inList && listEntry}
				<StatusBadge malId={listEntry.malId} status={listEntry.status} showLabel fullWidth />
			{:else}
				<!-- Add to List button (if not in list) -->
				<button
					onclick={handleAdd}
					disabled={adding}
					aria-label="Add {anime.title} to Plan to Watch"
					class="w-full flex items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 min-h-11 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
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
</div>
