<script lang="ts">
	import type { DisplayAnime } from '#lib/utils/types.js';
	import { userListStore } from '#lib/stores/userlist.svelte.js';
	import { formatMediaType } from '#lib/utils/format.js';
	import StatusBadge from './StatusBadge.svelte';
	import AddToListButton from './AddToListButton.svelte';
	import AnimeRowShell from './AnimeRowShell.svelte';

	// List-view counterpart of SearchResultCard.
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
</script>

{#snippet statusControl()}
	{#if listEntry}
		<StatusBadge malId={listEntry.malId} status={listEntry.status} />
	{/if}
{/snippet}

{#snippet addButton()}
	<AddToListButton {anime} class="mt-auto min-h-8 w-fit px-3 py-1" />
{/snippet}

<AnimeRowShell
	malId={anime.malId}
	title={anime.title}
	titleEnglish={anime.titleEnglish}
	image={anime.mainPicture}
	{index}
	{meta}
	mean={anime.mean}
	members={anime.numListUsers}
	genres={anime.genres}
	status={listEntry ? statusControl : undefined}
	actions={listEntry ? undefined : addButton}
/>
