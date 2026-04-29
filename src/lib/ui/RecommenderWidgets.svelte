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
	let selectedPTW = $state<{ malId: number } | null>(null);
	let selectedSeasonal = $state<{ malId: number } | null>(null);

	onMount(async () => {
		initializing = true;

		// Get random PTW anime
		const ptw = userListStore.planToWatch;
		if (ptw && ptw.length > 0) {
			const random = ptw[Math.floor(Math.random() * ptw.length)];
			selectedPTW = { malId: random.malId };
		}

		// Get random seasonal anime
		try {
			const current = getCurrentSeason();
			const result = await getSeasonal(current.year, current.season, { limit: 50 });
			if (result.ok && result.value.data.length > 0) {
				const random = result.value.data[Math.floor(Math.random() * result.value.data.length)];
				selectedSeasonal = { malId: random.node.id };
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
				selectedSeasonal = { malId: random.node.id };
				goto(`/anime/${random.node.id}`);
			}
		} catch (error) {
			toast.error('An error occurred.');
		} finally {
			loading = false;
		}
	}
</script>

{#snippet widget({
	title,
	desc,
	icon: Icon,
	action,
	isLoading,
	colorClass,
	gradientClass,
	loadingIcon: LoadingIcon
}: any)}
	<button onclick={action} disabled={isLoading} class="group glass-widget">
		<!-- Background gradient -->
		<div
			class="absolute inset-0 bg-gradient-to-br {gradientClass} opacity-5 transition-opacity duration-300 group-hover:opacity-10 pointer-events-none"
		></div>

		<!-- Large SVG in background/middle -->
		<div
			class="absolute inset-0 flex items-center justify-center opacity-[0.03] transition-transform duration-700 group-hover:scale-125 group-hover:opacity-[0.06] group-active:scale-100 pointer-events-none"
		>
			<Icon size={150} class={colorClass} strokeWidth={1} />
		</div>

		<div class="relative z-10 flex flex-col items-center justify-center w-full">
			<div class="glass-icon-wrapper">
				{#if isLoading && LoadingIcon}
					<LoadingIcon
						size={24}
						class="animate-spin {colorClass} drop-shadow-[0_0_8px_currentColor]"
					/>
				{:else}
					<Icon size={24} class="{colorClass} drop-shadow-[0_0_8px_currentColor]" />
				{/if}
			</div>
			<h3 class="text-[13px] sm:text-base font-bold text-text-primary mb-1 tracking-tight">
				{title}
			</h3>
			<p
				class="text-[11px] sm:text-sm text-text-secondary leading-snug opacity-80 group-hover:opacity-100 transition-opacity max-w-[95%] mx-auto"
			>
				{desc}
			</p>
		</div>
	</button>
{/snippet}

<div class="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:mt-8">
	{@render widget({
		title: 'PTW Roulette',
		desc: 'Random from backlog',
		icon: Dice5,
		action: getRandomPlanToWatch,
		isLoading: false,
		colorClass: 'text-primary',
		gradientClass: 'from-primary via-transparent to-transparent'
	})}

	{@render widget({
		title: 'Seasonal Surprise',
		desc: 'Random airing anime',
		icon: Sparkles,
		action: getRandomSeasonal,
		isLoading: loading,
		loadingIcon: Loader2,
		colorClass: 'text-pink-400',
		gradientClass: 'from-pink-500 via-transparent to-transparent'
	})}
</div>
