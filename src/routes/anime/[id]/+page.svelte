<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	import { getAnimeDetail } from '$lib/api/mal';
	import { getCharacters, getRecommendations } from '$lib/api/jikan';
	import { putAnime, getAnimeAllowStale } from '$lib/cache/anime.cache';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { authStore } from '$lib/auth/auth.svelte';
	import type { AnimeRecord } from '$lib/cache/db';
	import type {
		JikanCharacterEntry,
		JikanRecommendationEntry
	} from '$lib/api/schemas/jikan.schema';

	import {
		formatMediaType,
		formatNumberShort,
		formatAnimeStatus,
		formatStatus,
		formatSeason
	} from '$lib/utils/format';
	import { Film, Star, ExternalLink, Calendar, Tv, Users, Clock, Plus, Mic } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { dubStore } from '$lib/stores/dub.svelte';

	import StatusBadge from '$lib/ui/StatusBadge.svelte';
	import EpisodeCounter from '$lib/ui/EpisodeCounter.svelte';
	import RatingStars from '$lib/ui/RatingStars.svelte';
	import GenreBadge from '$lib/ui/GenreBadge.svelte';
	import AddToListModal from '$lib/ui/AddToListModal.svelte';
	import CompleteAnimeDialog from '$lib/ui/CompleteAnimeDialog.svelte';
	import AnimeDetailSkeleton from '$lib/ui/skeletons/AnimeDetailSkeleton.svelte';
	import ImageWithFallback from '$lib/ui/ImageWithFallback.svelte';

	const malId = $derived(Number($page.params.id));

	// ─── State ───

	let anime = $state<AnimeRecord | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const listEntry = $derived(userListStore.getEntry(malId));
	const inList = $derived(listEntry !== undefined);

	// ─── Tabs ───

	type TabKey = 'overview' | 'characters' | 'recommendations' | 'related';
	let activeTab = $state<TabKey>('overview');

	// ─── Tab Data (lazy loaded) ───

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

	// ─── Load Anime Detail ───

	async function loadAnime() {
		loading = true;
		error = null;

		// Try cache first (stale-while-revalidate)
		const cached = await getAnimeAllowStale(malId);
		if (cached) {
			anime = cached;
			loading = false;
		}

		// Fetch fresh data
		const result = await getAnimeDetail(malId);
		if (result.ok) {
			anime = result.value;
			await putAnime(result.value);
		} else if (!cached) {
			// No cache and fetch failed
			error = result.error.message || 'Failed to load anime';
		}

		loading = false;
	}

	// ─── Lazy Load Tab Data ───

	async function loadCharacters() {
		if (characters.length > 0 || charactersLoading) return;
		charactersLoading = true;
		charactersError = null;

		const result = await getCharacters(malId);
		if (result.ok) {
			characters = result.value.characters;
		} else {
			charactersError = 'Failed to load characters';
		}
		charactersLoading = false;
	}

	async function loadRecommendations() {
		if (recommendations.length > 0 || recsLoading) return;
		recsLoading = true;
		recsError = null;

		const result = await getRecommendations(malId);
		if (result.ok) {
			recommendations = result.value;
		} else {
			recsError = 'Failed to load recommendations';
		}
		recsLoading = false;
	}

	// ─── Tab Switch ───

	function handleTabChange(tab: TabKey) {
		activeTab = tab;
		switch (tab) {
			case 'characters':
				loadCharacters();
				break;
			case 'recommendations':
				loadRecommendations();
				break;
		}
	}

	// ─── Complete Prompt ───

	function handleCompletePrompt(id: number) {
		completeTargetId = id;
		showCompleteDialog = true;
	}

	// ─── Lifecycle ───

	onMount(() => {
		loadAnime();
	});

	// Re-load when navigating to a different anime
	$effect(() => {
		const id = Number($page.params.id);
		if (id && id !== anime?.malId) {
			anime = null;
			characters = [];
			recommendations = [];
			activeTab = 'overview';
			loading = true;

			// IIFE to handle async in effect
			(async () => {
				const cached = await getAnimeAllowStale(id);
				if (cached) {
					anime = cached;
					loading = false;
				}

				const result = await getAnimeDetail(id);
				if (result.ok) {
					anime = result.value;
					await putAnime(result.value);
				} else if (!cached) {
					error = result.error.message || 'Failed to load anime';
				}
				loading = false;
			})();
		}
	});

	const TABS: { key: TabKey; label: string }[] = [
		{ key: 'overview', label: 'Overview' },
		{ key: 'characters', label: 'Characters' },
		{ key: 'recommendations', label: 'Recommendations' },
		{ key: 'related', label: 'Related' }
	];

	const STATUS_COLORS: Record<string, string> = {
		currently_airing: 'text-success',
		finished_airing: 'text-info',
		not_yet_aired: 'text-warning'
	};
