<script lang="ts">
	import { goto } from '$app/navigation';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { STORAGE_KEYS } from '$lib/constants';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { getSeasonal } from '$lib/api/mal';
	import { getCurrentSeason } from '$lib/utils/season';
	import { getSeasonalCache, setSeasonalCache } from '$lib/cache/meta.cache';
	import { mapMalNodeToDisplay, type DisplayAnime } from '$lib/utils/types';
	import { logger } from '$lib/utils/logger';
	import { Dialog } from 'bits-ui';
	import { Dice5, Sparkles, LoaderCircle, Settings, ListFilter, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy } from 'svelte';

	let loading = $state(false);
	let initializing = $state(false);

	let filterDialogOpen = $state(false);
	let selectedGenres = $state<number[]>([]);
	let selectedFormats = $state<string[]>([]);
	let minScore = $state<number>(0);

	const ptwEntries = $derived(userListStore.planToWatch);

	// Extract unique metadata from the Plan to Watch list
	const availableMetadata = $derived.by(() => {
		const genreMap = new SvelteMap<number, string>();
		const formats = new SvelteSet<string>();

		for (const entry of ptwEntries) {
			if (entry.genres) {
				for (const g of entry.genres) {
					genreMap.set(g.id, g.name);
				}
			}
			if (entry.mediaType) {
				formats.add(entry.mediaType);
			}
		}

		return {
			genres: Array.from(genreMap.entries())
				.map(([id, name]) => ({ id, name }))
				.sort((a, b) => a.name.localeCompare(b.name)),
			formats: Array.from(formats).sort()
		};
	});

	// Reactively filter Plan to Watch entries
	const matchingPTW = $derived.by(() => {
		return ptwEntries.filter((entry) => {
			if (selectedGenres.length > 0) {
				const entryGenreIds = entry.genres?.map((g) => g.id) || [];
				const hasAll = selectedGenres.every((id) => entryGenreIds.includes(id));
				if (!hasAll) return false;
			}
			if (selectedFormats.length > 0) {
				if (!selectedFormats.includes(entry.mediaType)) return false;
			}
			if (minScore > 0) {
				if (entry.mean === null || entry.mean < minScore) return false;
			}
			return true;
		});
	});

	/** Load the current season's anime, from cache or MAL. Returns [] on failure. */
	async function getSeasonalPool(): Promise<DisplayAnime[]> {
		const current = getCurrentSeason();
		const cacheKey = `seasonal:${current.year}:${current.season}`;
		const cached = await getSeasonalCache(cacheKey);
		if (cached && cached.value.length > 0) return cached.value;

		const result = await getSeasonal(current.year, current.season, { limit: 50 });
		if (!result.ok || result.value.data.length === 0) return [];

		const fetched = result.value.data.map((item) => mapMalNodeToDisplay(item.node));
		await setSeasonalCache(cacheKey, fetched);
		return fetched;
	}

	function randomFrom<T>(list: T[]): T | null {
		return list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
	}

	onMount(async () => {
		initializing = true;

		// Load filters from localStorage
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.PTW_FILTERS);
			if (saved) {
				const parsed = JSON.parse(saved);
				selectedGenres = parsed.genres || [];
				selectedFormats = parsed.formats || [];
				minScore = parsed.minScore || 0;
			}
		} catch (e) {
			logger.warn('Failed to read PTW filters from localStorage:', e);
		}

		// Pre-warm seasonal pool cache
		try {
			await getSeasonalPool();
		} catch (e) {
			logger.warn('Failed to preload seasonal anime:', e);
		}

		initializing = false;
	});

	function saveFilters() {
		try {
			localStorage.setItem(
				STORAGE_KEYS.PTW_FILTERS,
				JSON.stringify({
					genres: selectedGenres,
					formats: selectedFormats,
					minScore
				})
			);
		} catch (e) {
			logger.warn('Failed to save PTW filters to localStorage:', e);
		}
	}

	$effect(() => {
		const _ = [selectedGenres, selectedFormats, minScore];
		saveFilters();
	});

	let rollingPTW = $state(false);
	let rolledTitle = $state('');

	let rouletteInterval: ReturnType<typeof setInterval> | null = null;
	let rouletteTimeout: ReturnType<typeof setTimeout> | null = null;

	onDestroy(() => {
		if (rouletteInterval) clearInterval(rouletteInterval);
		if (rouletteTimeout) clearTimeout(rouletteTimeout);
	});

	async function runRoulette() {
		if (rollingPTW) return;
		if (matchingPTW.length === 0) {
			toast.info('No matching anime found. Adjust your filters.');
			return;
		}

		rollingPTW = true;
		const duration = 800;
		const intervalMs = 80;
		const steps = duration / intervalMs;
		let step = 0;

		rouletteInterval = setInterval(() => {
			const temp = matchingPTW[Math.floor(Math.random() * matchingPTW.length)];
			rolledTitle = temp.titleEnglish || temp.title;
			step++;
			if (step >= steps) {
				if (rouletteInterval) clearInterval(rouletteInterval);
				rouletteInterval = null;
				const finalPick = matchingPTW[Math.floor(Math.random() * matchingPTW.length)];
				goto(`/anime/${finalPick.malId}`);
				rouletteTimeout = setTimeout(() => {
					rollingPTW = false;
					rouletteTimeout = null;
				}, 500);
			}
		}, intervalMs);
	}

	async function getRandomSeasonal() {
		if (loading || initializing) return;
		loading = true;
		try {
			const pool = await getSeasonalPool();
			const pick = randomFrom(pool);
			if (!pick) {
				toast.error('Failed to load seasonal anime.');
				return;
			}
			goto(`/anime/${pick.malId}`);
		} catch (e) {
			logger.error('Seasonal surprise failed:', e);
			toast.error('An error occurred.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:mt-8">
	<!-- PTW Roulette Widget -->
	<div
		class="group relative overflow-hidden rounded-2xl border transition-all duration-500 sm:p-6 bg-surface-1/40 backdrop-blur-xl flex flex-col items-center justify-center min-h-[130px] sm:min-h-[150px] shadow-sm cursor-pointer {rollingPTW
			? 'border-primary/40 shadow-[0_0_20px_rgba(139,126,248,0.25)]'
			: 'border-white/5 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(139,126,248,0.12)]'}"
	>
		<!-- Main Action Area (Triggers Roll) -->
		<button
			onclick={runRoulette}
			disabled={rollingPTW}
			class="absolute inset-0 z-10 w-full h-full bg-transparent border-none cursor-pointer focus-visible:outline-none focus-visible:bg-white/5"
			aria-label="Roll Plan to Watch Roulette"
		></button>

		<!-- Settings Button in corner -->
		<button
			onclick={(e) => {
				e.stopPropagation();
				filterDialogOpen = true;
			}}
			class="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-text-secondary transition-all hover:bg-primary/10 hover:border-primary/20 hover:text-primary-hover hover:rotate-45 active:scale-90 cursor-pointer"
			title="Filter Settings"
		>
			<Settings size={14} />
		</button>

		<!-- Background glow blobs -->
		<div
			class="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-60 pointer-events-none"
		></div>

		<!-- Large SVG in background/middle -->
		<div
			class="absolute inset-0 flex items-center justify-center opacity-[0.04] transition-all duration-700 group-hover:scale-125 group-hover:rotate-12 group-hover:opacity-[0.08] pointer-events-none text-primary"
		>
			<Dice5 size={140} strokeWidth={1} class="drop-shadow-[0_0_15px_currentColor]" />
		</div>

		<div class="relative z-10 flex flex-col items-center justify-center w-full pointer-events-none">
			<div
				class="glass-icon-wrapper border-primary/10 bg-primary/5 text-primary group-hover:bg-primary/10 group-hover:border-primary/20"
			>
				{#if rollingPTW}
					<LoaderCircle
						size={24}
						class="animate-spin text-primary drop-shadow-[0_0_8px_currentColor]"
					/>
				{:else}
					<Dice5 size={24} class="text-primary drop-shadow-[0_0_8px_currentColor]" />
				{/if}
			</div>
			<h3 class="text-[13px] sm:text-base font-bold text-text-primary mb-1 tracking-tight">
				{#if rollingPTW}
					{rolledTitle}
				{:else}
					PTW Roulette
				{/if}
			</h3>
			<p
				class="text-[11px] sm:text-sm text-text-secondary leading-snug opacity-80 group-hover:opacity-100 transition-opacity max-w-[95%] mx-auto"
			>
				{#if rollingPTW}
					Spinning...
				{:else if ptwEntries.length === 0}
					Backlog is empty
				{:else if selectedGenres.length > 0 || selectedFormats.length > 0 || minScore > 0}
					{matchingPTW.length} match{matchingPTW.length === 1 ? '' : 'es'} ({selectedGenres.length +
						selectedFormats.length +
						(minScore > 0 ? 1 : 0)} active)
				{:else}
					Random from backlog
				{/if}
			</p>
		</div>
	</div>

	<!-- Seasonal Surprise Widget -->
	<div
		class="group relative overflow-hidden rounded-2xl border transition-all duration-300 sm:p-6 bg-surface-1/40 backdrop-blur-xl flex flex-col items-center justify-center min-h-[130px] sm:min-h-[150px] shadow-sm cursor-pointer {loading
			? 'border-pink-500/40 shadow-[0_0_20px_rgba(244,114,182,0.25)]'
			: 'border-white/5 hover:border-pink-500/30 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(244,114,182,0.12)]'}"
	>
		<!-- Main Action Area (Triggers Roll) -->
		<button
			onclick={getRandomSeasonal}
			disabled={loading}
			class="absolute inset-0 z-10 w-full h-full bg-transparent border-none cursor-pointer focus-visible:outline-none focus-visible:bg-white/5"
			aria-label="Roll Seasonal Surprise"
		></button>

		<!-- Background glow blobs -->
		<div
			class="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-60 pointer-events-none"
		></div>

		<!-- Large SVG in background/middle -->
		<div
			class="absolute inset-0 flex items-center justify-center opacity-[0.04] transition-all duration-700 group-hover:scale-125 group-hover:rotate-12 group-hover:opacity-[0.08] pointer-events-none text-pink-400"
		>
			<Sparkles size={140} strokeWidth={1} class="drop-shadow-[0_0_15px_currentColor]" />
		</div>

		<div class="relative z-10 flex flex-col items-center justify-center w-full pointer-events-none">
			<div
				class="glass-icon-wrapper border-pink-500/10 bg-pink-500/5 text-pink-400 group-hover:bg-pink-500/10 group-hover:border-pink-500/20"
			>
				{#if loading}
					<LoaderCircle
						size={24}
						class="animate-spin text-pink-400 drop-shadow-[0_0_8px_currentColor]"
					/>
				{:else}
					<Sparkles size={24} class="text-pink-400 drop-shadow-[0_0_8px_currentColor]" />
				{/if}
			</div>
			<h3 class="text-[13px] sm:text-base font-bold text-text-primary mb-1 tracking-tight">
				Seasonal Surprise
			</h3>
			<p
				class="text-[11px] sm:text-sm text-text-secondary leading-snug opacity-80 group-hover:opacity-100 transition-opacity max-w-[95%] mx-auto"
			>
				{#if loading}
					Loading...
				{:else}
					Random airing anime
				{/if}
			</p>
		</div>
	</div>
</div>

<!-- PTW Filters Modal -->
<Dialog.Root bind:open={filterDialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md transition-all duration-300"
		/>
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-gradient-to-b from-surface-1/95 to-surface-2/90 p-6 shadow-2xl backdrop-blur-2xl overflow-hidden focus:outline-none"
		>
			<!-- Glowing background decoration -->
			<div
				class="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"
			></div>
			<div
				class="absolute -left-20 -bottom-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
			></div>

			<div class="relative flex flex-col gap-5 z-10">
				<!-- Header -->
				<div class="flex items-center justify-between">
					<Dialog.Title class="text-base font-bold text-text-primary flex items-center gap-2">
						<ListFilter size={16} class="text-primary" />
						PTW Roulette Filters
					</Dialog.Title>
					<Dialog.Close
						class="rounded-full p-1.5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all active:scale-95 cursor-pointer"
					>
						<X size={16} />
					</Dialog.Close>
				</div>

				<!-- Genres Filter -->
				<div class="space-y-2">
					<span class="text-xs font-semibold uppercase tracking-wider text-text-secondary block"
						>Genres</span
					>
					{#if availableMetadata.genres.length === 0}
						<p class="text-xs text-text-muted">No genres available in your backlog</p>
					{:else}
						<div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
							{#each availableMetadata.genres as genre (genre.id)}
								{@const active = selectedGenres.includes(genre.id)}
								<button
									onclick={() => {
										if (active) {
											selectedGenres = selectedGenres.filter((id) => id !== genre.id);
										} else {
											selectedGenres = [...selectedGenres, genre.id];
										}
									}}
									class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer {active
										? 'border-primary/40 bg-primary/10 text-primary-hover shadow-[0_0_8px_rgba(139,126,248,0.15)]'
										: 'border-white/5 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'}"
								>
									{genre.name}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Formats Filter -->
				<div class="space-y-2">
					<span class="text-xs font-semibold uppercase tracking-wider text-text-secondary block"
						>Format</span
					>
					{#if availableMetadata.formats.length === 0}
						<p class="text-xs text-text-muted">No formats available in your backlog</p>
					{:else}
						<div class="flex flex-wrap gap-1.5">
							{#each availableMetadata.formats as format (format)}
								{@const active = selectedFormats.includes(format)}
								<button
									onclick={() => {
										if (active) {
											selectedFormats = selectedFormats.filter((f) => f !== format);
										} else {
											selectedFormats = [...selectedFormats, format];
										}
									}}
									class="rounded-full border px-2.5 py-1 text-xs font-medium uppercase transition-all cursor-pointer {active
										? 'border-primary/40 bg-primary/10 text-primary-hover shadow-[0_0_8px_rgba(139,126,248,0.15)]'
										: 'border-white/5 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'}"
								>
									{format}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Minimum Score Filter -->
				<div class="space-y-2">
					<div
						class="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-text-secondary"
					>
						<span>Min MAL Rating</span>
						<span class="text-primary-hover font-bold tracking-normal text-sm lowercase">
							{minScore === 0 ? 'any rating' : `${minScore.toFixed(1)}+`}
						</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-xs text-text-muted">0</span>
						<input
							type="range"
							min="0"
							max="10"
							step="0.5"
							bind:value={minScore}
							class="flex-1 accent-primary cursor-pointer h-1.5 rounded-full bg-white/10 border-none outline-none"
						/>
						<span class="text-xs text-text-muted">10</span>
					</div>
				</div>

				<!-- Eligible Counter -->
				<div
					class="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-xs text-text-secondary"
				>
					<span>Eligible backlog titles:</span>
					<span class="font-bold text-primary-hover">{matchingPTW.length} anime</span>
				</div>

				<!-- Actions -->
				<div class="flex gap-2 mt-2">
					<button
						onclick={() => {
							selectedGenres = [];
							selectedFormats = [];
							minScore = 0;
						}}
						class="flex-1 rounded-xl border border-white/10 bg-surface-2 py-2.5 text-xs font-semibold text-text-secondary transition-all hover:bg-white/10 hover:text-text-primary cursor-pointer"
					>
						Reset
					</button>
					<Dialog.Close
						onclick={runRoulette}
						disabled={matchingPTW.length === 0}
						class="flex-[2] rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white py-2.5 text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(139,126,248,0.3)] active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center"
					>
						Roll Selected
					</Dialog.Close>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
