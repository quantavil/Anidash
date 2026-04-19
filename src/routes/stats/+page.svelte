<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { authStore } from '$lib/auth/auth.svelte';
	import { formatMediaType, formatRelativeDate, formatStatus } from '$lib/utils/format';
	import {
		Film,
		Star,
		Tv,
		Play,
		Calendar,
		CircleCheck,
		Pause,
		Trash,
		Clock
	} from 'lucide-svelte';
	import StatCard from '$lib/ui/StatCard.svelte';
	import EpisodeCounter from '$lib/ui/EpisodeCounter.svelte';
	import CompleteAnimeDialog from '$lib/ui/CompleteAnimeDialog.svelte';
	import ImageWithFallback from '$lib/ui/ImageWithFallback.svelte';

	// ─── Stats ───

	const stats = $derived.by(() => {
		const entries = userListStore.allEntries;
		const totalEpisodes = entries.reduce((sum, e) => sum + e.numWatchedEpisodes, 0);
		const scored = entries.filter((e) => e.score > 0);
		const meanScore = scored.length > 0
			? scored.reduce((sum, e) => sum + e.score, 0) / scored.length
			: 0;
		const daysWatched = Math.round((totalEpisodes * 24) / 60) / 10; // rough estimate: 24min/ep

		return {
			total: entries.length,
			watching: userListStore.watching.length,
			planToWatch: userListStore.planToWatch.length,
			completed: userListStore.completed.length,
			onHold: userListStore.onHold.length,
			dropped: userListStore.dropped.length,
			totalEpisodes,
			meanScore,
			daysWatched
		};
	});

	const watching = $derived(
		userListStore.watching
			.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
			.slice(0, 6)
	);

	const recentlyUpdated = $derived(
		userListStore.allEntries
			.filter((e) => e.updatedAt)
			.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
			.slice(0, 8)
	);


	// ─── Complete prompt ───

	let showCompleteDialog = $state(false);
	let completeTargetId = $state<number | null>(null);

	function handleCompletePrompt(malId: number) {
		completeTargetId = malId;
		showCompleteDialog = true;
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-6">
	<!-- Greeting -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-text-primary">
			Welcome back{authStore.user?.name ? `, ${authStore.user.name}` : ''}
		</h1>
		<p class="mt-1 text-sm text-text-secondary">
			{#if syncStore.lastSynced}
				Last synced {formatRelativeDate(new Date(syncStore.lastSynced).toISOString())}
			{:else}
				Sync your list to get started
			{/if}
		</p>
	</div>

	<!-- Stats Grid -->
	<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
		<StatCard
			label="Watching"
			value={stats.watching}
			icon={Play}
			color="text-primary"
			href="/?tab=watching"
		/>
		<StatCard
			label="Plan to Watch"
			value={stats.planToWatch}
			icon={Calendar}
			color="text-info"
			href="/?tab=plan_to_watch"
		/>
		<StatCard
			label="Completed"
			value={stats.completed}
			icon={CircleCheck}
			color="text-success"
			href="/?tab=completed"
		/>
		<StatCard
			label="On Hold"
			value={stats.onHold}
			icon={Pause}
			color="text-warning"
			href="/?tab=on_hold"
		/>
		<StatCard
			label="Dropped"
			value={stats.dropped}
			icon={Trash}
			color="text-error"
			href="/?tab=dropped"
		/>
		<StatCard label="All Anime" value={stats.total} icon={Tv} href="/?tab=all" />
	</div>

	<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
		<StatCard label="Episodes" value={stats.totalEpisodes.toLocaleString()} icon={Film} />
		<StatCard
			label="Mean Score"
			value={stats.meanScore > 0 ? stats.meanScore.toFixed(1) : '—'}
			icon={Star}
		/>
		<StatCard
			label="Days Watched"
			value={stats.daysWatched > 0 ? stats.daysWatched.toFixed(1) : '—'}
			icon={Clock}
		/>
	</div>

	<!-- Continue Watching -->
	{#if watching.length > 0}
		<section class="mb-8">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-text-primary">Continue Watching</h2>
				<a href="/?tab=watching" class="text-sm text-primary hover:text-primary-hover">
					View all →
				</a>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each watching as entry}
					<a
						href="/anime/{entry.malId}"
						class="group flex gap-3 rounded-xl border border-border bg-surface-1 p-3 transition-all hover:border-primary/40 hover:bg-surface-2"
					>
						<ImageWithFallback
							src={entry.mainPicture?.medium}
							alt={entry.title}
							aspectRatio="3/4"
							class="h-24 w-[68px] shrink-0 rounded-lg overflow-hidden"
						/>
						<div class="min-w-0 flex-1">
							<h3
								class="line-clamp-2 text-sm font-medium text-text-primary group-hover:text-primary"
							>
								{entry.title}
							</h3>
							<div class="mt-1 flex items-center gap-2 text-xs text-text-muted">
								{#if entry.mediaType}
									<span>{formatMediaType(entry.mediaType)}</span>
								{/if}
								{#if entry.mean}
									<span>★ {entry.mean.toFixed(1)}</span>
								{/if}
							</div>
							<div class="mt-2">
								<EpisodeCounter
									malId={entry.malId}
									watched={entry.numWatchedEpisodes}
									total={entry.numEpisodes}
									onComplete={() => handleCompletePrompt(entry.malId)}
								/>
							</div>
							{#if entry.updatedAt}
								<p class="mt-1 text-[10px] text-text-muted">
									{formatRelativeDate(entry.updatedAt)}
								</p>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Recently Updated -->
	{#if recentlyUpdated.length > 0}
		<section class="mb-8">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-text-primary">Recently Updated</h2>
				<a href="/?sort=updated" class="text-sm text-primary hover:text-primary-hover">
					View all →
				</a>
			</div>

			<div class="overflow-x-auto rounded-xl border border-border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface-1 text-left text-xs text-text-muted">
							<th class="px-4 py-2.5 font-medium">Title</th>
							<th class="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
							<th class="hidden px-4 py-2.5 font-medium md:table-cell">Progress</th>
							<th class="px-4 py-2.5 font-medium">Updated</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each recentlyUpdated as entry}
							<tr class="bg-surface-0 transition-colors hover:bg-surface-1">
								<td class="px-4 py-2.5">
									<a href="/anime/{entry.malId}" class="text-text-primary hover:text-primary">
										{entry.title}
									</a>
								</td>
								<td class="hidden px-4 py-2.5 sm:table-cell">
									<span
										class={[
											'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
											entry.status === 'watching' && 'bg-primary/15 text-primary',
											entry.status === 'completed' && 'bg-success/15 text-success',
											entry.status === 'on_hold' && 'bg-warning/15 text-warning',
											entry.status === 'dropped' && 'bg-error/15 text-error',
											entry.status === 'plan_to_watch' && 'bg-info/15 text-info'
										]}
									>
										{formatStatus(entry.status)}
									</span>
								</td>
								<td class="hidden px-4 py-2.5 text-text-secondary md:table-cell">
									{entry.numWatchedEpisodes}/{entry.numEpisodes || '?'}
								</td>
								<td class="px-4 py-2.5 text-text-muted">
									{entry.updatedAt ? formatRelativeDate(entry.updatedAt) : '—'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>

<!-- Complete Confirmation Dialog -->
<CompleteAnimeDialog
	bind:open={showCompleteDialog}
	bind:malId={completeTargetId}
/>
