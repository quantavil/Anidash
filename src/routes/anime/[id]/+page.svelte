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
	import { formatReviewExcerpt } from '$lib/utils/review-text';
	import { Film, Star, ExternalLink, Calendar, Tv, Users, Clock, Plus, Mic } from 'lucide-svelte';
	import { dubStore } from '$lib/stores/dub.svelte';

	import ExternalSitesRow from '$lib/ui/ExternalSitesRow.svelte';

	import AnimeTitle from '$lib/ui/AnimeTitle.svelte';
	import StatusBadge from '$lib/ui/StatusBadge.svelte';
	import EpisodeStepper from '$lib/ui/EpisodeStepper.svelte';
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

	const hasRecommendations = $derived(
		(anime?.recommendations && anime.recommendations.length > 0) || recommendations.length > 0
	);

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
	<div class="detail-page">
		<!-- ─── Header ─── -->
		<div class="detail-header">
			<!-- Cover -->
			<div class="detail-cover">
				<ImageWithFallback
					src={anime.mainPicture?.large ?? anime.mainPicture?.medium}
					alt={anime.title}
					priority
					class="detail-poster"
				/>
				{#if listEntry}
					<ProgressLine watched={listEntry.numWatchedEpisodes} total={listEntry.numEpisodes} />
				{/if}
				{#if dubStore.hasDub(anime.malId)}
					<div
						class="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/95 text-white shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-white/20"
						title="Dubbed"
					>
						<Mic size={14} fill="currentColor" />
					</div>
				{/if}
			</div>

			<!-- Info -->
			<div class="detail-info">
				<div class="detail-summary">
					<h1 class="detail-title">
						<AnimeTitle
							title={anime.title}
							titleEnglish={anime.titleEnglish ?? null}
							tag="span"
							class=""
						/>
					</h1>

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
								<span class="font-semibold text-text-primary">{anime.mean.toFixed(2)}</span><span
									class="text-xs text-text-secondary">MAL community</span
								>
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
				</div>
				<section class="detail-controls" aria-label="Your tracking">
					{#if inList && listEntry}
						<div class="tracking-controls">
							<div class="tracking-top">
								<div>
									<span class="control-label">Your status</span><StatusBadge
										{malId}
										status={listEntry.status}
										showLabel
									/>
								</div>
								<span class="tracking-total"
									>{listEntry.numEpisodes > 0
										? `${listEntry.numEpisodes} episodes`
										: 'Episode total unknown'}</span
								>
							</div>
							<span class="control-label">Episodes watched</span>
							<EpisodeStepper
								{malId}
								title={anime.title}
								watched={listEntry.numWatchedEpisodes}
								total={listEntry.numEpisodes}
							/>
						</div>
						<div class="detail-score"><ScoreInput {malId} score={listEntry.score} /></div>
					{:else}
						<button onclick={() => (showAddModal = true)} class="primary-button detail-add"
							><Plus size={18} />Add to My List</button
						>
					{/if}
				</section>

				<!-- External Links -->
				<div class="detail-links">
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
							class="synopsis-copy text-sm leading-relaxed text-text-secondary transition-all duration-300 {expandedSynopsis
								? ''
								: 'line-clamp-4'}"
						>
							{anime.synopsis}
						</p>
						{#if anime.synopsis.length > 280}
							<button
								onclick={() => (expandedSynopsis = !expandedSynopsis)}
								class="mt-3 min-h-11 text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1"
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
						<div class="flex flex-wrap gap-1.5">
							{#each anilistEnriched.tagsRanked.slice(0, 20) as t (t.name)}
								<span
									class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-text-secondary max-w-full break-all"
									>{t.name} <span class="text-text-muted">{t.rank}%</span></span
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

			<!-- Section 3: Recommendations -->
			{#if hasRecommendations}
				<div class="space-y-4">
					<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">
						Recommendations
					</h3>

					<!-- MAL Recommendations -->
					{#if anime.recommendations && anime.recommendations.length > 0}
						<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
							{#each anime.recommendations.slice(0, 6) as rec (rec.id)}
								<a
									href="/anime/{rec.id}"
									class="group flex flex-col gap-1.5 rounded-xl border border-white/5 bg-surface-1/40 p-2 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
								>
									<div class="relative aspect-[3/4] overflow-hidden rounded-lg">
										<ImageWithFallback
											src={rec.mainPicture?.medium}
											alt={rec.title}
											class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
										{#if rec.mean}
											<div
												class="glass-badge absolute right-1.5 top-1.5 px-1.5 py-0.5 text-[9px] font-bold"
											>
												★ {rec.mean.toFixed(1)}
											</div>
										{/if}
									</div>
									<div class="min-w-0">
										<p
											class="truncate text-xs font-semibold text-text-primary group-hover:text-primary transition-colors"
										>
											{rec.title}
										</p>
										{#if rec.numRecommendations}
											<p class="text-[9px] text-text-muted">
												{rec.numRecommendations} user{rec.numRecommendations === 1 ? '' : 's'}
											</p>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					{/if}

					<!-- Community Recommendations -->
					{#if recsLoading}
						<div class="grid gap-3 sm:grid-cols-2">
							{#each Array(2) as _, _idx (_idx)}
								<div class="h-28 animate-pulse rounded-xl bg-surface-1"></div>
							{/each}
						</div>
					{:else if recsError}
						<div class="rounded-xl border border-white/5 bg-surface-1/40 p-4 text-center">
							<p class="text-xs text-text-muted">{recsError}</p>
							<button
								onclick={() => loadAnilistData(Number(page.params.id))}
								class="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-white/10 active:scale-95"
							>
								Retry
							</button>
						</div>
					{:else if recommendations.length > 0}
						<div class="space-y-3">
							<h4 class="text-xs font-bold uppercase tracking-wider text-text-muted">
								AniList Recommendations
							</h4>
							<div class="grid gap-3 md:grid-cols-2">
								{#each recommendations.slice(0, 4) as rec (rec.id)}
									{@const href = rec.idMal
										? `/anime/${rec.idMal}`
										: `https://anilist.co/anime/${rec.id}`}
									{@const external = !rec.idMal}
									<div
										class="rounded-xl border border-white/5 bg-surface-1/30 p-3 flex gap-3 min-w-0"
									>
										<a
											{href}
											target={external ? '_blank' : undefined}
											rel={external ? 'noopener noreferrer' : undefined}
											class="shrink-0 h-20 w-14 overflow-hidden rounded-lg border border-white/5 shadow-md hover:opacity-85 transition-opacity"
										>
											<ImageWithFallback
												src={rec.cover}
												alt={rec.title}
												class="h-full w-full object-cover"
											/>
										</a>
										<div class="min-w-0 flex-1 flex flex-col justify-between">
											<div class="flex items-start justify-between gap-2 min-w-0 w-full">
												<a
													{href}
													target={external ? '_blank' : undefined}
													rel={external ? 'noopener noreferrer' : undefined}
													class="flex-1 min-w-0 truncate text-xs font-bold text-text-primary hover:text-primary transition-colors"
												>
													{rec.title}
												</a>
												{#if rec.rating}
													<span
														class="shrink-0 text-[9px] font-bold bg-surface-2 px-1.5 py-0.5 rounded text-text-muted"
														>★ {rec.rating}</span
													>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
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
								{#if r.body}<p
										class="mt-2 line-clamp-4 text-xs leading-relaxed text-text-secondary break-words [overflow-wrap:anywhere]"
									>
										{formatReviewExcerpt(r.body)}
									</p>{/if}
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
	.detail-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 40px 0 48px;
		min-width: 0;
	}
	.detail-header {
		display: grid;
		grid-template-columns: 230px minmax(0, 1fr);
		gap: 32px;
		align-items: start;
	}
	.detail-cover {
		position: relative;
		aspect-ratio: 2/3;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--color-border);
		background: var(--color-surface-1);
		box-shadow: 0 12px 32px #0007;
	}
	.detail-cover :global(.detail-poster) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.detail-info {
		min-width: 0;
	}
	.detail-title {
		font-size: clamp(28px, 3vw, 40px);
		line-height: 1.12;
		font-weight: 650;
		letter-spacing: -0.035em;
		overflow-wrap: anywhere;
		text-wrap: pretty;
	}
	.detail-controls {
		display: grid;
		grid-template-columns: minmax(190px, 1fr) minmax(250px, 1fr);
		gap: 24px;
		margin-top: 24px;
		padding: 20px;
		border: 1px solid var(--color-border);
		border-radius: 16px;
		background: linear-gradient(130deg, var(--color-surface-1), var(--color-surface-2));
		box-shadow: inset 0 1px 0 #ffffff06;
	}
	.tracking-controls {
		min-width: 0;
	}
	.tracking-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}
	.control-label {
		display: block;
		font-size: 12px;
		color: var(--color-text-secondary);
		margin-bottom: 8px;
	}
	.tracking-total {
		font-size: 12px;
		color: var(--color-text-secondary);
		text-align: right;
	}
	.detail-score {
		padding-left: 24px;
		border-left: 1px solid var(--color-border);
		min-width: 0;
	}
	.detail-add {
		grid-column: 1/-1;
		width: 100%;
	}
	.detail-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}
	.synopsis-copy {
		max-width: 80ch;
		font-size: 15px;
		line-height: 1.8;
	}
	.detail-page :global(h3) {
		font-size: 16px;
		font-weight: 550;
		letter-spacing: 0;
		text-transform: none;
		color: var(--color-text-primary);
	}
	@media (max-width: 1000px) {
		.detail-header {
			grid-template-columns: 180px minmax(0, 1fr);
			gap: 24px;
		}
		.detail-controls {
			grid-template-columns: 1fr;
			gap: 18px;
		}
		.detail-score {
			padding: 18px 0 0;
			border-left: 0;
			border-top: 1px solid var(--color-border);
		}
	}
	@media (max-width: 767px) {
		.detail-page {
			padding-top: 28px;
		}
		.detail-header {
			grid-template-columns: 112px minmax(0, 1fr);
			gap: 20px 16px;
		}
		.detail-info {
			display: contents;
		}
		.detail-title {
			font-size: 25px;
		}
		.detail-controls,
		.detail-links {
			grid-column: 1/-1;
			margin-top: 0;
		}
		.detail-controls {
			padding: 18px;
		}
		.detail-summary {
			min-width: 0;
		}
		.detail-summary :global(.shrink-0) {
			flex-shrink: 1;
			overflow-wrap: anywhere;
		}
		.detail-summary :global(.text-sm) {
			font-size: 12px;
		}
		.detail-summary :global(.text-xs) {
			font-size: 11px;
		}
		.detail-cover {
			border-radius: 10px;
		}
	}
	@media (max-width: 360px) {
		.detail-header {
			grid-template-columns: 88px minmax(0, 1fr);
			gap: 18px 12px;
		}
		.detail-title {
			font-size: 22px;
		}
		.detail-controls {
			padding: 14px;
		}
	}
</style>
