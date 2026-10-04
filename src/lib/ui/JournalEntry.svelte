<script lang="ts">
	import type { UserListRecord, AnimeStatus } from '$lib/cache/db';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { formatMediaType } from '$lib/utils/format';
	import { Star, Mic } from 'lucide-svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import EpisodeStepper from './EpisodeStepper.svelte';
	let {
		entry,
		featured = false,
		index = 0
	}: { entry: UserListRecord; featured?: boolean; index?: number } = $props();
</script>

<article class="journal-entry" class:featured>
	<a class="entry-cover" href="/anime/{entry.malId}" aria-label="View {entry.title} details">
		<ImageWithFallback
			src={featured
				? (entry.mainPicture?.large ?? entry.mainPicture?.medium)
				: (entry.mainPicture?.medium ?? entry.mainPicture?.large)}
			alt={entry.title}
			{index}
			priority={featured}
			aspectRatio={featured ? '2/3' : '3/4'}
			class="journal-cover-image"
		/>
	</a>
	<div class="entry-info">
		<a class="entry-title" href="/anime/{entry.malId}"
			><AnimeTitle
				title={entry.title}
				titleEnglish={entry.titleEnglish}
				tag="h2"
				interactive={false}
			/></a
		>
		<div class="entry-meta">
			<span>{formatMediaType(entry.mediaType)}</span>
			{#if entry.genres[0]}<span>{entry.genres[0].name}</span>{/if}
			{#if dubStore.hasDub(entry.malId)}<span class="dub-label"><Mic size={12} /> Dub</span>{/if}

			<label class="entry-status"
				><span class="sr-only">Status for {entry.title}</span><select
					aria-label="Status for {entry.title}"
					value={entry.status}
					onchange={(e) =>
						userListStore.setStatus(entry.malId, e.currentTarget.value as AnimeStatus)}
					><option value="watching">Watching</option><option value="plan_to_watch">Planned</option
					><option value="completed">Completed</option><option value="on_hold">On hold</option
					><option value="dropped">Dropped</option></select
				></label
			>
		</div>
		<div class="entry-ratings">
			<span class="community-rating" title="MyAnimeList community rating"
				><Star size={13} fill="currentColor" /><strong
					>{entry.mean != null ? entry.mean.toFixed(2) : '—'}</strong
				><span>MAL</span></span
			>
			<span
				class="personal-rating"
				aria-label="Your rating for {entry.title}: {entry.score || 'unrated'}"
				>Yours <strong>{entry.score > 0 ? `${entry.score}/10` : '—'}</strong></span
			>
		</div>
	</div>
	<div class="entry-tracking">
		<EpisodeStepper
			malId={entry.malId}
			title={entry.title}
			watched={entry.numWatchedEpisodes}
			total={entry.numEpisodes}
		/>
	</div>
</article>

<style>
	.journal-entry {
		display: grid;
		grid-template-columns: 64px minmax(0, 1fr) 172px;
		gap: 18px;
		padding: 16px 0;
		border-bottom: 1px solid var(--color-border);
		align-items: center;
		position: relative;
	}
	.entry-cover {
		display: block;
		overflow: hidden;
		border-radius: 8px;
		position: relative;
		box-shadow: 0 5px 15px #0004;
	}
	.entry-cover :global(.journal-cover-image) {
		width: 100%;
	}
	.entry-title {
		display: block;
		color: var(--color-text-primary);
		text-decoration: none;
	}
	.entry-title :global(h2) {
		font-size: 16px;
		font-weight: 550;
		line-height: 1.35;
		text-wrap: pretty;
		overflow-wrap: anywhere;
	}
	.entry-title:hover {
		color: var(--color-primary);
	}
	.entry-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 6px;
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.entry-meta > span + span {
		border-left: 1px solid var(--color-border);
		padding-left: 10px;
	}
	.dub-label {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.entry-ratings {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
	}
	.personal-rating {
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.personal-rating strong {
		color: var(--color-text-primary);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.community-rating {
		display: flex;
		gap: 5px;
		align-items: center;
		font-size: 13px;
		color: var(--color-warning);
	}
	.community-rating > span {
		color: var(--color-text-secondary);
		font-size: 10px;
	}

	.entry-status {
		display: inline-block;
		margin-top: 0;
	}
	.entry-status select {
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 11px;
		min-height: 44px;
		max-width: 100%;
		padding: 0 8px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-1);
		cursor: pointer;
	}
	.entry-status option {
		background: var(--color-surface-1);
	}
	.featured {
		grid-template-columns: 120px minmax(0, 1fr);
		gap: 24px;
		padding: 20px;
		margin-bottom: 10px;
		border: 1px solid #ffffff13;
		border-radius: 16px;
		background:
			radial-gradient(ellipse at 90% 0%, #a395ff08, transparent 65%),
			linear-gradient(140deg, var(--color-surface-2), var(--color-surface-1));
		box-shadow:
			inset 0 1px 0 #ffffff0c,
			0 14px 36px #0002;
	}
	.featured .entry-cover {
		grid-row: 1 / 3;
		align-self: start;
		height: auto;
	}
	.featured .entry-cover :global(.journal-cover-image) {
		height: auto;
		min-height: 0;
		max-height: none;
	}
	.featured .entry-title :global(h2) {
		font-family: var(--font-display);
		font-size: clamp(22px, 2.3vw, 28px);
		font-weight: 600;
		letter-spacing: -0.035em;
		line-height: 1.15;
		margin-top: 0;
	}
	.featured .entry-tracking {
		width: 100%;
		max-width: 300px;
		grid-column: 2;
		align-self: end;
	}
	@media (min-width: 1101px) {
		.featured {
			grid-template-columns: 120px minmax(0, 1fr) 192px;
			gap: 20px;
		}
		.featured .entry-tracking {
			grid-column: 3;
			grid-row: 1 / 3;
			align-self: center;
		}
	}
	@media (max-width: 640px) {
		.journal-entry {
			grid-template-columns: 60px minmax(0, 1fr);
			gap: 12px;
			padding: 18px 0;
		}
		.entry-cover {
			align-self: start;
		}
		.entry-tracking {
			grid-column: 1 / -1;
		}
		.entry-status {
			margin-top: 0;
		}
		.entry-title :global(h2) {
			font-size: 15px;
		}
		.entry-ratings {
			gap: 8px;
		}
		.featured {
			grid-template-columns: 76px minmax(0, 1fr);
			padding: 16px;
			gap: 14px;
			margin-bottom: 6px;
		}
		.featured .entry-cover {
			grid-row: 1;
			height: auto;
		}
		.featured .entry-cover :global(.journal-cover-image) {
			min-height: 0;
			height: auto;
		}
		.featured .entry-title :global(h2) {
			font-size: 20px;
			margin-top: 0;
		}
		.featured .entry-ratings {
			grid-column: 1 / -1;
		}
		.featured .entry-tracking {
			max-width: none;
			grid-column: 1 / -1;
		}
		.featured .entry-meta {
			font-size: 11px;
			gap: 6px;
		}
	}
	@media (max-width: 360px) {
		.featured {
			grid-template-columns: 64px minmax(0, 1fr);
			padding: 12px;
			gap: 10px;
		}
		.featured .entry-title :global(h2) {
			font-size: 21px;
		}
		.community-rating {
			font-size: 12px;
		}
	}
	@container (min-width: 720px) {
		.journal-entry:not(.featured) {
			grid-template-columns: 64px minmax(0, 1fr) 150px 172px;
			gap: 4px 18px;
		}
		.journal-entry:not(.featured) .entry-info {
			display: contents;
		}
		.journal-entry:not(.featured) .entry-cover {
			grid-column: 1;
			grid-row: 1 / 3;
		}
		.journal-entry:not(.featured) .entry-title {
			grid-column: 2;
			grid-row: 1;
			align-self: end;
		}
		.journal-entry:not(.featured) .entry-meta {
			grid-column: 2;
			grid-row: 2;
			align-self: start;
			margin-top: 0;
		}
		.journal-entry:not(.featured) .entry-ratings {
			grid-column: 3;
			grid-row: 1 / 3;
			flex-direction: column;
			align-items: start;
			margin: 0;
			gap: 4px;
		}
		.journal-entry:not(.featured) .entry-tracking {
			grid-column: 4;
			grid-row: 1 / 3;
		}
	}
</style>
