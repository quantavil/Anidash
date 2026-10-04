<script lang="ts">
	import type { DisplayAnime } from '$lib/utils/types';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { authStore } from '$lib/auth/auth.svelte';
	import { toast } from 'svelte-sonner';
	import { formatMediaType } from '$lib/utils/format';
	import { Star, Plus, Mic, Check, LoaderCircle } from 'lucide-svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import { STATUS_META } from './status';

	let {
		anime,
		index = 0,
		season
	}: {
		anime: DisplayAnime;
		index?: number;
		/** Season the card is shown under; long-running shows from earlier seasons read "Since …". */
		season?: string;
	} = $props();

	const listEntry = $derived(userListStore.getEntry(anime.malId));
	const inList = $derived(listEntry !== undefined);
	let adding = $state(false);

	async function handleAdd() {
		if (!authStore.isAuthenticated) {
			toast.info('Connect MyAnimeList to add to your list');
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
		if (result.ok) toast.success(`Added ${anime.title} to Plan to Watch`);
		else toast.error(result.error.message || 'Failed to add anime');
	}
</script>

<article class="card feed-card-contain">
	<div class="frame poster">
		<a class="cover" href="/anime/{anime.malId}" aria-label="View {anime.title} details">
			<ImageWithFallback src={anime.mainPicture} alt="" {index} aspectRatio="2/3" class="img" />
		</a>
		{#if anime.mean != null}
			<span class="score glass-badge" title="MyAnimeList community rating"
				><Star size={11} fill="currentColor" /><span class="num">{anime.mean.toFixed(2)}</span
				></span
			>
		{/if}
		{#if dubStore.hasDub(anime.malId)}
			<span class="dub glass-badge" title="Dubbed"><Mic size={12} fill="currentColor" /></span>
		{/if}
		{#if inList}
			<span class="saved glass-badge" title="In your list"
				><Check size={16} strokeWidth={2.4} /></span
			>
		{:else}
			<button
				class="add glass-badge"
				onclick={handleAdd}
				disabled={adding}
				aria-label="Add {anime.title} to Plan to Watch"
				title="Add to Plan to Watch"
				>{#if adding}<LoaderCircle size={17} class="animate-spin" />{:else}<Plus
						size={19}
						strokeWidth={2.2}
					/>{/if}</button
			>
		{/if}
	</div>
	<div class="info">
		<a class="title" href="/anime/{anime.malId}"
			><AnimeTitle
				title={anime.title}
				titleEnglish={anime.titleEnglish}
				tag="h3"
				interactive={false}
			/></a
		>
		<p class="meta">
			{#if anime.mediaType}<span>{formatMediaType(anime.mediaType)}</span>{/if}
			{#if anime.numEpisodes > 0}<span class="num">{anime.numEpisodes} ep</span>{/if}
			{#if anime.startSeason}<span
					>{season && anime.startSeason !== season
						? `Since ${anime.startSeason.split(' ').pop()}`
						: anime.startSeason}</span
				>{/if}
		</p>
		{#if listEntry}
			<p class="state">
				<span class="status-dot" style:--dot={STATUS_META[listEntry.status].color}></span>
				{STATUS_META[listEntry.status].short}
			</p>
		{/if}
	</div>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}
	.frame {
		position: relative;
	}
	.cover {
		display: block;
	}
	.frame :global(.img) {
		width: 100%;
		transition: transform 0.4s var(--ease-fluid);
	}
	.cover:hover :global(.img) {
		transform: scale(1.03);
	}
	.score {
		position: absolute;
		top: 6px;
		right: 6px;
		gap: 4px;
		padding: 3px 8px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-warning);
	}
	.score .num {
		color: var(--color-text-primary);
	}
	.dub {
		position: absolute;
		left: 6px;
		bottom: 8px;
		width: 24px;
		height: 24px;
		color: var(--color-primary);
	}
	.add,
	.saved {
		position: absolute;
		right: 6px;
		bottom: 6px;
		width: 44px;
		height: 44px;
		transition:
			background-color 0.15s,
			color 0.15s,
			transform 0.1s;
	}
	.add:hover:not(:disabled) {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}
	.add:active:not(:disabled) {
		transform: scale(0.92);
	}
	.saved {
		color: var(--color-primary);
		pointer-events: none;
	}
	.title :global(h3) {
		font-size: 14px;
		font-weight: 600;
		line-height: 1.3;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.title:hover :global(h3) {
		text-decoration: underline;
		text-decoration-color: var(--color-border-strong);
		text-underline-offset: 3px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0 8px;
		margin-top: 2px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.meta > span:not(:last-child)::after {
		content: '·';
		margin-left: 8px;
	}
	.state {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		font-size: 12px;
		color: var(--color-text-secondary);
	}
</style>
