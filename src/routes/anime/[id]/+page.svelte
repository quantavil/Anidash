<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	import { getAnimeDetail } from '$lib/api/mal';
	import { loadAnilistMedia } from '$lib/api/anilist';
	import { mapAnilistToEnriched } from '$lib/utils/types';
	import { putAnime, getAnimeAllowStale } from '$lib/cache/anime.cache';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import type { DetailedAnimeRecord } from '$lib/cache/db';
	import type { AnilistEnriched } from '$lib/utils/types';

	import {
		formatMediaType,
		formatAiringStatus,
		formatSeason,
		formatLocalBroadcast,
		formatNumberShort,
		formatCharacterName
	} from '$lib/utils/format';
	import ReviewText from '$lib/ui/ReviewText.svelte';
	import { Film, Star, ExternalLink, Calendar, Tv, Users, Clock, Plus, Mic } from 'lucide-svelte';
	import { dubStore } from '$lib/stores/dub.svelte';

	import ExternalSitesRow from '$lib/ui/ExternalSitesRow.svelte';

	import AnimeTitle from '$lib/ui/AnimeTitle.svelte';
	import StatusBadge from '$lib/ui/StatusBadge.svelte';
	import EpisodeCounter from '$lib/ui/EpisodeCounter.svelte';
	import ScoreInput from '$lib/ui/ScoreInput.svelte';
	import GenreBadge from '$lib/ui/GenreBadge.svelte';
	import AddToListModal from '$lib/ui/AddToListModal.svelte';
	import CharacterDetailModal from '$lib/ui/CharacterDetailModal.svelte';
	import AnimeDetailSkeleton from '$lib/ui/skeletons/AnimeDetailSkeleton.svelte';
	import ImageWithFallback from '$lib/ui/ImageWithFallback.svelte';
	import ProgressLine from '$lib/ui/ProgressLine.svelte';

	const malId = $derived(Number(page.params.id));

	// ─── State ───

	let anime = $state.raw<DetailedAnimeRecord | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const listEntry = $derived(userListStore.getEntry(malId));
	const inList = $derived(listEntry !== undefined);

	// ─── Tab Data (loaded in background) ───
	let characters = $state.raw<AnilistEnriched['characters']>([]);
	let charactersLoading = $state(false);
	let charactersError = $state<string | null>(null);

	let recommendations = $state.raw<AnilistEnriched['recommendations']>([]);
	let recsLoading = $state(false);
	let recsError = $state<string | null>(null);

	let anilistEnriched = $state.raw<AnilistEnriched | null>(null);

	// ─── Modals ───

	let showAddModal = $state(false);
	let showCharacterModal = $state(false);
	let selectedCharacter = $state<AnilistEnriched['characters'][number] | null>(null);

	// ─── Read More / Expansion States ───

	let expandedSynopsis = $state(false);
	let expandedCharacters = $state(false);

	// ─── Derived Grid Data ───

	const relatedGrouped = $derived(
		anime?.relatedAnime && anime.relatedAnime.length > 0
			? anime.relatedAnime.reduce(
					(acc, r) => {
						const type = r.relationType.replace(/_/g, ' ');
						if (!acc[type]) acc[type] = [];
						acc[type].push(r);
						return acc;
					},
					{} as Record<string, typeof anime.relatedAnime>
				)
			: null
	);

	const displayedCharacters = $derived(expandedCharacters ? characters : characters.slice(0, 12));

	// ─── Load Anime Detail ───

	async function loadAnime(id: number) {
		loading = true;
		error = null;

		// Try cache first (stale-while-revalidate)
		const cached = await getAnimeAllowStale(id);
		if (id !== Number(page.params.id)) return;

		if (cached && cached.type === 'detail') {
			anime = cached;
			loading = false;
		}

		// Fetch fresh data
		const result = await getAnimeDetail(id);
		if (id !== Number(page.params.id)) return;

		if (result.ok) {
			anime = result.value;
			await putAnime($state.snapshot(result.value));
		} else if (!cached) {
			error = result.error.message || 'Failed to load anime';
		}

		loading = false;
	}

	// ─── Background Fetch Data (AniList primary) ───

	async function loadAnilistData(id: number) {
		charactersLoading = true;
		recsLoading = true;
		charactersError = null;
		recsError = null;

		const result = await loadAnilistMedia(id);
		if (id !== Number(page.params.id)) return;

		if (result.ok) {
			// `null` = no AniList entry for this MAL id: show empty (no title-search fallback).
			const enriched = result.value ? mapAnilistToEnriched(result.value) : null;
			anilistEnriched = enriched;
			characters = enriched?.characters ?? [];
			recommendations = enriched?.recommendations ?? [];
		} else {
			charactersError = 'Failed to load characters';
			recsError = 'Failed to load recommendations';
		}
		charactersLoading = false;
		recsLoading = false;
	}

	// ─── Lifecycle ───

	// Load anime and AniList enrichment in parallel when route changes
	$effect(() => {
		const id = Number(page.params.id);
		const currentMalId = untrack(() => anime?.malId);

		if (id && id !== currentMalId) {
			untrack(() => {
				anime = null;
				anilistEnriched = null;
				recommendations = [];
				characters = [];
				charactersError = null;
				recsError = null;
				expandedSynopsis = false;
				expandedCharacters = false;

				// Reset loading states for the new ID
				loading = true;
				charactersLoading = false;
				recsLoading = false;

				loadAnime(id);
				loadAnilistData(id);
			});
		}
	});

	function handleCharacterClick(entry: AnilistEnriched['characters'][number]) {
		selectedCharacter = entry;
		showCharacterModal = true;
	}

	const STATUS_COLORS: Record<string, string> = {
		currently_airing: 'text-success',
		finished_airing: 'text-info',
		not_yet_aired: 'text-warning'
	};

	// Derived from airingAt (not AniList's timeUntilAiring) so cached entries stay accurate.
	const hoursUntilNextAiring = $derived.by(() => {
		const airing = anilistEnriched?.nextAiring;
		if (!airing) return null;
		const hours = Math.floor((airing.airingAt * 1000 - Date.now()) / 3_600_000);
		return hours > 0 ? hours : null;
	});

	const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
	const safeTrailerId = $derived.by(() => {
		const raw = anilistEnriched?.trailer?.id?.trim() ?? '';
		if (anilistEnriched?.trailer?.site !== 'youtube' || !raw) return null;
		return YT_ID_RE.test(raw) ? raw : null;
	});
