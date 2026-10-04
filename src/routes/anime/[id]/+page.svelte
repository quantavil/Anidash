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
	import StatusSelect from '$lib/ui/StatusSelect.svelte';
	import EpisodeStepper from '$lib/ui/EpisodeStepper.svelte';
	import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
	import EpisodeBar from '$lib/ui/EpisodeBar.svelte';
	import ScoreInput from '$lib/ui/ScoreInput.svelte';
	import GenreBadge from '$lib/ui/GenreBadge.svelte';
	import AddToListModal from '$lib/ui/AddToListModal.svelte';
	import CharacterDetailModal from '$lib/ui/CharacterDetailModal.svelte';
	import AnimeDetailSkeleton from '$lib/ui/skeletons/AnimeDetailSkeleton.svelte';
	import ImageWithFallback from '$lib/ui/ImageWithFallback.svelte';

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
	let showRemoveConfirm = $state(false);
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
		finished_airing: 'text-text-secondary',
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
	<div class="page text-center">
		<p class="text-lg text-error">{error}</p>
		<button class="btn btn-primary mt-4" onclick={() => loadAnime(malId)}>Retry</button>
	</div>
{:else if anime}
	<div class="page overflow-x-hidden">
		<!-- ─── Header ─── -->
		<div class="hero">
			<div class="cover poster">
				<ImageWithFallback
					src={anime.mainPicture?.large ?? anime.mainPicture?.medium}
					alt={anime.title}
					aspectRatio="2/3"
					priority
					class="w-full"
				/>
				{#if listEntry}
					<EpisodeBar
						class="cover-bar"
						watched={listEntry.numWatchedEpisodes}
						total={listEntry.numEpisodes}
					/>
				{/if}
				{#if dubStore.hasDub(anime.malId)}
					<span class="glass-badge dub" title="Dubbed"><Mic size={13} fill="currentColor" /></span>
				{/if}
			</div>

			<div class="info">
				<h1 class="title">
					<AnimeTitle
						title={anime.title}
						titleEnglish={anime.titleEnglish ?? null}
						tag="span"
						class=""
					/>
				</h1>

				<ul class="facts">
					{#if anime.mean}
						<li
							title={anime.numScoringUsers
								? anime.numScoringUsers.toLocaleString() + ' users scored this'
								: 'MyAnimeList community rating'}
						>
							<Star size={15} class="text-warning" fill="currentColor" />
							<strong class="num">{anime.mean.toFixed(2)}</strong>
							<span class="muted">MAL</span>
						</li>
					{/if}
					{#if anime.numListUsers}
						<li>
							<Users size={14} class="muted" /><span class="num"
								>{formatNumberShort(anime.numListUsers)}</span
							> <span class="muted">members</span>
						</li>
					{/if}
					{#if anime.mediaType}<li>
							<Tv size={14} class="muted" />{formatMediaType(anime.mediaType)}
						</li>{/if}
					{#if anime.numEpisodes > 0}<li>
							<Film size={14} class="muted" /><span class="num">{anime.numEpisodes}</span> eps
						</li>{/if}
					{#if anime.animeStatus}
						<li class={STATUS_COLORS[anime.animeStatus] ?? 'text-text-muted'}>
							{formatAiringStatus(anime.animeStatus)}
						</li>
					{/if}
					{#if anime.startSeason}
						<li>
							<Calendar size={14} class="muted" />{formatSeason(
								anime.startSeason.year,
								anime.startSeason.season
							)}
						</li>
					{/if}
				</ul>

				{#if anime.studios.length > 0 || anime.broadcast?.day_of_the_week}
					<p class="credits">
						{#if anime.studios.length > 0}<span class="min-w-0 truncate"
								>{anime.studios.map((s) => s.name).join(', ')}</span
							>{/if}
						{#if anime.broadcast?.day_of_the_week}<span
								><Clock size={12} class="inline -mt-0.5" />
								{anime.animeStatus === 'finished_airing' ? 'Aired' : 'Airs'}
								{formatLocalBroadcast(
									anime.broadcast.day_of_the_week,
									anime.broadcast.start_time
								)}</span
							>{/if}
					</p>
				{/if}

				{#if anime.genres.length > 0}
					<div class="genres">
						{#each anime.genres as genre (genre.id)}<GenreBadge name={genre.name} />{/each}
					</div>
				{/if}

				<!-- ─── Your list controls ─── -->
				<section class="controls panel" aria-label="Your list">
					{#if inList && listEntry}
						<div class="field-group">
							<span class="label">Status</span>
							<div class="status-field">
								<StatusSelect {malId} title={anime.title} status={listEntry.status} />
							</div>
						</div>
						<div class="field-group grow">
							<span class="label">Progress</span>
							<EpisodeStepper
								{malId}
								title={anime.title}
								watched={listEntry.numWatchedEpisodes}
								total={listEntry.numEpisodes}
							/>
						</div>
						<div class="field-group full">
							<ScoreInput {malId} score={listEntry.score} />
						</div>
						<button class="remove" onclick={() => (showRemoveConfirm = true)}
							>Remove from my list</button
						>
					{:else}
						<button class="btn btn-primary add-btn" onclick={() => (showAddModal = true)}>
							<Plus size={17} /> Add to my list
						</button>
					{/if}
				</section>

				<div class="links">
					<a
						href="https://myanimelist.net/anime/{malId}"
						target="_blank"
						rel="noopener noreferrer"
						class="ext-link shrink-0"
						style="--site-color: var(--color-primary)"
					>
						<ExternalLink size={12} />
						<span class="font-semibold">MyAnimeList</span>
					</a>
					<ExternalSitesRow animeTitle={anime.title} />
				</div>
			</div>
		</div>

		<!-- ─── Scrollable Page Sections ─── -->
		<div class="mt-12 space-y-10">
			<!-- Section 1: Overview (Synopsis) -->
			<div class="space-y-4">
				{#if anime.synopsis}
					<div class="panel p-5 relative overflow-hidden">
						<h3 class="mb-3 text-xs font-medium text-text-muted">Synopsis</h3>
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
					<div class="panel p-4">
						<h3 class="mb-3 text-xs font-medium text-text-muted">Trailer</h3>
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
					<div class="panel p-4 flex flex-wrap items-center gap-x-3 gap-y-1">
						<span class="text-xs font-medium text-text-muted shrink-0">Next Episode</span>
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
					<div class="panel p-4">
						<h3 class="mb-2 text-xs font-medium text-text-muted">Tags</h3>
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
					<h3 class="text-base font-semibold text-text-primary">Related Anime</h3>
					<div class="space-y-4">
						{#each Object.entries(relatedGrouped) as [type, items] (type)}
							<div>
								<h4 class="mb-2 text-xs font-medium text-text-muted">
									{type}
								</h4>
								<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{#each items as item (item.id)}
										<a
											href="/anime/{item.id}"
											class="group flex flex-col gap-1.5 panel p-2 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
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
					<h3 class="text-base font-semibold text-text-primary">Recommendations</h3>

					<!-- MAL Recommendations -->
					{#if anime.recommendations && anime.recommendations.length > 0}
						<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
							{#each anime.recommendations.slice(0, 6) as rec (rec.id)}
								<a
									href="/anime/{rec.id}"
									class="group flex flex-col gap-1.5 panel p-2 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
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
						<div class="panel p-4 text-center">
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
							<h4 class="text-xs font-medium text-text-muted">AniList Recommendations</h4>
							<div class="grid gap-3 md:grid-cols-2">
								{#each recommendations.slice(0, 4) as rec (rec.id)}
									{@const href = rec.idMal
										? `/anime/${rec.idMal}`
										: `https://anilist.co/anime/${rec.id}`}
									{@const external = !rec.idMal}
									<div class="panel p-3 flex gap-3 min-w-0">
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
					<h3 class="text-base font-semibold text-text-primary">Characters</h3>
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
					<h3 class="text-base font-semibold text-text-primary">Characters</h3>
					<div class="panel p-4 text-center">
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
						<h3 class="text-base font-semibold text-text-primary">Characters</h3>
						<span class="text-xs text-text-muted">({characters.length} total)</span>
					</div>
					<div class="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
						{#each displayedCharacters as entry (entry.id)}
							<button
								type="button"
								onclick={() => handleCharacterClick(entry)}
								class="w-full flex items-center gap-2 panel p-2 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:bg-white/10"
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
					<h3 class="text-base font-semibold text-text-primary">Reviews</h3>
					<div class="grid gap-3 md:grid-cols-2">
						{#each anilistEnriched.reviews.slice(0, 4) as r, i (i)}
							<div class="panel p-4 min-w-0 overflow-hidden">
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

<ConfirmDialog
	open={showRemoveConfirm}
	onOpenChange={(v) => (showRemoveConfirm = v)}
	title="Remove from your list?"
	description="This removes {anime?.title ??
		'this anime'} and its progress and rating from your MyAnimeList."
	confirmLabel="Remove"
	variant="danger"
	onConfirm={() => userListStore.removeFromList(malId)}
/>

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
	.hero {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		gap: 40px;
		align-items: start;
	}
	.cover {
		position: sticky;
		top: 24px;
	}
	.cover :global(.cover-bar) {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 5px;
		border-radius: 0;
		background: rgb(0 0 0 / 0.55);
	}
	.dub {
		position: absolute;
		left: 8px;
		bottom: 14px;
		width: 28px;
		height: 28px;
		color: var(--color-primary);
	}
	.title {
		font-family: var(--font-display);
		font-size: clamp(30px, 4.4vw, 52px);
		font-weight: 700;
		line-height: 1.02;
		letter-spacing: -0.04em;
		text-wrap: balance;
		overflow-wrap: anywhere;
	}
	.title :global(span.block) {
		margin-top: 10px;
		font-family: var(--font-sans);
		font-size: 15px;
		font-weight: 400;
		letter-spacing: 0;
		color: var(--color-text-muted);
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 18px;
		margin: 18px 0 0;
		padding: 0;
		list-style: none;
		font-size: 14px;
		color: var(--color-text-secondary);
	}
	.facts li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.facts strong {
		color: var(--color-text-primary);
		font-weight: 650;
	}
	.facts :global(.muted),
	.muted {
		color: var(--color-text-muted);
	}
	.credits {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin-top: 8px;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.genres {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 20px;
		margin-top: 24px;
		padding: 20px;
	}
	.field-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}
	.field-group.grow {
		flex: 1 1 240px;
		max-width: 320px;
	}
	.field-group.full {
		flex: 1 1 100%;
		padding-top: 18px;
		border-top: 1px solid var(--color-border);
	}
	.label {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.status-field {
		display: flex;
		min-height: 44px;
		align-items: center;
	}
	.status-field :global(.chip-select) {
		height: 44px;
		min-width: 168px;
	}
	.add-btn {
		min-height: 52px;
		padding: 0 28px;
		font-size: 15px;
	}
	.remove {
		margin-left: auto;
		min-height: 44px;
		color: var(--color-text-muted);
		font-size: 13px;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.remove:hover {
		color: var(--color-error);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 16px;
	}
	@media (max-width: 767px) {
		.hero {
			grid-template-columns: 112px minmax(0, 1fr);
			gap: 16px 18px;
		}
		.cover {
			position: static;
			grid-row: 1;
		}
		.info {
			display: contents;
		}
		.title {
			grid-column: 2;
			grid-row: 1;
			align-self: end;
		}
		.facts,
		.credits,
		.genres,
		.controls,
		.links {
			grid-column: 1 / -1;
		}
		.facts {
			margin-top: 0;
		}
		.controls {
			margin-top: 4px;
			padding: 16px;
		}
		.field-group.grow {
			max-width: none;
		}
	}
</style>