</script>

{#if loading && !anime}
	<AnimeDetailSkeleton />
{:else if error}
	<div class="mx-auto max-w-5xl px-4 py-16 text-center">
		<p class="text-lg text-error">{error}</p>
		<button
			onclick={loadAnime}
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
				<h1
					class="flex items-center gap-2 text-2xl font-bold leading-tight text-text-primary sm:text-3xl"
				>
					{anime.title}
					{#if dubStore.hasDub(anime.malId)}
						<span
							class="inline-flex items-center justify-center rounded-lg bg-primary/20 text-primary px-2 py-1 shadow-[0_0_10px_rgba(var(--color-primary),0.2)] border border-primary/30"
							title="Dubbed"
						>
							<Mic size={16} fill="currentColor" />
						</span>
					{/if}
				</h1>

				<!-- Quick stats row -->
				<div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
					{#if anime.mean}
						<div
							class="flex items-center gap-1"
							title={anime.numScoringUsers
								? anime.numScoringUsers.toLocaleString() + ' users scored this'
								: ''}
						>
							<Star size={16} class="text-warning" fill="currentColor" />
							<span class="font-semibold text-text-primary">{anime.mean.toFixed(1)}</span>
						</div>
					{/if}
					{#if anime.numListUsers && anime.numListUsers > 0}
						<div class="flex items-center gap-1">
							<Users size={14} class="text-text-muted" />
							<span><span class="text-text-primary font-medium">{formatNumberShort(anime.numListUsers)}</span> members</span>
						</div>
					{/if}
					{#if anime.mediaType}
						<div class="flex items-center gap-1">
							<Tv size={14} class="text-text-muted" />
							{formatMediaType(anime.mediaType)}
						</div>
					{/if}
					{#if anime.numEpisodes > 0}
						<div class="flex items-center gap-1">
							<Film size={14} class="text-text-muted" />
							{anime.numEpisodes} episodes
						</div>
					{/if}
					{#if anime.animeStatus}
						<span class={STATUS_COLORS[anime.animeStatus] ?? 'text-text-muted'}>
							{formatAnimeStatus(anime.animeStatus)}
						</span>
					{/if}
				</div>

				<!-- Season + Studios -->
				<div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
					{#if anime.startSeason}
						<div class="flex items-center gap-1">
							<Calendar size={12} />
							{formatSeason(anime.startSeason.year, anime.startSeason.season)}
						</div>
					{/if}
					{#if anime.studios.length > 0}
						<div class="flex items-center gap-1">
							<Users size={12} />
							{anime.studios.map((s) => s.name).join(', ')}
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
					class="mt-5 rounded-2xl border border-white/10 bg-surface-1/40 backdrop-blur-md p-5 shadow-xl"
				>
					{#if inList && listEntry}
						<div class="flex flex-wrap items-center gap-4">
							<!-- Status -->
							<div>
								<p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
									Status
								</p>
								<StatusBadge {malId} status={listEntry.status} />
							</div>

							<!-- Progress -->
							<div>
								<p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
									Progress
								</p>
								<EpisodeCounter
									{malId}
									watched={listEntry.numWatchedEpisodes}
									total={listEntry.numEpisodes}
									onComplete={handleCompletePrompt}
								/>
							</div>

							<!-- Score -->
							<div>
								<p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
									Your Score
								</p>
								<RatingStars {malId} score={listEntry.score} size={16} />
							</div>
						</div>
					{:else}
						<button
							onclick={() => (showAddModal = true)}
							class="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
						>
							<Plus size={16} />
							Add to My List
						</button>
					{/if}
				</div>

				<!-- MAL Link -->
				<a
					href="https://myanimelist.net/anime/{malId}"
					target="_blank"
					rel="noopener noreferrer"
					class="mt-3 inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-primary"
				>
					<ExternalLink size={12} />
					View on MyAnimeList
				</a>
			</div>
		</div>

		<!-- ─── Tabs ─── -->
		<div class="mt-8">
			<div class="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
				{#each TABS as tab}
					<button
						onclick={() => handleTabChange(tab.key)}
						class="shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all duration-300
              {activeTab === tab.key
							? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.2)] border border-primary/40'
							: 'bg-surface-1/50 text-text-muted hover:bg-surface-1 hover:text-text-secondary border border-white/5'}"
					>
						{tab.label}
						{#if tab.key === 'characters' && characters.length > 0}
							<span class="ml-1 text-xs opacity-60">({characters.length})</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- ─── Tab Content ─── -->
			<div class="mt-6">
				<!-- Overview -->
				{#if activeTab === 'overview'}
					<div class="space-y-6">
						{#if anime.synopsis}
							<div class="rounded-xl border border-white/5 bg-surface-1/40 p-5">
								<h3 class="mb-2 text-sm font-semibold text-text-primary">Synopsis</h3>
								<p class="text-sm leading-relaxed text-text-secondary">
									{anime.synopsis}
								</p>
							</div>
						{/if}

						<!-- Info Grid -->
						<div class="rounded-xl border border-white/5 bg-surface-1/40 p-5">
							<h3 class="mb-3 text-sm font-semibold text-text-primary">Information</h3>
							<div class="grid gap-4 sm:grid-cols-2">
								{#each [{ label: 'Type', value: formatMediaType(anime.mediaType) }, { label: 'Episodes', value: anime.numEpisodes || 'Unknown' }, { label: 'Status', value: formatAnimeStatus(anime.animeStatus) }, { label: 'Season', value: formatSeason(anime.startSeason?.year ?? null, anime.startSeason?.season ?? null) }, { label: 'Studios', value: anime.studios
												.map((s) => s.name)
												.join(', ') || '—' }, { label: 'Score', value: anime.mean ? anime.mean.toFixed(2) : '—' }] as item}
									<div class="flex items-start gap-3 text-sm">
										<span class="shrink-0 w-20 font-medium text-text-muted">{item.label}</span>
										<span class="text-text-primary">{item.value}</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Quick Recommendations Preview -->
						{#if anime.recommendations && anime.recommendations.length > 0}
							<div>
								<h3 class="mb-3 text-sm font-semibold text-text-primary">Recommendations</h3>
								<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{#each anime.recommendations.slice(0, 3) as rec}
										<a
											href="/anime/{rec.id}"
											class="flex items-center gap-3 rounded-xl border border-white/5 bg-surface-1/40 backdrop-blur-sm p-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
										>
											<ImageWithFallback
												src={rec.mainPicture?.medium}
												alt={rec.title}
												class="h-16 w-11 shrink-0 rounded"
											/>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm text-text-primary">{rec.title}</p>
												{#if rec.mean}
													<p class="text-xs text-text-muted">★ {rec.mean.toFixed(1)}</p>
												{/if}
											</div>
										</a>
									{/each}
								</div>
								{#if anime.recommendations.length > 3}
									<button
										onclick={() => handleTabChange('recommendations')}
										class="mt-2 text-sm text-primary hover:text-primary-hover"
									>
										View all {anime.recommendations.length} recommendations →
									</button>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Characters -->
				{:else if activeTab === 'characters'}
					{#if charactersLoading}
						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each Array(6) as _}
								<div class="flex items-center gap-3 rounded-lg bg-surface-1 p-3">
									<div class="h-14 w-14 animate-pulse rounded-full bg-surface-2"></div>
									<div class="space-y-2">
										<div class="h-4 w-24 animate-pulse rounded bg-surface-2"></div>
										<div class="h-3 w-16 animate-pulse rounded bg-surface-2"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if charactersError}
						<p class="text-sm text-error">{charactersError}</p>
					{:else if characters.length === 0}
						<p class="text-sm text-text-muted">No character information available.</p>
					{:else}
						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each characters as entry}
								<div
									class="flex items-center gap-3 rounded-xl border border-white/5 bg-surface-1/40 backdrop-blur-sm p-3 transition-transform hover:-translate-y-0.5 hover:shadow-lg"
								>
									<ImageWithFallback
										src={entry.character.images?.jpg?.image_url}
										alt={entry.character.name}
										aspectRatio="1/1"
										fallbackIcon="user"
										class="h-14 w-14 shrink-0 rounded-full"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-text-primary">
											{entry.character.name}
										</p>
										<p class="text-xs capitalize text-text-muted">{entry.role}</p>
										{#if entry.character.favorites}
											<p class="mt-0.5 text-[10px] text-text-muted">
												♥ {entry.character.favorites.toLocaleString()}
											</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Recommendations -->
				{:else if activeTab === 'recommendations'}
					{#if recsLoading}
						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each Array(6) as _}
								<div class="h-40 animate-pulse rounded-lg bg-surface-1"></div>
							{/each}
						</div>
					{:else if recsError}
						<p class="text-sm text-error">{recsError}</p>
					{:else}
						<!-- MAL recommendations (from detail) -->
						{#if anime.recommendations && anime.recommendations.length > 0}
							<h3 class="mb-3 text-sm font-semibold text-text-primary">From MyAnimeList</h3>
							<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{#each anime.recommendations as rec}
									<a
										href="/anime/{rec.id}"
										class="group flex items-center gap-3 rounded-xl border border-border bg-surface-1/50 p-3 transition-all hover:bg-surface-1 hover:border-primary/30"
									>
										<div class="overflow-hidden rounded-lg shadow-lg">
											<ImageWithFallback
												src={rec.mainPicture?.medium}
												alt={rec.title}
												class="h-20 w-14 shrink-0 object-cover transition-transform duration-500 group-hover:scale-110"
											/>
										</div>
										<div class="min-w-0 flex-1">
											<p
												class="line-clamp-2 text-sm font-semibold text-text-primary group-hover:text-primary transition-colors"
											>
												{rec.title}
											</p>
											<div class="mt-1 flex flex-col gap-0.5">
												{#if rec.mean}
													<p class="text-xs text-text-muted flex items-center gap-1">
														<Star size={10} class="text-warning" fill="currentColor" />
														{rec.mean.toFixed(1)}
													</p>
												{/if}
												{#if rec.numRecommendations}
													<p class="text-[10px] text-text-muted">
														{rec.numRecommendations}
														{rec.numRecommendations === 1 ? 'recommendation' : 'recommendations'}
													</p>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>
						{/if}

						<!-- Jikan recommendations -->
						{#if recommendations.length > 0}
							<h3 class="mb-3 mt-8 text-sm font-semibold text-text-primary">
								Community Recommendations
							</h3>
							<div class="space-y-3">
								{#each recommendations.slice(0, 10) as rec}
									<div
										class="rounded-xl border border-white/5 bg-surface-1/40 backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-lg hover:border-primary/30"
									>
										<div class="flex items-start gap-4">
											{#if rec.entry}
												<a href="/anime/{rec.entry.mal_id}" class="shrink-0 group">
													<div
														class="overflow-hidden rounded-lg border border-white/5 shadow-2xl group-active:scale-95 transition-transform duration-200"
													>
														<ImageWithFallback
															src={rec.entry.images?.jpg?.image_url}
															alt={rec.entry.title}
															class="h-28 w-20 object-cover transition-transform duration-500 group-hover:scale-110"
														/>
													</div>
												</a>
											{/if}
											<div class="min-w-0 flex-1">
												<div class="flex items-start justify-between gap-3">
													{#if rec.entry}
														<a
															href="/anime/{rec.entry.mal_id}"
															class="text-base font-semibold leading-tight text-text-primary hover:text-primary transition-colors"
														>
															{rec.entry.title}
														</a>
													{/if}
													{#if rec.votes}
														<div
															class="flex items-center gap-1.5 shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold text-text-secondary border border-white/10 shadow-sm"
															title="{rec.votes} users recommended this"
														>
															<Users size={12} class="text-primary" />
															{rec.votes}
														</div>
													{/if}
												</div>
												{#if rec.content}
													<p class="mt-2 line-clamp-4 text-xs leading-relaxed text-text-secondary">
														{rec.content}
													</p>
												{/if}
												{#if rec.user}
													<div class="mt-4 flex items-center gap-2">
														<div
															class="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center"
														>
															<Users size={10} class="text-primary" />
														</div>
														<span class="text-[10px] font-medium text-text-muted">
															Suggested by <span class="text-text-secondary"
																>{rec.user.username}</span
															>
														</span>
													</div>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						{#if (!anime.recommendations || anime.recommendations.length === 0) && recommendations.length === 0}
							<p class="text-sm text-text-muted">No recommendations available.</p>
						{/if}
					{/if}

					<!-- Related -->
				{:else if activeTab === 'related'}
					{#if anime.relatedAnime && anime.relatedAnime.length > 0}
						{@const grouped = anime.relatedAnime.reduce(
							(acc, r) => {
								const type = r.relationType.replace(/_/g, ' ');
								if (!acc[type]) acc[type] = [];
								acc[type].push(r);
								return acc;
							},
							{} as Record<string, typeof anime.relatedAnime>
						)}

						<div class="space-y-6">
							{#each Object.entries(grouped) as [type, items]}
								<div>
									<h3 class="mb-3 text-sm font-semibold capitalize text-text-primary">{type}</h3>
									<div class="grid gap-3 sm:grid-cols-2">
										{#each items as item}
											<a
												href="/anime/{item.id}"
												class="flex items-center gap-3 rounded-xl border border-white/5 bg-surface-1/40 backdrop-blur-sm p-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
											>
												<ImageWithFallback
													src={item.mainPicture?.medium}
													alt={item.title}
													class="h-16 w-11 shrink-0 rounded"
												/>
												<div class="min-w-0 flex-1">
													<p class="truncate text-sm text-text-primary">{item.title}</p>
													{#if item.mediaType}
														<p class="text-xs text-text-muted">{formatMediaType(item.mediaType)}</p>
													{/if}
												</div>
											</a>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-text-muted">No related anime information available.</p>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Add to List Modal -->
<AddToListModal
	open={showAddModal}
	onOpenChange={(v) => (showAddModal = v)}
	{malId}
	title={anime?.title ?? ''}
	picture={anime?.mainPicture?.large ?? anime?.mainPicture?.medium ?? null}
	mean={anime?.mean ?? null}
	mediaType={anime?.mediaType ?? ''}
	numEpisodes={anime?.numEpisodes ?? 0}
/>

<!-- Complete Confirmation Dialog -->
<CompleteAnimeDialog bind:open={showCompleteDialog} bind:malId={completeTargetId} />