</script>

<svelte:head>
	<title>{anime?.title ? `${anime.title} | AniDash` : 'AniDash'}</title>
</svelte:head>

{#if loading && !anime}
	<AnimeDetailSkeleton />
{:else if error}
	<div class="mx-auto max-w-5xl px-4 py-16 text-center">
		<p class="text-lg text-error">{error}</p>
		<button
			onclick={() => loadAnime(malId)}
			class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
		>
			Retry
		</button>
	</div>
{:else if anime}
	<div class="mx-auto max-w-5xl px-4 py-6 overflow-x-hidden">
		<!-- ─── Header ─── -->
		<div class="flex flex-col gap-6 sm:flex-row">
			<!-- Cover -->
			<div
				class="shrink-0 w-full sm:w-[200px] relative rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden border border-white/5 max-h-[320px] sm:max-h-none"
			>
				<ImageWithFallback
					src={anime.mainPicture?.large ?? anime.mainPicture?.medium}
					alt={anime.title}
					class="w-full sm:w-[200px] h-full object-cover"
				/>
				{#if listEntry}
					<ProgressLine watched={listEntry.numWatchedEpisodes} total={listEntry.numEpisodes} />
				{/if}
				{#if dubStore.hasDub(anime.malId)}
					<div
						class="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/95 text-white backdrop-blur-md shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-white/20"
						title="Dubbed"
					>
						<Mic size={14} fill="currentColor" />
					</div>
				{/if}
			</div>

			<!-- Info -->
			<div class="flex-1">
				<div
					class="flex items-center gap-2 text-2xl font-bold leading-tight text-text-primary sm:text-3xl"
				>
					<AnimeTitle
						title={anime.title}
						titleEnglish={anime.titleEnglish ?? null}
						tag="span"
						class=""
					/>
				</div>

				<!-- Quick stats row -->
				<div
					class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary max-w-full overflow-hidden [&>div+div]:before:content-['•'] [&>div+div]:before:text-white/20 [&>div+div]:before:mr-3"
				>
					{#if anime.mean}
						<div
							class="flex items-center gap-1 shrink-0"
							title={anime.numScoringUsers
								? anime.numScoringUsers.toLocaleString() + ' users scored this'
								: ''}
						>
							<Star size={16} class="text-warning" fill="currentColor" />
							<span class="font-semibold text-text-primary">{anime.mean.toFixed(1)}</span>
						</div>
					{/if}
					{#if anime.numListUsers}
						<div class="flex items-center gap-1 shrink-0">
							<Users size={14} class="text-text-muted" />
							<span class="font-semibold text-text-primary"
								>{formatNumberShort(anime.numListUsers)}</span
							>
						</div>
					{/if}
					{#if anime.mediaType}
						<div class="flex items-center gap-1 shrink-0">
							<Tv size={14} class="text-text-muted" />
							{formatMediaType(anime.mediaType)}
						</div>
					{/if}
					{#if anime.numEpisodes > 0}
						<div class="flex items-center gap-1 shrink-0">
							<Film size={14} class="text-text-muted" />
							{anime.numEpisodes} eps
						</div>
					{/if}
					{#if anime.animeStatus}
						<div
							class="flex items-center gap-1 shrink-0 {STATUS_COLORS[anime.animeStatus] ??
								'text-text-muted'}"
						>
							<span>{formatAiringStatus(anime.animeStatus)}</span>
						</div>
					{/if}
					{#if anime.startSeason}
						<div class="flex items-center gap-1 shrink-0 text-text-muted">
							<Calendar size={12} />
							{formatSeason(anime.startSeason.year, anime.startSeason.season)}
						</div>
					{/if}
				</div>

				<!-- Studios & Broadcast row -->
				<div
					class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted max-w-full overflow-hidden [&>div+div]:before:content-['•'] [&>div+div]:before:text-white/20 [&>div+div]:before:mr-3"
				>
					{#if anime.studios.length > 0}
						<div class="flex items-center gap-1 min-w-0">
							<Users size={12} class="shrink-0" />
							<span class="truncate">{anime.studios.map((s) => s.name).join(', ')}</span>
						</div>
					{/if}
					{#if anime.broadcast?.day_of_the_week}
						<div class="flex items-center gap-1 shrink-0">
							<Clock size={12} />
							{anime.animeStatus === 'finished_airing' ? 'Aired' : 'Airs'}
							<span
								>{formatLocalBroadcast(
									anime.broadcast.day_of_the_week,
									anime.broadcast.start_time
								)}</span
							>
						</div>
					{/if}
				</div>

				<!-- Genres -->
				{#if anime.genres.length > 0}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each anime.genres as genre (genre.id)}
							<GenreBadge name={genre.name} />
						{/each}
					</div>
				{/if}

				<!-- ─── User List Controls ─── -->
				<div
					class="detail-controls mt-5 rounded-2xl border border-white/10 bg-surface-2 p-4 relative z-20"
				>
					{#if inList && listEntry}
						<!-- Responsive layout: side-by-side on large screens, stacked on mobile -->
						<div class="tracking-layout">
							<!-- Left Side: Status & Progress -->
							<div class="tracking-progress">
								<div class="tracking-summary">
									<!-- Status -->
									<div class="flex flex-col">
										<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">
											Status
										</span>
										<div class="mt-1.5 flex">
											<StatusBadge
												{malId}
												status={listEntry.status}
												showLabel={true}
												class="min-h-11 min-w-11 px-3 text-xs !rounded-lg flex items-center justify-center"
											/>
										</div>
									</div>

									<!-- Progress Counter -->
									<div class="flex flex-col items-end">
										<span
											class="text-[10px] font-bold uppercase tracking-wider text-text-muted text-right"
										>
											Episodes Watched
										</span>
										<div class="mt-1 flex justify-end">
											<EpisodeCounter
												{malId}
												watched={listEntry.numWatchedEpisodes}
												total={listEntry.numEpisodes}
											/>
										</div>
									</div>
								</div>

								<!-- Custom Progress Bar -->
								{#if listEntry.numEpisodes > 0}
									{@const pct = Math.min(
										(listEntry.numWatchedEpisodes / listEntry.numEpisodes) * 100,
										100
									)}
									<div
										class="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5"
									>
										<div
											class="h-full bg-primary rounded-full transition-[width] duration-150"
											style="width: {pct}%"
										></div>
									</div>
								{/if}
							</div>

							<div class="tracking-rating">
								<ScoreInput {malId} score={listEntry.score} />
							</div>
						</div>
					{:else}
						<button
							onclick={() => (showAddModal = true)}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
						>
							<Plus size={16} />
							Add to My List
						</button>
					{/if}
				</div>

				<!-- External Links -->
				<div class="mt-4 flex flex-wrap items-center gap-2">
					<a
						href="https://myanimelist.net/anime/{malId}"
						target="_blank"
						rel="noopener noreferrer"
						class="ext-link shrink-0"
						style="--site-color: var(--color-primary)"
					>
						<ExternalLink size={12} />
						<span class="font-bold tracking-wide">MAL</span>
					</a>
					<ExternalSitesRow animeTitle={anime.title} />
				</div>
			</div>
		</div>

		<!-- ─── Scrollable Page Sections ─── -->
		<div class="mt-8 space-y-8">
			<!-- Section 1: Overview (Synopsis) -->
			<div class="space-y-4">
				{#if anime.synopsis}
					<div
						class="rounded-xl border border-white/5 bg-surface-1/40 p-5 relative overflow-hidden"
					>
						<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
							Synopsis
						</h3>
						<p
							class="text-sm leading-relaxed text-text-secondary transition-all duration-300 {expandedSynopsis
								? ''
								: 'line-clamp-4'}"
						>
							{anime.synopsis}
						</p>
						{#if anime.synopsis.length > 280}
							<button
								onclick={() => (expandedSynopsis = !expandedSynopsis)}
								class="mt-3 text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 active:scale-95 transition-transform"
							>
								{expandedSynopsis ? 'Show Less ↑' : 'Read More ↓'}
							</button>
						{/if}
					</div>
				{/if}
			</div>

			<!-- AniList Enrichment: Trailer / Airing / Tags -->
			{#if anilistEnriched}
				{#if safeTrailerId}
					<div class="rounded-xl border border-white/5 bg-surface-1/40 p-4">
						<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Trailer</h3>
						<div class="aspect-video overflow-hidden rounded-lg">
							<iframe
								src="https://www.youtube.com/embed/{safeTrailerId}"
								title="Trailer"
								class="h-full w-full"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowfullscreen
								loading="lazy"
								referrerpolicy="strict-origin-when-cross-origin"
							></iframe>
						</div>
					</div>
				{/if}
				{#if anilistEnriched.nextAiring}
					<div
						class="rounded-xl border border-white/5 bg-surface-1/40 p-4 flex flex-wrap items-center gap-x-3 gap-y-1"
					>
						<span class="text-xs font-bold uppercase tracking-wider text-text-muted shrink-0"
							>Next Episode</span
						>
						<span class="text-sm text-text-primary shrink-0"
							>EP {anilistEnriched.nextAiring.episode}</span
						>
						<span class="text-xs text-text-muted min-w-0 break-words">
							{new Date(anilistEnriched.nextAiring.airingAt * 1000).toLocaleString()}
							{#if hoursUntilNextAiring !== null}
								· {hoursUntilNextAiring}h left
							{/if}
						</span>
					</div>
				{/if}
				{#if anilistEnriched.tagsRanked.length > 0}
					<div class="rounded-xl border border-white/5 bg-surface-1/40 p-4">
						<h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Tags</h3>
						<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable region needs keyboard access.) -->
						<div class="tag-list" role="region" aria-label="Anime tags" tabindex="0">
							{#each anilistEnriched.tagsRanked as t (t.name)}
								<span
									class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-text-secondary max-w-full break-all"
									>{t.name}
									{#if t.rank !== null}<span class="text-text-muted">{t.rank}%</span>{/if}</span
								>
							{/each}
						</div>
					</div>
				{/if}
			{/if}

			<!-- Section 2: Related Anime -->
			{#if relatedGrouped}
				<div class="space-y-4">
					<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">
						Related Anime
					</h3>
					<div class="space-y-4">
						{#each Object.entries(relatedGrouped) as [type, items] (type)}
							<div>
								<h4 class="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
									{type}
								</h4>
								<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{#each items as item (item.id)}
										<a
											href="/anime/{item.id}"
											class="group flex flex-col gap-1.5 rounded-xl border border-white/5 bg-surface-1/40 p-2 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
										>
											<div class="relative aspect-[3/4] overflow-hidden rounded-lg">
												<ImageWithFallback
													src={item.mainPicture?.medium}
													alt={item.title}
													class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
												/>
											</div>
											<div class="min-w-0">
												<p
													class="truncate text-xs font-semibold text-text-primary group-hover:text-primary transition-colors"
												>
													{item.title}
												</p>
												{#if item.mediaType}
													<p class="text-[10px] text-text-muted">
														{formatMediaType(item.mediaType)}
													</p>
												{/if}
											</div>
										</a>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- AniList recommendations share the existing detail enrichment request. -->
			{#if recommendations.length > 0 || recsLoading || recsError}
				<section class="recommendation-section" aria-label="Recommendations">
					<div class="recommendation-heading">
						<h3>Recommendations</h3>
						<span>From AniList</span>
					</div>
					{#if recsLoading}
						<div class="recommendation-grid" aria-busy="true" aria-label="Loading recommendations">
							{#each Array(6) as _, i (i)}<div
									class="recommendation-placeholder animate-pulse"
								></div>{/each}
						</div>
					{:else if recsError}
						<div class="recommendation-error">
							<p>{recsError}</p>
							<button onclick={() => loadAnilistData(Number(page.params.id))}>Retry</button>
						</div>
					{:else}
						<div class="recommendation-grid">
							{#each recommendations as rec (rec.id)}
								{@const external = !rec.idMal}
								<a
									class="recommendation-card"
									href={rec.idMal ? `/anime/${rec.idMal}` : `https://anilist.co/anime/${rec.id}`}
									target={external ? '_blank' : undefined}
									rel={external ? 'noopener noreferrer' : undefined}
									title={rec.title}
								>
									<div class="recommendation-cover">
										<ImageWithFallback src={rec.cover} alt="" class="h-full w-full" />
									</div>
									<div class="recommendation-copy">
										<h4>{rec.title}</h4>
										<div class="recommendation-meta">
											{#if rec.rating !== null}<span
													title="AniList community recommendation support, not an anime score"
													>Support {rec.rating}</span
												>{/if}
											{#if external}<span
													class="recommendation-external"
													aria-label="Opens AniList in a new tab"><ExternalLink size={14} /></span
												>{/if}
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</section>
			{/if}

			<!-- Section 4: Characters -->
			{#if charactersLoading}
				<div class="space-y-3">
					<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">Characters</h3>
					<div class="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
						{#each Array(8) as _, _idx (_idx)}
							<div class="flex items-center gap-2 rounded-xl bg-surface-1 p-2">
								<div class="h-10 w-10 animate-pulse rounded-full bg-surface-2"></div>
								<div class="space-y-1">
									<div class="h-3 w-16 animate-pulse rounded bg-surface-2"></div>
									<div class="h-2.5 w-10 animate-pulse rounded bg-surface-2"></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if charactersError}
				<div class="space-y-3">
					<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">Characters</h3>
					<div class="rounded-xl border border-white/5 bg-surface-1/40 p-4 text-center">
						<p class="text-xs text-text-muted">{charactersError}</p>
						<button
							onclick={() => loadAnilistData(Number(page.params.id))}
							class="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
						>
							Retry
						</button>
					</div>
				</div>
			{:else if characters.length > 0}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">
							Characters
						</h3>
						<span class="text-xs text-text-muted">({characters.length} total)</span>
					</div>
					<div class="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
						{#each displayedCharacters as entry (entry.id)}
							<button
								type="button"
								onclick={() => handleCharacterClick(entry)}
								class="w-full flex items-center gap-2 rounded-xl border border-white/5 bg-surface-1/40 p-2 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:bg-white/10"
							>
								<ImageWithFallback
									src={entry.image}
									alt={entry.name}
									aspectRatio="1/1"
									fallbackIcon="user"
									class="h-10 w-10 shrink-0 rounded-full"
								/>
								<div class="min-w-0 flex-1">
									<p
										class="truncate text-xs font-semibold text-text-primary"
										title={formatCharacterName(entry.name)}
									>
										{formatCharacterName(entry.name)}
									</p>
									<p class="text-[10px] capitalize text-text-muted truncate">{entry.role}</p>
									{#if entry.favourites}
										<p class="mt-0.5 text-[9px] text-text-muted">
											♥ {entry.favourites.toLocaleString()}
										</p>
									{/if}
									{#if entry.voiceActor}
										<p class="text-[9px] text-text-muted truncate">VA: {entry.voiceActor}</p>
									{/if}
								</div>
							</button>
						{/each}
					</div>
					{#if characters.length > 12}
						<button
							onclick={() => (expandedCharacters = !expandedCharacters)}
							class="mt-2 text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 active:scale-95 transition-transform"
						>
							{expandedCharacters
								? 'Show Fewer Characters ↑'
								: `Show All ${characters.length} Characters ↓`}
						</button>
					{/if}
				</div>
			{/if}

			<!-- AniList Reviews (if available) -->
			{#if anilistEnriched?.reviews && anilistEnriched.reviews.length > 0}
				<div class="space-y-3">
					<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">Reviews</h3>
					<div class="grid gap-3 md:grid-cols-2">
						{#each anilistEnriched.reviews.slice(0, 4) as r, i (i)}
							<div
								class="rounded-xl border border-white/5 bg-surface-1/40 p-4 min-w-0 overflow-hidden"
							>
								<div class="flex items-center justify-between gap-2 min-w-0">
									<p class="truncate text-xs font-semibold text-text-primary min-w-0">
										{r.summary ?? 'Review'}
									</p>
									{#if r.rating}<span class="text-xs font-bold text-warning shrink-0"
											>★ {r.rating}</span
										>{/if}
								</div>
								{#if r.body}<ReviewText body={r.body} />{/if}
								{#if r.user}<p class="mt-2 text-[10px] text-text-muted">— {r.user}</p>{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Add to List Modal -->
<AddToListModal
	open={showAddModal}
	onOpenChange={(v) => (showAddModal = v)}
	{malId}
	title={anime?.title ?? ''}
	titleEnglish={anime?.titleEnglish ?? null}
	picture={anime?.mainPicture?.large ?? anime?.mainPicture?.medium ?? null}
	mean={anime?.mean ?? null}
	mediaType={anime?.mediaType ?? ''}
	numEpisodes={anime?.numEpisodes ?? 0}
	genres={anime?.genres ?? []}
/>

<!-- Character Detail Modal -->
<CharacterDetailModal bind:open={showCharacterModal} entry={selectedCharacter} />

<style>
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 6px;
		max-height: 128px;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		scrollbar-gutter: stable;
		padding-right: 4px;
	}
	@media (min-width: 640px) {
		.tag-list {
			max-height: 160px;
		}
	}

	.recommendation-section {
		min-width: 0;
	}
	.recommendation-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}
	.recommendation-heading h3 {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.recommendation-heading > span {
		flex-shrink: 0;
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.recommendation-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
	.recommendation-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		overflow: hidden;
		background: var(--color-surface-1);
		transition:
			border-color 140ms,
			background-color 140ms;
	}
	.recommendation-card:hover {
		border-color: var(--color-primary);
		background: var(--color-surface-2);
	}
	.recommendation-cover {
		aspect-ratio: 3 / 4;
		overflow: hidden;
		background: var(--color-surface-2);
	}
	.recommendation-copy {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
	}
	.recommendation-copy h4 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		overflow-wrap: anywhere;
		min-height: 2.8em;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.4;
		color: var(--color-text-primary);
	}
	.recommendation-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		margin-top: auto;
		min-height: 18px;
		color: var(--color-text-secondary);
		font-size: 11px;
	}
	.recommendation-external {
		margin-left: auto;
	}
	.recommendation-placeholder {
		aspect-ratio: 3 / 5;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface-2);
	}
	.recommendation-error {
		padding: 16px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		color: var(--color-text-secondary);
		font-size: 13px;
	}
	.recommendation-error button {
		min-height: 44px;
		min-width: 44px;
		margin-top: 8px;
		color: var(--color-primary-hover);
		cursor: pointer;
	}
	@media (min-width: 640px) {
		.recommendation-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 1100px) {
		.recommendation-grid {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	.tracking-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(268px, 0.85fr);
		gap: 24px;
		align-items: center;
	}
	.tracking-summary {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.tracking-summary > div {
		min-width: 100px;
	}
	.tracking-progress {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}
	.tracking-rating {
		min-width: 0;
		padding-left: 24px;
		border-left: 1px solid var(--color-border);
	}
	@media (max-width: 1100px) {
		.tracking-layout {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.tracking-rating {
			padding-left: 0;
			padding-top: 20px;
			border-left: 0;
			border-top: 1px solid var(--color-border);
		}
	}
	@media (max-width: 380px) {
		.detail-controls {
			padding: 12px 8px;
		}
	}
</style>
