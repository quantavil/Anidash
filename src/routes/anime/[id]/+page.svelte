<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	import { getAnimeDetail } from '$lib/api/mal';
	import { getRecommendations, getCharacters } from '$lib/api/jikan';
	import { putAnime, getAnimeAllowStale } from '$lib/cache/anime.cache';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import type { AnimeRecord } from '$lib/cache/db';
	import type {
		JikanRecommendationEntry,
		JikanCharacterEntry
	} from '$lib/api/schemas/jikan.schema';

	import {
		formatMediaType,
		formatAnimeStatus,
		formatSeason,
		formatLocalBroadcast,
		formatNumberShort
	} from '$lib/utils/format';
	import { Film, Star, ExternalLink, Calendar, Tv, Users, Clock, Plus, Mic } from 'lucide-svelte';
	import { dubStore } from '$lib/stores/dub.svelte';

	import ExternalSitesRow from '$lib/ui/ExternalSitesRow.svelte';

	import AnimeTitle from '$lib/ui/AnimeTitle.svelte';
	import StatusBadge from '$lib/ui/StatusBadge.svelte';
	import EpisodeCounter from '$lib/ui/EpisodeCounter.svelte';
	import ScoreInput from '$lib/ui/ScoreInput.svelte';
	import GenreBadge from '$lib/ui/GenreBadge.svelte';
	import AddToListModal from '$lib/ui/AddToListModal.svelte';
	import CompleteAnimeDialog from '$lib/ui/CompleteAnimeDialog.svelte';
	import CharacterDetailModal from '$lib/ui/CharacterDetailModal.svelte';
	import AnimeDetailSkeleton from '$lib/ui/skeletons/AnimeDetailSkeleton.svelte';
	import ImageWithFallback from '$lib/ui/ImageWithFallback.svelte';
	import ProgressLine from '$lib/ui/ProgressLine.svelte';

	const malId = $derived(Number(page.params.id));

	// ─── State ───

	let anime = $state<AnimeRecord | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const listEntry = $derived(userListStore.getEntry(malId));
	const inList = $derived(listEntry !== undefined);

	// ─── Tab Data (loaded in background) ───

	let characters = $state<JikanCharacterEntry[]>([]);
	let charactersLoading = $state(false);
	let charactersError = $state<string | null>(null);

	let recommendations = $state<JikanRecommendationEntry[]>([]);
	let recsLoading = $state(false);
	let recsError = $state<string | null>(null);

	// ─── Modals ───

	let showAddModal = $state(false);
	let showCompleteDialog = $state(false);
	let completeTargetId = $state<number | null>(null);
	let showCharacterModal = $state(false);
	let selectedCharacter = $state<JikanCharacterEntry | null>(null);

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

		if (cached) {
			anime = cached;
			loading = false;
		}

		// Fetch fresh data
		const result = await getAnimeDetail(id);
		if (id !== Number(page.params.id)) return;

		if (result.ok) {
			anime = result.value;
			await putAnime(result.value);
		} else if (!cached) {
			error = result.error.message || 'Failed to load anime';
		}

		loading = false;
	}

	// ─── Background Fetch Data ───

	async function loadCharacters(id: number) {
		if (charactersLoading) return;
		charactersLoading = true;
		charactersError = null;

		const result = await getCharacters(id);
		if (id !== Number(page.params.id)) return;

		if (result.ok) {
			characters = result.value.characters;
		} else {
			charactersError = 'Failed to load characters';
		}
		charactersLoading = false;
	}

	async function loadRecommendations(id: number) {
		if (recsLoading) return;
		recsLoading = true;
		recsError = null;

		const result = await getRecommendations(id);
		if (id !== Number(page.params.id)) return;

		if (result.ok) {
			recommendations = result.value;
		} else {
			recsError = 'Failed to load recommendations';
		}
		recsLoading = false;
	}

	// ─── Complete Prompt ───

	// ─── Lifecycle ───

	// Load anime and Jikan details in parallel when route changes
	$effect(() => {
		const id = Number(page.params.id);
		const currentMalId = untrack(() => anime?.malId);

		if (id && id !== currentMalId) {
			untrack(() => {
				anime = null;
				recommendations = [];
				characters = [];
				expandedSynopsis = false;
				expandedCharacters = false;

				// Reset loading states for the new ID
				loading = true;
				charactersLoading = false;
				recsLoading = false;

				loadAnime(id);
				loadCharacters(id);
				loadRecommendations(id);
			});
		}
	});

	function handleCompletePrompt(id: number) {
		completeTargetId = id;
		showCompleteDialog = true;
	}

	function handleCharacterClick(entry: JikanCharacterEntry) {
		selectedCharacter = entry;
		showCharacterModal = true;
	}

	const STATUS_COLORS: Record<string, string> = {
		currently_airing: 'text-success',
		finished_airing: 'text-info',
		not_yet_aired: 'text-warning'
	};

	function formatCharacterName(rawName: string): string {
		const parts = rawName.split(',').map((p) => p.trim());
		return parts.length === 2 ? `${parts[1]} ${parts[0]}` : rawName;
	}
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
	<div class="mx-auto max-w-5xl px-4 py-6">
		<!-- ─── Header ─── -->
		<div class="flex flex-col gap-6 sm:flex-row">
			<!-- Cover -->
			<div
				class="shrink-0 w-full sm:w-[200px] relative rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden border border-white/5"
			>
				<ImageWithFallback
					src={anime.mainPicture?.large ?? anime.mainPicture?.medium}
					alt={anime.title}
					class="w-full sm:w-[200px] h-full"
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
					class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary max-w-full [&>div+div]:before:content-['•'] [&>div+div]:before:text-white/20 [&>div+div]:before:mr-3"
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
							<span>{formatAnimeStatus(anime.animeStatus)}</span>
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
					class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted max-w-full [&>div+div]:before:content-['•'] [&>div+div]:before:text-white/20 [&>div+div]:before:mr-3"
				>
					{#if anime.studios.length > 0}
						<div class="flex items-center gap-1 shrink-0">
							<Users size={12} />
							{anime.studios.map((s) => s.name).join(', ')}
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
						{#each anime.genres as genre}
							<GenreBadge name={genre.name} />
						{/each}
					</div>
				{/if}

				<!-- ─── User List Controls ─── -->
				<div
					class="mt-5 rounded-2xl border border-white/10 bg-gradient-to-b from-surface-1/60 to-surface-2/40 backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden"
				>
					<!-- Glowing accent effect in background -->
					<div
						class="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"
					></div>

					{#if inList && listEntry}
						<!-- Responsive layout: side-by-side on large screens, stacked on mobile -->
						<div class="flex flex-col lg:flex-row lg:items-center gap-6 relative z-10">
							<!-- Left Side: Status & Progress -->
							<div class="flex-1 flex flex-col gap-4">
								<div class="grid grid-cols-2 gap-4 items-center">
									<!-- Status -->
									<div class="flex flex-col">
										<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">
											Status
										</span>
										<div class="mt-1.5 flex">
											<StatusBadge
												{malId}
												status={listEntry.status}
												class="h-10 sm:h-8 px-4 sm:px-3 text-xs sm:text-[11px] !rounded-lg flex items-center justify-center shadow-lg"
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
												onComplete={handleCompletePrompt}
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
											class="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-500 ease-spring"
											style="width: {pct}%"
										></div>
									</div>
								{/if}
							</div>

							<!-- Divider (vertical on desktop, horizontal on mobile) -->
							<div class="hidden lg:block w-px bg-white/10 self-stretch my-1"></div>
							<div class="block lg:hidden h-px bg-white/5 w-full"></div>

							<!-- Right Side: Rating / Score section -->
							<div class="lg:w-[280px] shrink-0">
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

			<!-- Section 2: Related Anime -->
			{#if relatedGrouped}
				<div class="space-y-4">
					<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">
						Related Anime
					</h3>
					<div class="space-y-4">
						{#each Object.entries(relatedGrouped) as [type, items]}
							<div>
								<h4 class="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
									{type}
								</h4>
								<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{#each items as item}
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
							{#each anime.recommendations.slice(0, 6) as rec}
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
							{#each Array(2) as _}
								<div class="h-28 animate-pulse rounded-xl bg-surface-1"></div>
							{/each}
						</div>
					{:else if recommendations.length > 0}
						<div class="space-y-3">
							<h4 class="text-xs font-bold uppercase tracking-wider text-text-muted">
								Community Insights
							</h4>
							<div class="grid gap-3 md:grid-cols-2">
								{#each recommendations.slice(0, 4) as rec}
									<div
										class="rounded-xl border border-white/5 bg-surface-1/30 p-3 flex gap-3 min-w-0"
									>
										{#if rec.entry}
											<a
												href="/anime/{rec.entry.mal_id}"
												class="shrink-0 h-20 w-14 overflow-hidden rounded-lg border border-white/5 shadow-md hover:opacity-85 transition-opacity"
											>
												<ImageWithFallback
													src={rec.entry.images?.jpg?.image_url}
													alt={rec.entry.title}
													class="h-full w-full object-cover"
												/>
											</a>
										{/if}
										<div class="min-w-0 flex-1 flex flex-col justify-between">
											<div>
												<div class="flex items-start justify-between gap-2 min-w-0 w-full">
													{#if rec.entry}
														<a
															href="/anime/{rec.entry.mal_id}"
															class="flex-1 min-w-0 truncate text-xs font-bold text-text-primary hover:text-primary transition-colors"
														>
															{rec.entry.title}
														</a>
													{/if}
													{#if rec.votes}
														<span
															class="shrink-0 text-[9px] font-bold bg-surface-2 px-1.5 py-0.5 rounded text-text-muted"
														>
															♥ {rec.votes}
														</span>
													{/if}
												</div>
												{#if rec.content}
													<p
														class="mt-1 line-clamp-3 text-[11px] leading-relaxed text-text-secondary break-words"
													>
														{rec.content}
													</p>
												{/if}
											</div>
											{#if rec.user}
												<p class="text-[9px] text-text-muted mt-1 truncate">
													By <span class="text-text-secondary font-medium">{rec.user.username}</span
													>
												</p>
											{/if}
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
						{#each Array(8) as _}
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
			{:else if characters.length > 0}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-base font-bold uppercase tracking-wider text-text-primary">
							Characters
						</h3>
						<span class="text-xs text-text-muted">({characters.length} total)</span>
					</div>
					<div class="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
						{#each displayedCharacters as entry}
							<button
								type="button"
								onclick={() => handleCharacterClick(entry)}
								class="w-full flex items-center gap-2 rounded-xl border border-white/5 bg-surface-1/40 p-2 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:bg-white/10"
							>
								<ImageWithFallback
									src={entry.character.images?.jpg?.image_url}
									alt={entry.character.name}
									aspectRatio="1/1"
									fallbackIcon="user"
									class="h-10 w-10 shrink-0 rounded-full"
								/>
								<div class="min-w-0 flex-1">
									<p
										class="truncate text-xs font-semibold text-text-primary"
										title={formatCharacterName(entry.character.name)}
									>
										{formatCharacterName(entry.character.name)}
									</p>
									<p class="text-[10px] capitalize text-text-muted truncate">{entry.role}</p>
									{#if entry.character.favorites}
										<p class="mt-0.5 text-[9px] text-text-muted">
											♥ {entry.character.favorites.toLocaleString()}
										</p>
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
/>

<!-- Complete Confirmation Dialog -->
<CompleteAnimeDialog bind:open={showCompleteDialog} bind:malId={completeTargetId} />

<!-- Character Detail Modal -->
<CharacterDetailModal bind:open={showCharacterModal} entry={selectedCharacter} />
