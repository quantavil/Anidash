<script lang="ts">
	import type { DisplayAnime } from '#lib/utils/types.js';
	import { userListStore } from '#lib/stores/userlist.svelte.js';
	import { dubStore } from '#lib/stores/dub.svelte.js';
	import { authStore } from '#lib/auth/auth.svelte.js';
	import { toast } from 'svelte-sonner';
	import { formatMediaType, formatNumberShort } from '#lib/utils/format.js';
	import { Star, Plus, Mic, Users } from 'lucide-svelte';
	import GenreBadge from './GenreBadge.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import StatusBadge from './StatusBadge.svelte';

	// List-view counterpart of SearchResultCard: cover on the left, details on the right.
	let { anime, index = 0 }: { anime: DisplayAnime; index?: number } = $props();

	const listEntry = $derived(userListStore.getEntry(anime.malId));
	const meta = $derived(
		[
			anime.mediaType ? formatMediaType(anime.mediaType) : '',
			anime.numEpisodes > 0 ? `${anime.numEpisodes} eps` : '',
			anime.startSeason ?? ''
		]
			.filter(Boolean)
			.join(' · ')
	);

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
	class="group relative flex gap-3 overflow-hidden rounded-lg border border-border bg-surface-1 p-2.5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 feed-card-contain"
>
	<a
		href="/anime/{anime.malId}"
		class="absolute inset-0 z-[1]"
		aria-label="View {anime.title} details"
	></a>

	<!-- Cover -->
	<div
		class="relative aspect-[3/4] w-20 shrink-0 self-start overflow-hidden rounded-md bg-surface-2 sm:w-24"
	>
		<ImageWithFallback
			src={anime.mainPicture}
			alt={anime.title}
			{index}
			class="h-full w-full transition-transform duration-300 group-hover:scale-105"
		/>
		{#if dubStore.hasDub(anime.malId)}
			<div
				class="glass-badge absolute bottom-1 left-1 h-5 w-5 border-primary/20 text-primary"
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
				title={anime.title}
				titleEnglish={anime.titleEnglish}
				tag="h3"
				interactive={false}
				class="line-clamp-2 text-sm font-semibold leading-snug text-text-primary group-hover:text-primary"
			/>
			{#if listEntry}
				<div class="relative z-[2] -mr-2 -mt-1.5 shrink-0">
					<StatusBadge malId={listEntry.malId} status={listEntry.status} />
				</div>
			{/if}
		</div>

		<p class="truncate text-xs text-text-secondary" title={meta}>{meta}</p>

		<div class="flex items-center gap-3 text-xs text-text-secondary">
			{#if anime.mean}
				<span class="flex items-center gap-1 font-semibold text-text-primary">
					<Star size={11} class="text-warning" fill="currentColor" />{anime.mean.toFixed(2)}
				</span>
			{/if}
			{#if anime.numListUsers > 0}
				<span class="flex items-center gap-1"
					><Users size={11} />{formatNumberShort(anime.numListUsers)}</span
				>
			{/if}
		</div>

		{#if anime.genres.length > 0}
			<div class="flex gap-1 overflow-hidden">
				{#each anime.genres.slice(0, 3) as genre (genre)}
					<GenreBadge name={genre} small />
				{/each}
			</div>
		{/if}

		{#if !listEntry}
			<button
				onclick={handleAdd}
				disabled={adding}
				aria-label="Add {anime.title} to Plan to Watch"
				class="relative z-[2] mt-auto flex min-h-8 w-fit items-center justify-center gap-1 rounded-md border border-dashed border-primary/40 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
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
