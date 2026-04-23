<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { authStore } from '$lib/auth/auth.svelte';
	import { formatMediaType, formatRelativeDate, formatStatus } from '$lib/utils/format';
	import { Film, Star, Tv, Play, Calendar, CircleCheck, Pause, Trash, Clock } from 'lucide-svelte';
	import StatCard from '$lib/ui/StatCard.svelte';
	import EpisodeCounter from '$lib/ui/EpisodeCounter.svelte';
	import CompleteAnimeDialog from '$lib/ui/CompleteAnimeDialog.svelte';
	import ImageWithFallback from '$lib/ui/ImageWithFallback.svelte';

	// ─── Stats ───

	const stats = $derived.by(() => {
		const entries = userListStore.allEntries;
		const totalEpisodes = entries.reduce((sum, e) => sum + e.numWatchedEpisodes, 0);
		const scored = entries.filter((e) => e.score > 0);
		const meanScore =
			scored.length > 0 ? scored.reduce((sum, e) => sum + e.score, 0) / scored.length : 0;
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

	const analytics = $derived.by(() => {
		const entries = userListStore.allEntries;

		// Score distribution (1-10)
		const scoreDist = Array(10).fill(0);
		let maxScoreCount = 0;
		entries.forEach((e) => {
			if (e.score >= 1 && e.score <= 10) {
				scoreDist[Math.floor(e.score) - 1]++;
				maxScoreCount = Math.max(maxScoreCount, scoreDist[Math.floor(e.score) - 1]);
			}
		});

		// Format distribution
		const formatDist: Record<string, number> = {};
		entries.forEach((e) => {
			const type = e.mediaType || 'unknown';
			formatDist[type] = (formatDist[type] || 0) + 1;
		});

		const formats = Object.entries(formatDist)
			.map(([label, count]) => ({ label: formatMediaType(label), count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		const maxFormatCount = formats[0]?.count || 1;

		return {
			scoreDist,
			maxScoreCount: maxScoreCount || 1,
			formats,
			maxFormatCount
		};
	});

	const statCards = $derived([
		{
			label: 'Watching',
			value: stats.watching,
			icon: Play,
			color: 'text-primary',
			href: '/?tab=watching'
		},
		{
			label: 'Plan to Watch',
			value: stats.planToWatch,
			icon: Calendar,
			color: 'text-info',
			href: '/?tab=plan_to_watch'
		},
		{
			label: 'Completed',
			value: stats.completed,
			icon: CircleCheck,
			color: 'text-success',
			href: '/?tab=completed'
		},
		{
			label: 'On Hold',
			value: stats.onHold,
			icon: Pause,
			color: 'text-warning',
			href: '/?tab=on_hold'
		},
		{
			label: 'Dropped',
			value: stats.dropped,
			icon: Trash,
			color: 'text-error',
			href: '/?tab=dropped'
		},
		{ label: 'All Anime', value: stats.total, icon: Tv, href: '/?tab=all' }
	]);

	const summaryCards = $derived([
		{ label: 'Episodes', value: stats.totalEpisodes.toLocaleString(), icon: Film },
		{
			label: 'Mean Score',
			value: stats.meanScore > 0 ? stats.meanScore.toFixed(1) : '—',
			icon: Star
		},
		{
			label: 'Days Watched',
			value: stats.daysWatched > 0 ? stats.daysWatched.toFixed(1) : '—',
			icon: Clock
		}
	]);

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
		{#each statCards as card (card.label)}
			<StatCard {...card} />
		{/each}
	</div>

	<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each summaryCards as card, i (card.label)}
			<StatCard {...card} class={i === summaryCards.length - 1 ? 'col-span-2 sm:col-span-1' : ''} />
		{/each}
	</div>

	<!-- Visual Analytics -->
	{#if stats.total > 0}
		<div class="mb-8 grid gap-4 lg:grid-cols-2">
			<!-- Score Distribution -->
			<section
				class="rounded-2xl border border-white/5 bg-surface-1/40 p-5 shadow-xl backdrop-blur-md"
			>
				<h2 class="mb-4 text-sm font-semibold text-text-primary">Score Distribution</h2>
				<div class="flex h-32 items-end gap-1.5 sm:gap-2">
					{#each analytics.scoreDist as count, i}
						{@const heightPct =
							count === 0 ? 0 : Math.max(5, (count / analytics.maxScoreCount) * 100)}
						<div class="group relative flex flex-1 flex-col items-center gap-1">
							<!-- Tooltip -->
							<div
								class="absolute -top-8 hidden rounded bg-surface-3 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block whitespace-nowrap z-10 pointer-events-none"
							>
								{count} series
							</div>

							<div
								class="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80
								{i >= 7 ? 'bg-success' : i >= 4 ? 'bg-primary' : 'bg-warning'}"
								style="height: {heightPct}%"
							></div>
							<span class="text-[10px] sm:text-xs font-medium text-text-muted">{i + 1}</span>
						</div>
					{/each}
				</div>
			</section>

			<!-- Format Distribution -->
			<section
				class="rounded-2xl border border-white/5 bg-surface-1/40 p-5 shadow-xl backdrop-blur-md"
			>
				<h2 class="mb-4 text-sm font-semibold text-text-primary">Format Distribution</h2>
				<div class="flex h-32 flex-col justify-end gap-3 pb-[18px]">
					{#each analytics.formats as f}
						<div class="flex items-center gap-3">
							<span class="w-16 shrink-0 truncate text-xs font-medium text-text-muted text-right">
								{f.label}
							</span>
							<div class="relative h-4 flex-1 overflow-hidden rounded-full bg-surface-2">
								<div
									class="absolute left-0 top-0 h-full rounded-full bg-primary/70 transition-all duration-500 ease-out"
									style="width: {(f.count / analytics.maxFormatCount) * 100}%"
								></div>
							</div>
							<span class="w-8 shrink-0 text-xs font-medium text-text-primary">
								{f.count}
							</span>
						</div>
					{/each}
				</div>
			</section>
		</div>
	{/if}

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
<CompleteAnimeDialog bind:open={showCompleteDialog} bind:malId={completeTargetId} />
