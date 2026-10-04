<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import { formatMediaType } from '$lib/utils/format';
	import { Star, Mic } from 'lucide-svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import EpisodeBar from './EpisodeBar.svelte';
	import EpisodeStepper from './EpisodeStepper.svelte';
	import RatingSelect from './RatingSelect.svelte';
	import StatusSelect from './StatusSelect.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';

	let { entry, index = 0 }: { entry: UserListRecord; index?: number } = $props();
	const year = $derived(entry.startSeason?.year);
</script>

<article class="card feed-card-contain">
	<a class="poster" href="/anime/{entry.malId}" aria-label="View {entry.title} details">
		<ImageWithFallback
			src={entry.mainPicture?.medium ?? entry.mainPicture?.large}
			alt=""
			{index}
			aspectRatio="2/3"
			class="img"
		/>
		<EpisodeBar class="poster-bar" watched={entry.numWatchedEpisodes} total={entry.numEpisodes} />
		{#if dubStore.hasDub(entry.malId)}
			<span class="glass-badge dub" title="Dubbed"><Mic size={12} fill="currentColor" /></span>
		{/if}
	</a>
	<div class="info">
		<a class="title" href="/anime/{entry.malId}"
			><AnimeTitle
				title={entry.title}
				titleEnglish={entry.titleEnglish}
				tag="h3"
				interactive={false}
			/></a
		>
		<p class="meta">
			<span>{formatMediaType(entry.mediaType)}</span>
			{#if year}<span class="num">{year}</span>{/if}
			<span class="mal" title="MyAnimeList community rating"
				><Star size={11} fill="currentColor" /><span class="num"
					>{entry.mean != null ? entry.mean.toFixed(1) : '—'}</span
				>
				MAL</span
			>
		</p>
	</div>
	<EpisodeStepper
		malId={entry.malId}
		title={entry.title}
		watched={entry.numWatchedEpisodes}
		total={entry.numEpisodes}
		size="card"
	/>
	<div class="chips">
		<StatusSelect malId={entry.malId} title={entry.title} status={entry.status} compact />
		<RatingSelect malId={entry.malId} title={entry.title} score={entry.score} compact />
	</div>
</article>

<style>
	.card {
		container: card / inline-size;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}
	.poster {
		display: block;
		position: relative;
	}
	.poster :global(.img) {
		width: 100%;
		transition: transform 0.4s var(--ease-fluid);
	}
	.poster:hover :global(.img) {
		transform: scale(1.03);
	}
	.poster :global(.poster-bar) {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 4px;
		border-radius: 0;
		background: rgb(0 0 0 / 0.55);
	}
	.dub {
		position: absolute;
		left: 6px;
		bottom: 12px;
		width: 22px;
		height: 22px;
		color: var(--color-primary);
	}
	.info {
		min-width: 0;
		flex: 1;
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
	.mal {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		color: var(--color-text-muted);
	}
	.mal :global(svg) {
		color: var(--color-warning);
	}
	.mal .num {
		color: var(--color-text-secondary);
	}
	.chips {
		display: grid;
		gap: 6px;
		padding: 2px 0 4px;
	}
	/* Narrow cards stack the chips so labels never truncate; wider ones sit side by side. */
	@container card (min-width: 220px) {
		.chips {
			grid-template-columns: minmax(0, 1fr) auto;
		}
	}
</style>
