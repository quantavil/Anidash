<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { sortEntries } from '$lib/utils/sort';
	import { ArrowUpRight, Star, Bookmark } from 'lucide-svelte';
	import AnimeTitle from './AnimeTitle.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	const planned = $derived(
		sortEntries(
			userListStore.allEntries.filter((e) => e.status === 'plan_to_watch'),
			'updated'
		).slice(0, 2)
	);
	const counts = $derived(userListStore.statusCounts);
</script>

<aside class="collection-shelf" aria-label="Your collection">
	<section class="planned-shelf">
		<div class="shelf-heading"><Bookmark size={15} /><span>Saved for later</span></div>
		<h2>Your next story</h2>
		{#if planned.length > 0}
			<div class="shelf-posters">
				{#each planned as entry (entry.malId)}<a href="/anime/{entry.malId}" class="shelf-poster"
						><ImageWithFallback
							src={entry.mainPicture?.medium ?? entry.mainPicture?.large}
							alt={entry.title}
							aspectRatio="2/3"
						/><AnimeTitle
							title={entry.title}
							titleEnglish={entry.titleEnglish}
							interactive={false}
							tag="h3"
						/>{#if entry.mean != null}<span class="shelf-score"
								><Star size={11} fill="currentColor" />{entry.mean.toFixed(2)}
								<span>MAL</span></span
							>{/if}</a
					>{/each}
			</div>
			<a class="shelf-link" href="/?tab=plan_to_watch"
				>Your planned list <ArrowUpRight size={15} /></a
			>
		{:else}<p class="shelf-empty">
				A little room for your next favourite. Find a series and save it for later.
			</p>
			<a class="shelf-link" href="/browse">Find your next series <ArrowUpRight size={15} /></a>{/if}
	</section>
	<section class="collection-summary">
		<span class="summary-label">Your collection, so far</span>
		<div class="collection-numbers">
			<a href="/?tab=completed"><strong>{counts.completed ?? 0}</strong><span>Completed</span></a><a
				href="/?tab=plan_to_watch"
				><strong>{counts.plan_to_watch ?? 0}</strong><span>Planned</span></a
			><a href="/?tab=on_hold"><strong>{counts.on_hold ?? 0}</strong><span>On hold</span></a>
		</div>
		<a class="shelf-link" href="/stats">A closer look at your stats <ArrowUpRight size={14} /></a>
	</section>
</aside>

<style>
	.collection-shelf {
		min-width: 0;
	}
	.planned-shelf {
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 14px;
		background: linear-gradient(155deg, var(--color-surface-2), var(--color-surface-1));
		box-shadow:
			inset 0 1px 0 #ffffff09,
			0 8px 24px #0002;
	}
	.shelf-heading {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--color-text-secondary);
		font-size: 12px;
	}
	h2 {
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 550;
		letter-spacing: -0.025em;
		line-height: 1.2;
		margin: 14px 0 24px;
	}
	.shelf-posters {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}
	.shelf-poster {
		min-width: 0;
	}
	.shelf-poster :global(.relative) {
		border-radius: 7px;
		box-shadow: 0 8px 14px #0004;
	}
	.shelf-poster :global(h3) {
		margin-top: 12px;
		font-size: 13px;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}
	.shelf-poster:hover :global(h3) {
		color: var(--color-primary);
	}
	.shelf-score {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--color-warning);
		font-size: 12px;
		margin-top: 7px;
	}
	.shelf-score span {
		color: var(--color-text-secondary);
		font-size: 10px;
	}
	.shelf-link {
		min-height: 44px;
		display: flex;
		gap: 8px;
		align-items: center;
		color: var(--color-primary);
		font-size: 12px;
		margin-top: 16px;
	}
	.collection-summary {
		padding: 28px 8px;
	}
	.summary-label {
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.collection-numbers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-top: 16px;
	}
	.collection-numbers a {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.collection-numbers strong {
		font-family: var(--font-display);
		font-size: 32px;
		font-weight: 550;
	}
	.collection-numbers span {
		font-size: 11px;
		color: var(--color-text-secondary);
	}
	.shelf-empty {
		font-size: 14px;
		color: var(--color-text-secondary);
		line-height: 1.6;
	}
	@media (min-width: 641px) and (max-width: 1100px) {
		.collection-shelf {
			display: grid;
			grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
			gap: 28px;
			margin-top: 28px;
		}
		.planned-shelf {
			padding: 22px;
		}
		.shelf-posters {
			max-width: 320px;
		}
	}
	@media (max-width: 640px) {
		.collection-shelf {
			margin-top: 28px;
		}
		.planned-shelf {
			padding: 20px;
		}
		h2 {
			font-size: 22px;
		}
		.shelf-posters {
			gap: 16px;
		}
	}
</style>
