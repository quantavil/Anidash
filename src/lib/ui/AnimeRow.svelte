<script lang="ts">
	import type { UserListRecord } from '#lib/cache/db.js';
	import { formatMediaType } from '#lib/utils/format.js';
	import { Star } from 'lucide-svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ProgressLine from './ProgressLine.svelte';
	import EpisodeCounter from './EpisodeCounter.svelte';
	import AnimeRowShell from './AnimeRowShell.svelte';

	// List-view counterpart of AnimeCard.
	let { entry, index = 0 }: { entry: UserListRecord; index?: number } = $props();

	const meta = $derived(
		[
			entry.mediaType ? formatMediaType(entry.mediaType) : '',
			entry.startSeason?.year ? String(entry.startSeason.year) : '',
			entry.numEpisodes > 0 ? `${entry.numEpisodes} eps` : ''
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<AnimeRowShell
	malId={entry.malId}
	title={entry.title}
	titleEnglish={entry.titleEnglish ?? null}
	image={entry.mainPicture?.large ?? entry.mainPicture?.medium ?? null}
	{index}
	{meta}
	mean={entry.mean}
	members={entry.numListUsers}
	genres={entry.genres.map((g) => g.name)}
>
	{#snippet cover()}
		<ProgressLine watched={entry.numWatchedEpisodes} total={entry.numEpisodes} />
	{/snippet}
	{#snippet status()}
		<StatusBadge malId={entry.malId} status={entry.status} />
	{/snippet}
	{#snippet stats()}
		{#if entry.score > 0}
			<span
				class="flex items-center gap-1 rounded border border-primary/30 bg-primary/15 px-1.5 font-semibold text-text-primary"
				title="Your score"
			>
				<Star size={10} class="text-warning" fill="currentColor" />{entry.score}
			</span>
		{/if}
	{/snippet}
	{#snippet actions()}
		<div class="relative z-[2] mt-auto pt-1">
			<EpisodeCounter
				malId={entry.malId}
				watched={entry.numWatchedEpisodes}
				total={entry.numEpisodes}
				inline
			/>
		</div>
	{/snippet}
</AnimeRowShell>
