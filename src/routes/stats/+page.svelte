<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { authStore } from '$lib/auth/auth.svelte';
	import { formatRelativeDate } from '$lib/utils/format';
	import EpisodeStepper from '$lib/ui/EpisodeStepper.svelte';
	import ImageWithFallback from '$lib/ui/ImageWithFallback.svelte';
	import AnimeTitle from '$lib/ui/AnimeTitle.svelte';
	import { STATUS_META, STATUS_ORDER } from '$lib/ui/status';
	import type { AnimeStatus } from '$lib/cache/db';

	// ─── Stats ───

	const stats = $derived.by(() => {
		const entries = userListStore.allEntries;
		const totalEpisodes = entries.reduce((sum, e) => sum + e.numWatchedEpisodes, 0);
		const scored = entries.filter((e) => e.score > 0);
		const meanScore =
			scored.length > 0 ? scored.reduce((sum, e) => sum + e.score, 0) / scored.length : 0;
		const daysWatched = Math.round((totalEpisodes / 60) * 10) / 10; // rough estimate: 24min/ep

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

		// Genre distribution
		const genreDist: Record<string, number> = {};
		entries.forEach((e) => {
			(e.genres ?? []).forEach((g) => {
				const name = g.name;
				if (name) genreDist[name] = (genreDist[name] || 0) + 1;
			});
		});

		const allGenres = Object.entries(genreDist)
			.map(([label, count]) => ({ label, count }))
			.sort((a, b) => b.count - a.count);

		const topGenres = allGenres.slice(0, 8);
		const maxGenre = topGenres[0]?.count ?? 1;

		return {
			scoreDist,
			maxScoreCount: maxScoreCount || 1,
			topGenres,
			maxGenre
		};
	});

	const distribution = $derived(
		STATUS_ORDER.map((key) => ({
			key,
			count: userListStore.statusCounts[key] ?? 0,
			pct: stats.total > 0 ? ((userListStore.statusCounts[key] ?? 0) / stats.total) * 100 : 0
		}))
	);

	const kpis = $derived([
		{ label: 'Titles', value: stats.total.toLocaleString() },
		{ label: 'Episodes watched', value: stats.totalEpisodes.toLocaleString() },
		{ label: 'Days watched', value: stats.daysWatched > 0 ? stats.daysWatched.toFixed(1) : '—' },
		{ label: 'Mean score', value: stats.meanScore > 0 ? stats.meanScore.toFixed(1) : '—' }
	]);

	const watching = $derived(
		[...userListStore.watching]
			.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
			.slice(0, 8)
	);

	const recentlyUpdated = $derived(
		userListStore.allEntries
			.filter((e) => e.updatedAt)
			.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
			.slice(0, 8)
	);
</script>

<svelte:head>
	<title>Stats | AniDash</title>
</svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<h1 class="page-title">Stats</h1>
			<p class="page-sub">
				{authStore.user?.name ? `${authStore.user.name} · ` : ''}{#if syncStore.lastSynced}last
					synced
					{formatRelativeDate(new Date(syncStore.lastSynced).toISOString())}{:else}sync your list to
					get started{/if}
			</p>
		</div>
	</div>

	<dl class="kpis">
		{#each kpis as kpi (kpi.label)}
			<div class="kpi">
				<dd class="num">{kpi.value}</dd>
				<dt>{kpi.label}</dt>
			</div>
		{/each}
	</dl>

	{#if stats.total > 0}
		<section class="block" aria-labelledby="dist">
			<h2 id="dist">Where your list stands</h2>
			<div class="dist-bar" role="img" aria-label="Share of your list by status">
				{#each distribution as seg (seg.key)}
					{#if seg.count > 0}<span
							style:width="{seg.pct}%"
							style:background={STATUS_META[seg.key].color}
						></span>{/if}
				{/each}
			</div>
			<ul class="legend">
				{#each distribution as seg (seg.key)}
					<li>
						<a href={seg.key === 'watching' ? '/' : `/?tab=${seg.key}`}>
							<span class="status-dot" style:--dot={STATUS_META[seg.key as AnimeStatus].color}
							></span>
							<span class="name">{STATUS_META[seg.key as AnimeStatus].label}</span>
							<strong class="num">{seg.count.toLocaleString()}</strong>
							<span class="pct num">{Math.round(seg.pct)}%</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<div class="two">
			<section class="block" aria-labelledby="scores">
				<h2 id="scores">Your scores</h2>
				<div class="hist">
					{#each analytics.scoreDist as count, i (i)}
						{@const h = count === 0 ? 0 : Math.max(4, (count / analytics.maxScoreCount) * 100)}
						<div class="col" title="{count} rated {i + 1}">
							<span class="n num">{count || ''}</span>
							<span class="bar" style:height="{h}%"></span>
							<span class="x num">{i + 1}</span>
						</div>
					{/each}
				</div>
			</section>

			<section class="block" aria-labelledby="genres">
				<h2 id="genres">Top genres</h2>
				<ul class="genres">
					{#each analytics.topGenres as g (g.label)}
						<li>
							<span class="g-name">{g.label}</span>
							<span class="g-track"
								><span style:width="{(g.count / analytics.maxGenre) * 100}%"></span></span
							>
							<span class="g-count num">{g.count}</span>
						</li>
					{/each}
				</ul>
			</section>
		</div>
	{/if}

	{#if watching.length > 0}
		<section class="block" aria-labelledby="cont">
			<div class="block-head">
				<h2 id="cont">Continue watching</h2>
				<a href="/">View all</a>
			</div>
			<ul class="shelf scrollbar-none">
				{#each watching as entry (entry.malId)}
					<li>
						<a class="poster" href="/anime/{entry.malId}" aria-label="View {entry.title} details">
							<ImageWithFallback
								src={entry.mainPicture?.medium}
								alt=""
								aspectRatio="2/3"
								class="shelf-img"
							/>
						</a>
						<AnimeTitle
							title={entry.title}
							titleEnglish={entry.titleEnglish}
							tag="h3"
							interactive={false}
							class="shelf-title"
						/>
						<EpisodeStepper
							malId={entry.malId}
							title={entry.title}
							watched={entry.numWatchedEpisodes}
							total={entry.numEpisodes}
							size="card"
						/>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if recentlyUpdated.length > 0}
		<section class="block" aria-labelledby="recent">
			<div class="block-head">
				<h2 id="recent">Recently updated</h2>
				<a href="/?sort=updated&tab=all">View all</a>
			</div>
			<table class="recent">
				<thead>
					<tr
						><th>Title</th><th class="hide-s">Status</th><th class="hide-s">Progress</th><th
							class="r">Updated</th
						></tr
					>
				</thead>
				<tbody>
					{#each recentlyUpdated as entry (entry.malId)}
						<tr>
							<td class="t"
								><a href="/anime/{entry.malId}"
									><AnimeTitle
										title={entry.title}
										titleEnglish={entry.titleEnglish}
										tag="span"
										interactive={false}
									/></a
								></td
							>
							<td class="hide-s"
								><span class="st"
									><span class="status-dot" style:--dot={STATUS_META[entry.status].color}
									></span>{STATUS_META[entry.status].short}</span
								></td
							>
							<td class="hide-s num">{entry.numWatchedEpisodes}/{entry.numEpisodes || '?'}</td>
							<td class="r num">{entry.updatedAt ? formatRelativeDate(entry.updatedAt) : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}
</div>

<style>
	.kpis {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin: 0 0 40px;
		border-top: 1px solid var(--color-border-strong);
		border-bottom: 1px solid var(--color-border);
	}
	.kpi {
		display: flex;
		flex-direction: column-reverse;
		padding: 20px 16px 18px 0;
	}
	.kpi + .kpi {
		padding-left: 20px;
		border-left: 1px solid var(--color-border);
	}
	.kpi dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(26px, 3.4vw, 44px);
		font-weight: 650;
		letter-spacing: -0.03em;
		line-height: 1.05;
	}
	.kpi dt {
		margin-bottom: 8px;
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	@media (max-width: 640px) {
		.kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.kpi:nth-child(odd) {
			padding-left: 0;
			border-left: 0;
		}
		.kpi:nth-child(n + 3) {
			border-top: 1px solid var(--color-border);
		}
	}
	.block {
		margin-bottom: 40px;
	}
	h2 {
		margin-bottom: 14px;
		font-size: 15px;
		font-weight: 600;
	}
	.block-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.block-head a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		color: var(--color-primary);
		font-size: 13px;
	}
	.block-head a:hover {
		text-decoration: underline;
	}
	.dist-bar {
		display: flex;
		height: 14px;
		gap: 2px;
		border-radius: 4px;
		overflow: hidden;
	}
	.dist-bar span {
		min-width: 4px;
	}
	.legend {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 0 28px;
		margin: 14px 0 0;
		padding: 0;
		list-style: none;
	}
	.legend a {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		border-bottom: 1px solid var(--color-border);
		font-size: 14px;
	}
	.legend a:hover .name {
		color: var(--color-text-primary);
	}
	.name {
		flex: 1;
		color: var(--color-text-secondary);
	}
	.pct {
		width: 36px;
		text-align: right;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.two {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 48px;
	}
	@media (max-width: 900px) {
		.two {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
	.hist {
		display: flex;
		align-items: flex-end;
		gap: 6px;
		height: 168px;
	}
	.col {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		gap: 4px;
	}
	.col .bar {
		width: 100%;
		border-radius: 3px 3px 0 0;
		background: var(--color-primary);
		opacity: 0.85;
		transition: opacity 0.15s;
	}
	.col:hover .bar {
		opacity: 1;
	}
	.col .n {
		font-size: 11px;
		color: var(--color-text-secondary);
		min-height: 14px;
	}
	.col .x {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.genres {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.genres li {
		display: grid;
		grid-template-columns: minmax(80px, 128px) 1fr 40px;
		align-items: center;
		gap: 12px;
		min-height: 36px;
		font-size: 13px;
	}
	.g-name {
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.g-track {
		height: 6px;
		border-radius: 3px;
		background: var(--color-surface-2);
	}
	.g-track span {
		display: block;
		height: 100%;
		border-radius: 3px;
		background: var(--color-primary);
	}
	.g-count {
		text-align: right;
		color: var(--color-text-secondary);
	}
	.shelf {
		display: flex;
		gap: 16px;
		margin: 0 -16px;
		padding: 0 16px 4px;
		list-style: none;
		overflow-x: auto;
		scroll-snap-type: x proximity;
	}
	.shelf li {
		flex: 0 0 156px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		scroll-snap-align: start;
	}
	.shelf :global(.shelf-img) {
		width: 100%;
	}
	.shelf :global(.shelf-title) {
		font-size: 13px;
		font-weight: 600;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.poster {
		display: block;
	}
	.recent {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	.recent th {
		padding: 0 0 10px;
		text-align: left;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		border-bottom: 1px solid var(--color-border-strong);
	}
	.recent td {
		padding: 0;
		height: 48px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.recent .t a {
		color: var(--color-text-primary);
		display: block;
		padding-right: 16px;
	}
	.recent .t a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.recent .r {
		text-align: right;
	}
	.st {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	@media (max-width: 640px) {
		.hide-s {
			display: none;
		}
	}
</style>
