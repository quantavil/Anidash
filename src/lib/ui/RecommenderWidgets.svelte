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
	import { Dice5, Sparkles, LoaderCircle, SlidersHorizontal, X } from 'lucide-svelte';
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

		const result = await getSeasonal(current.year, current.season, { limit: 50 });
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

<!-- Quick picks: pick something for me. -->
<div class="picks">
	<div class="pick">
		<button
			class="pick-main"
			onclick={runRoulette}
			disabled={rollingPTW}
			aria-label="Roll Plan to Watch Roulette"
		>
			{#if rollingPTW}<LoaderCircle size={18} class="animate-spin" />{:else}<Dice5 size={18} />{/if}
			<span class="pick-text">
				<strong>{rollingPTW ? rolledTitle : 'Plan to Watch roulette'}</strong>
				<span>
					{#if rollingPTW}Picking…
					{:else if ptwEntries.length === 0}Your backlog is empty
					{:else if selectedGenres.length > 0 || selectedFormats.length > 0 || minScore > 0}{matchingPTW.length}
						{matchingPTW.length === 1 ? 'match' : 'matches'} with your filters
					{:else}One at random from {ptwEntries.length} saved{/if}
				</span>
			</span>
		</button>
		<button
			class="pick-side"
			onclick={() => (filterDialogOpen = true)}
			aria-expanded={filterDialogOpen}
			aria-label="Roulette filters"
			title="Roulette filters"><SlidersHorizontal size={16} /></button
		>
	</div>
	<div class="pick">
		<button
			class="pick-main"
			onclick={getRandomSeasonal}
			disabled={loading}
			aria-label="Roll Seasonal Surprise"
		>
			{#if loading}<LoaderCircle size={18} class="animate-spin" />{:else}<Sparkles size={18} />{/if}
			<span class="pick-text">
				<strong>Seasonal surprise</strong>
				<span>{loading ? 'Loading…' : 'Something airing this season'}</span>
			</span>
		</button>
	</div>
</div>

<Dialog bind:open={filterDialogOpen} sheet label="Roulette filters">
	<div class="dlg-head">
		<h2>Roulette filters</h2>
		<button
			class="btn btn-ghost btn-icon"
			onclick={() => (filterDialogOpen = false)}
			aria-label="Close filters"><X size={17} /></button
		>
	</div>

	<div class="dlg-body">
		<fieldset>
			<legend>Genres</legend>
			{#if availableMetadata.genres.length === 0}
				<p class="none">No genres in your backlog yet.</p>
			{:else}
				<div class="chips">
					{#each availableMetadata.genres as genre (genre.id)}
						{@const active = selectedGenres.includes(genre.id)}
						<button
							class="chip"
							aria-pressed={active}
							onclick={() => {
								selectedGenres = active
									? selectedGenres.filter((id) => id !== genre.id)
									: [...selectedGenres, genre.id];
							}}>{genre.name}</button
						>
					{/each}
				</div>
			{/if}
		</fieldset>

		<fieldset>
			<legend>Format</legend>
			{#if availableMetadata.formats.length === 0}
				<p class="none">No formats in your backlog yet.</p>
			{:else}
				<div class="chips">
					{#each availableMetadata.formats as format (format)}
						{@const active = selectedFormats.includes(format)}
						<button
							class="chip"
							aria-pressed={active}
							onclick={() => {
								selectedFormats = active
									? selectedFormats.filter((f) => f !== format)
									: [...selectedFormats, format];
							}}>{format.toUpperCase()}</button
						>
					{/each}
				</div>
			{/if}
		</fieldset>

		<fieldset>
			<legend>
				Minimum MAL rating <span class="val num"
					>{minScore === 0 ? 'any' : `${minScore.toFixed(1)}+`}</span
				>
			</legend>
			<input
				type="range"
				min="0"
				max="10"
				step="0.5"
				bind:value={minScore}
				aria-label="Minimum MAL rating"
			/>
		</fieldset>

		<p class="eligible">
			<span>Eligible titles</span><strong class="num">{matchingPTW.length}</strong>
		</p>

		<div class="dlg-actions">
			<button
				class="btn"
				onclick={() => {
					selectedGenres = [];
					selectedFormats = [];
					minScore = 0;
				}}>Reset</button
			>
			<button class="btn btn-primary" onclick={runRoulette} disabled={matchingPTW.length === 0}
				>Roll</button
			>
		</div>
	</div>
</Dialog>

<style>
	.picks {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	@media (max-width: 640px) {
		.picks {
			grid-template-columns: 1fr;
		}
	}
	.pick {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-m);
		background: var(--color-surface-1);
		overflow: hidden;
		transition: border-color 0.15s;
	}
	.pick:hover {
		border-color: var(--color-border-strong);
	}
	.pick-main {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 60px;
		padding: 0 16px;
		min-width: 0;
		text-align: left;
		color: var(--color-primary);
	}
	.pick-main:hover:not(:disabled) {
		background: var(--color-surface-2);
	}
	.pick-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		color: var(--color-text-secondary);
		font-size: 12px;
	}
	.pick-text strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-primary);
		font-size: 14px;
		font-weight: 600;
	}
	.pick-text span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pick-side {
		display: grid;
		place-items: center;
		width: 52px;
		border-left: 1px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.pick-side:hover {
		background: var(--color-surface-2);
		color: var(--color-text-primary);
	}
	.dlg-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -8px -8px 8px 0;
	}
	h2 {
		font-family: var(--font-display);
		font-size: 20px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
	.dlg-body {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		display: flex;
		justify-content: space-between;
		width: 100%;
		margin-bottom: 10px;
		font-size: 13px;
		font-weight: 600;
	}
	.val {
		color: var(--color-primary);
		font-weight: 600;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		max-height: 160px;
		overflow-y: auto;
	}
	.none {
		color: var(--color-text-muted);
		font-size: 13px;
	}
	input[type='range'] {
		width: 100%;
		accent-color: var(--color-primary);
		min-height: 44px;
	}
	.eligible {
		display: flex;
		justify-content: space-between;
		padding: 12px 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-m);
		font-size: 13px;
		color: var(--color-text-secondary);
	}
	.eligible strong {
		color: var(--color-text-primary);
	}
	.dlg-actions {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 8px;
	}
</style>
