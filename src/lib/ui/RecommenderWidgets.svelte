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
	import Dialog from './Dialog.svelte';
	import { Dice5, Sparkles, LoaderCircle, Settings, ListFilter, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy } from 'svelte';

	let loading = $state(false);
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

	/** Load the current season's anime lazily, from cache or MAL. Returns [] on failure. */
	async function getSeasonalPool(): Promise<DisplayAnime[]> {
		const current = getCurrentSeason();
		const cacheKey = `seasonal:${current.year}:${current.season}`;
		const cached = await getSeasonalCache(cacheKey);
		if (cached && cached.value.length > 0) return cached.value;

		const result = await getSeasonal(current.year, current.season, { limit: 500 });
		if (!result.ok || result.value.data.length === 0) return [];

		const fetched = result.value.data.map((item) => mapMalNodeToDisplay(item.node));
		await setSeasonalCache(cacheKey, fetched);
		return fetched;
	}

	function randomFrom<T>(list: T[]): T | null {
		return list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
	}

	onMount(() => {
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
	});

	$effect(() => {
		const _ = [selectedGenres, selectedFormats, minScore];
		try {
			localStorage.setItem(
				STORAGE_KEYS.PTW_FILTERS,
				JSON.stringify({ genres: selectedGenres, formats: selectedFormats, minScore })
			);
		} catch (e) {
			logger.warn('Failed to save PTW filters to localStorage:', e);
		}
	});

	let rollingPTW = $state(false);
	let rolledTitle = $state('');

	let rouletteInterval: ReturnType<typeof setInterval> | null = null;
	let rouletteTimeout: ReturnType<typeof setTimeout> | null = null;

	onDestroy(() => {
		if (rouletteInterval) clearInterval(rouletteInterval);
		if (rouletteTimeout) clearTimeout(rouletteTimeout);
	});

	function runRoulette() {
		if (rollingPTW) return;
		if (matchingPTW.length === 0) {
			toast.info('No matching anime found. Adjust your filters.');
			return;
		}

		rollingPTW = true;
		filterDialogOpen = false;
		const duration = 800;
		const intervalMs = 80;
		const steps = duration / intervalMs;
		let step = 0;

		rouletteInterval = setInterval(() => {
			const temp = matchingPTW[Math.floor(Math.random() * matchingPTW.length)];
			rolledTitle = temp.titleEnglish || temp.title;
			step++;
			if (step >= steps && rouletteInterval) {
				clearInterval(rouletteInterval);
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
		if (loading) return;
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

<div class="discovery-actions">
	<div class="discovery-choice">
		<button
			class="discovery-main"
			onclick={runRoulette}
			disabled={rollingPTW}
			aria-label="Roll Plan to Watch Roulette"
		>
			<Dice5 size={22} />
			<span
				><strong>{rollingPTW ? rolledTitle : 'From your planned list'}</strong><small
					>{rollingPTW
						? 'Choosing a story…'
						: `${matchingPTW.length} ${matchingPTW.length === 1 ? 'title' : 'titles'} to choose from`}</small
				></span
			>
		</button>
		<button
			class="discovery-settings"
			onclick={() => (filterDialogOpen = true)}
			aria-expanded={filterDialogOpen}
			aria-label="Filter planned roulette"
			title="Filter planned roulette"><Settings size={18} /></button
		>
	</div>
	<button
		class="discovery-choice discovery-main"
		onclick={getRandomSeasonal}
		disabled={loading}
		aria-label="Roll Seasonal Surprise"
	>
		{#if loading}<LoaderCircle size={22} class="animate-spin" />{:else}<Sparkles size={22} />{/if}
		<span
			><strong>Something this season</strong><small
				>{loading ? 'Finding a story…' : 'Pick an airing anime'}</small
			></span
		>
	</button>
</div>

<!-- PTW Filters Modal -->
<Dialog bind:open={filterDialogOpen}>
	<div class="flex items-center justify-between">
		<h2 class="text-base font-bold text-text-primary flex items-center gap-2">
			<ListFilter size={16} class="text-primary" />
			PTW Roulette Filters
		</h2>
		<button
			onclick={() => (filterDialogOpen = false)}
			class="min-h-11 min-w-11 flex items-center justify-center rounded-full p-1.5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all active:scale-95 cursor-pointer"
			aria-label="Close filters"
		>
			<X size={16} />
		</button>
	</div>

	<div class="mt-5 flex flex-col gap-5">
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
								selectedGenres = active
									? selectedGenres.filter((id) => id !== genre.id)
									: [...selectedGenres, genre.id];
							}}
							aria-pressed={active}
							class="min-h-11 rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer {active
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
								selectedFormats = active
									? selectedFormats.filter((f) => f !== format)
									: [...selectedFormats, format];
							}}
							aria-pressed={active}
							class="min-h-11 rounded-full border px-2.5 py-1 text-xs font-medium uppercase transition-all cursor-pointer {active
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
					aria-label="Minimum MAL rating"
					class="flex-1 accent-primary cursor-pointer min-h-11 rounded-full bg-white/10 border-none outline-none"
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
				class="min-h-11 flex-1 rounded-xl border border-white/10 bg-surface-2 py-2.5 text-xs font-semibold text-text-secondary transition-all hover:bg-white/10 hover:text-text-primary cursor-pointer"
			>
				Reset
			</button>
			<button
				onclick={runRoulette}
				disabled={matchingPTW.length === 0}
				class="min-h-11 flex-[2] rounded-xl bg-primary text-[#25140f] py-2.5 text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(139,126,248,0.3)] active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center"
			>
				Roll Selected
			</button>
		</div>
	</div>
</Dialog>

<style>
	.discovery-actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-top: 24px;
	}
	.discovery-choice {
		display: flex;
		align-items: stretch;
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: linear-gradient(145deg, var(--color-surface-2), var(--color-surface-1));
	}
	.discovery-main {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
		min-height: 76px;
		padding: 14px 18px;
		text-align: left;
		flex: 1;
	}
	.discovery-main :global(svg) {
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.discovery-main > span {
		min-width: 0;
	}
	.discovery-main strong {
		display: block;
		font-size: 14px;
		font-weight: 550;
		overflow-wrap: anywhere;
	}
	.discovery-main small {
		display: block;
		margin-top: 3px;
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.discovery-main:hover:not(:disabled) {
		background: #ffffff04;
	}
	.discovery-settings {
		min-width: 48px;
		display: grid;
		place-items: center;
		border-left: 1px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.discovery-settings:hover {
		color: var(--color-primary);
	}
	@media (max-width: 640px) {
		.discovery-actions {
			grid-template-columns: minmax(0, 1fr);
			gap: 10px;
			margin-top: 20px;
		}
		.discovery-main {
			min-height: 72px;
			padding: 12px 16px;
		}
	}
</style>
