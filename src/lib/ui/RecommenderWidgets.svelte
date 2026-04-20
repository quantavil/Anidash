<script lang="ts">
	import { goto } from '$app/navigation';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { getSeasonal } from '$lib/api/mal';
	import { getCurrentSeason } from '$lib/utils/season';
	import { Dice5, Sparkles, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let loading = $state(false);
	let initializing = $state(false);
	let selectedPTW = $state<{ malId: number; poster: string | null } | null>(null);
	let selectedSeasonal = $state<{ malId: number; poster: string | null } | null>(null);

	onMount(async () => {
		initializing = true;

		// Get random PTW anime
		const ptw = userListStore.planToWatch;
		if (ptw && ptw.length > 0) {
			const random = ptw[Math.floor(Math.random() * ptw.length)];
			selectedPTW = {
				malId: random.malId,
				poster: random.mainPicture?.large || random.mainPicture?.medium || null
			};
		}

		// Get random seasonal anime
		try {
			const current = getCurrentSeason();
			const result = await getSeasonal(current.year, current.season, { limit: 50 });
			if (result.ok && result.value.data.length > 0) {
				const random = result.value.data[Math.floor(Math.random() * result.value.data.length)];
				selectedSeasonal = { malId: random.node.id, poster: random.node.main_picture?.medium || null };
			}
		} catch (error) {
			// Silently fail if seasonal loading fails
		}

		initializing = false;
	});

	function getRandomPlanToWatch() {
		if (selectedPTW) {
			goto(`/anime/${selectedPTW.malId}`);
		} else {
			toast.info('Your Plan to Watch list is empty.');
		}
	}

	async function getRandomSeasonal() {
		if (loading || initializing) return;
		loading = true;
		try {
			if (selectedSeasonal) {
				goto(`/anime/${selectedSeasonal.malId}`);
			} else {
				// Fallback if no seasonal anime was loaded on mount
				const current = getCurrentSeason();
				const result = await getSeasonal(current.year, current.season, { limit: 50 });

				if (!result.ok) {
					toast.error('Failed to load seasonal anime.');
					return;
				}

				const animeList = result.value.data;
				if (animeList.length === 0) {
					toast.info('No seasonal anime found.');
					return;
				}

				const random = animeList[Math.floor(Math.random() * animeList.length)];
				selectedSeasonal = { malId: random.node.id, poster: random.node.main_picture?.medium || null };
				goto(`/anime/${random.node.id}`);
			}
		} catch (error) {
			toast.error('An error occurred.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
	<!-- PTW Widget -->
	<button
		onclick={getRandomPlanToWatch}
		class="group relative overflow-hidden rounded-2xl border border-white/10 p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95 cursor-pointer sm:p-8 backdrop-blur-xl"
		style="background-image: {selectedPTW?.poster ? `url(${selectedPTW.poster})` : 'none'}; background-size: cover; background-position: center;"
	>
		<!-- Background gradient / reflection -->
		<div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-surface-1/80 to-surface-1/95 opacity-90 transition-opacity group-hover:opacity-80"></div>
		
		<div class="relative z-10 flex items-start justify-between">
			<div>
				<div class="mb-3 inline-flex rounded-xl bg-white/10 p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md">
					<Dice5 size={24} class="text-primary drop-shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" />
				</div>
				<h3 class="text-lg font-bold text-text-primary">Plan to Watch Roulette</h3>
				<p class="mt-1 text-sm text-text-secondary">Pick a random anime from your backlog.</p>
			</div>
		</div>
	</button>

	<!-- Seasonal Widget -->
	<button
		onclick={getRandomSeasonal}
		disabled={loading}
		class="group relative overflow-hidden rounded-2xl border border-white/10 p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95 cursor-pointer sm:p-8 backdrop-blur-xl disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
		style="background-image: {selectedSeasonal?.poster ? `url(${selectedSeasonal.poster})` : 'none'}; background-size: cover; background-position: center;"
	>
		<!-- Background gradient / reflection -->
		<div class="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-surface-1/80 to-surface-1/95 opacity-90 transition-opacity group-hover:opacity-80"></div>
		
		<div class="relative z-10 flex items-start justify-between">
			<div>
				<div class="mb-3 inline-flex rounded-xl bg-white/10 p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md">
					{#if loading}
						<Loader2 size={24} class="animate-spin text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
					{:else}
						<Sparkles size={24} class="text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
					{/if}
				</div>
				<h3 class="text-lg font-bold text-text-primary">Seasonal Surprise</h3>
				<p class="mt-1 text-sm text-text-secondary">Discover a random anime airing right now.</p>
			</div>
		</div>
	</button>
</div>