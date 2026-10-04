<script lang="ts">
	import type { UserListRecord } from '$lib/cache/db';
	import { dubStore } from '$lib/stores/dub.svelte';
	import { formatMediaType, formatRelativeDate } from '$lib/utils/format';
	import { Star, Mic } from 'lucide-svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import EpisodeStepper from './EpisodeStepper.svelte';
	import RatingSelect from './RatingSelect.svelte';
	import StatusSelect from './StatusSelect.svelte';
	import { STATUS_META } from './status';

	let { entry, index = 0 }: { entry: UserListRecord; index?: number } = $props();
	const year = $derived(entry.startSeason?.year);
</script>

<article class="row feed-card-contain" style:--st={STATUS_META[entry.status]?.color}>
	<a class="cover poster" href="/anime/{entry.malId}" aria-label="View {entry.title} details">
		<ImageWithFallback
			src={entry.mainPicture?.medium ?? entry.mainPicture?.large}
			alt=""
			{index}
			aspectRatio="2/3"
			class="cover-img"
		/>
	</a>

	<div class="main">
		<a class="title" href="/anime/{entry.malId}"
			><AnimeTitle
				title={entry.title}
				titleEnglish={entry.titleEnglish}
				tag="h2"
				interactive={false}
			/></a
		>
		<p class="sub">
			<span>{formatMediaType(entry.mediaType)}</span>
			{#if year}<span class="num">{year}</span>{/if}
			{#each entry.genres.slice(0, 2) as genre (genre.id)}<span class="genre">{genre.name}</span
				>{/each}
			{#if dubStore.hasDub(entry.malId)}<span class="dub"><Mic size={11} /> Dub</span>{/if}
		</p>
	</div>

	<div class="mal" title="MyAnimeList community rating">
		<Star size={13} fill="currentColor" aria-hidden="true" /><span class="num"
			>{entry.mean != null ? entry.mean.toFixed(2) : '—'}</span
		><span class="k">MAL</span>
	</div>

	<div class="chips">
		<div class="you">
			<RatingSelect malId={entry.malId} title={entry.title} score={entry.score} />
		</div>
		<div class="stat">
			<StatusSelect malId={entry.malId} title={entry.title} status={entry.status} />
		</div>
	</div>

	<div class="prog">
		<EpisodeStepper
			malId={entry.malId}
			title={entry.title}
			watched={entry.numWatchedEpisodes}
			total={entry.numEpisodes}
		/>
	</div>

	<time class="upd num" datetime={entry.updatedAt ?? undefined}
		>{entry.updatedAt ? formatRelativeDate(entry.updatedAt) : '—'}</time
	>
</article>

<style>
	.row {
		display: grid;
		gap: 6px 14px;
		padding: 14px 0;
		border-bottom: 1px solid var(--color-border);
		align-items: center;
		/* phone: poster beside identity, controls beneath */
		grid-template-columns: 64px minmax(0, 1fr);
		grid-template-areas:
			'cover main'
			'cover mal'
			'cover chips'
			'prog  prog';
	}
	.cover {
		grid-area: cover;
		align-self: start;
		display: block;
	}
	.cover :global(.cover-img) {
		width: 100%;
	}
	.main {
		grid-area: main;
		min-width: 0;
		align-self: end;
	}
	.title {
		display: block;
		color: var(--color-text-primary);
	}
	.title :global(h2) {
		font-size: 15px;
		font-weight: 600;
		line-height: 1.3;
		letter-spacing: -0.005em;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.title:hover :global(h2) {
		text-decoration: underline;
		text-decoration-color: var(--color-border-strong);
		text-underline-offset: 3px;
	}
	.sub {
		display: flex;
		flex-wrap: wrap;
		gap: 0 8px;
		margin-top: 2px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.sub > span + span::before {
		content: '·';
		margin-right: 8px;
	}
	.genre {
		display: none;
	}
	@container ledger (min-width: 560px) {
		.genre {
			display: inline;
		}
	}
	.dub {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}
	.mal {
		grid-area: mal;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		color: var(--color-warning);
		align-self: start;
	}
	.mal .num {
		color: var(--color-text-primary);
	}
	.k {
		font-size: 11px;
		color: var(--color-text-muted);
	}
	.chips {
		grid-area: chips;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-self: start;
		margin-top: 2px;
		/* chips are 36px visible / 44px hit: keep rows from touching */
		padding: 4px 0;
	}
	.prog {
		grid-area: prog;
		margin-top: 6px;
	}
	.upd {
		display: none;
		grid-area: upd;
		font-size: 12px;
		color: var(--color-text-muted);
		text-align: right;
	}

	/* tablet: identity left, stepper right */
	@container ledger (min-width: 560px) {
		.row {
			grid-template-columns: 56px minmax(0, 1fr) 232px;
			grid-template-areas:
				'cover main  prog'
				'cover mal   prog'
				'cover chips prog';
			column-gap: 18px;
		}
		.prog {
			margin: 0;
			align-self: center;
			grid-row: 1 / 4;
		}
	}

	/* desktop: one aligned table row, columns shared with the sticky header */
	@container ledger (min-width: 880px) {
		.row {
			grid-template-columns: var(--cols);
			grid-template-areas: 'cover main prog mal you stat upd';
			gap: 0 16px;
			padding: 10px 12px;
			margin: 0 -12px;
			border-radius: var(--radius-m);
			border-bottom-color: transparent;
			position: relative;
		}
		.row::after {
			content: '';
			position: absolute;
			left: 12px;
			right: 12px;
			bottom: 0;
			height: 1px;
			background: var(--color-border);
		}
		.row:hover {
			background: var(--color-surface-1);
		}
		.chips {
			display: contents;
		}
		.you {
			grid-area: you;
		}
		.stat {
			grid-area: stat;
		}
		.prog {
			grid-row: auto;
		}
		.mal {
			align-self: center;
		}
		.main {
			align-self: center;
		}
		.upd {
			display: block;
		}
		.title :global(h2) {
			-webkit-line-clamp: 1;
			line-clamp: 1;
		}
	}
</style>
