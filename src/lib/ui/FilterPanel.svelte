<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SlidersHorizontal, X, ChevronDown } from 'lucide-svelte';
	import {
		EMPTY_FILTERS,
		activeFilterCount,
		type AnimeFilters,
		type FacetOptions
	} from '#lib/utils/filters.js';
	import { formatMediaType } from '#lib/utils/format.js';

	let {
		filters,
		options,
		mode,
		onchange,
		leading,
		trailing
	}: {
		filters: AnimeFilters;
		options: FacetOptions;
		/** `list` adds my-score filters; `browse` adds hide-listed. */
		mode: 'list' | 'browse' | 'season';
		onchange: (next: AnimeFilters) => void;
		/** Controls rendered before / after the Filters button, in the same row. */
		leading?: Snippet;
		trailing?: Snippet;
	} = $props();

	const TYPES = ['tv', 'movie', 'ova', 'ona', 'special'];
	const AIRING = [
		{ value: 'currently_airing', label: 'Airing' },
		{ value: 'finished_airing', label: 'Finished' },
		{ value: 'not_yet_aired', label: 'Upcoming' }
	];
	const LENGTHS = [
		{ label: 'Any', min: 0, max: 0 },
		{ label: '1 ep', min: 1, max: 1 },
		{ label: '≤13', min: 1, max: 13 },
		{ label: '14–26', min: 14, max: 26 },
		{ label: '27+', min: 27, max: 0 }
	];
	const SCORES = [6, 7, 7.5, 8, 8.5, 9];
	const GENRE_PREVIEW = 18;

	let open = $state(false);
	let showAllGenres = $state(false);

	const count = $derived(activeFilterCount(filters));
	const visibleGenres = $derived(
		showAllGenres
			? options.genres
			: options.genres.filter(
					(g, i) =>
						i < GENRE_PREVIEW || filters.genres.includes(g.name) || filters.exclude.includes(g.name)
				)
	);

	function set(patch: Partial<AnimeFilters>) {
		onchange({ ...filters, ...patch });
	}
	function toggle(list: string[], value: string): string[] {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}
	/** neutral → include → exclude → neutral */
	function cycleGenre(name: string) {
		if (filters.genres.includes(name)) {
			set({
				genres: filters.genres.filter((g) => g !== name),
				exclude: [...filters.exclude, name]
			});
		} else if (filters.exclude.includes(name)) {
			set({ exclude: filters.exclude.filter((g) => g !== name) });
		} else {
			set({ genres: [...filters.genres, name] });
		}
	}
	function year(key: 'yearFrom' | 'yearTo', e: Event) {
		const n = Math.trunc(Number((e.target as HTMLInputElement).value));
		set({ [key]: Number.isFinite(n) && n > 0 ? n : 0 });
	}

	const chip = (active: boolean) =>
		`min-h-9 shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
			active
				? 'border-primary/50 bg-primary/15 text-primary'
				: 'border-white/5 bg-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary'
		}`;
	const selectCls =
		'min-h-9 rounded-lg border border-white/5 bg-white/5 px-2.5 text-xs text-text-primary outline-none focus:bg-white/10';
	const labelCls =
		'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted';

	/** Active filters as removable summary chips. */
	const summary = $derived.by(() => {
		const out: { label: string; clear: Partial<AnimeFilters> }[] = [];
		for (const t of filters.types)
			out.push({
				label: formatMediaType(t),
				clear: { types: filters.types.filter((v) => v !== t) }
			});
		for (const g of filters.genres)
			out.push({ label: g, clear: { genres: filters.genres.filter((v) => v !== g) } });
		for (const g of filters.exclude)
			out.push({ label: `No ${g}`, clear: { exclude: filters.exclude.filter((v) => v !== g) } });
		for (const a of filters.airing)
			out.push({
				label: AIRING.find((x) => x.value === a)?.label ?? a,
				clear: { airing: filters.airing.filter((v) => v !== a) }
			});
		if (filters.studio) out.push({ label: filters.studio, clear: { studio: '' } });
		if (filters.minScore > 0) out.push({ label: `★ ${filters.minScore}+`, clear: { minScore: 0 } });
		if (filters.yearFrom || filters.yearTo)
			out.push({
				label: `${filters.yearFrom || '…'}–${filters.yearTo || '…'}`,
				clear: { yearFrom: 0, yearTo: 0 }
			});
		if (filters.epsMin || filters.epsMax)
			out.push({
				label:
					LENGTHS.find((l) => l.min === filters.epsMin && l.max === filters.epsMax)?.label ??
					`${filters.epsMin || 1}–${filters.epsMax || '∞'} eps`,
				clear: { epsMin: 0, epsMax: 0 }
			});
		if (filters.myMin > 0) out.push({ label: `Mine ${filters.myMin}+`, clear: { myMin: 0 } });
		if (filters.unrated) out.push({ label: 'Unrated', clear: { unrated: false } });
		if (filters.hideListed) out.push({ label: 'Not on my list', clear: { hideListed: false } });
		return out;
	});
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center gap-2">
		{@render leading?.()}
		<button
			type="button"
			onclick={() => (open = !open)}
			aria-expanded={open}
			aria-controls="filter-panel"
			class="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors {open ||
			count > 0
				? 'border-primary/40 bg-primary/10 text-primary'
				: 'border-white/5 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'}"
		>
			<SlidersHorizontal size={14} />
			Filters
			{#if count > 0}
				<span class="rounded-full bg-primary px-1.5 text-[11px] font-bold text-[#17122e]"
					>{count}</span
				>
			{/if}
			<ChevronDown size={14} class="transition-transform {open ? 'rotate-180' : ''}" />
		</button>
		{@render trailing?.()}
	</div>

	{#if count > 0}
		<div class="flex flex-wrap items-center gap-2">
			{#each summary as s (s.label)}
				<button
					type="button"
					onclick={() => set(s.clear)}
					aria-label="Remove filter {s.label}"
					class="flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-primary/30 bg-primary/10 pl-3 pr-2 text-xs text-primary hover:bg-primary/20"
				>
					{s.label}<X size={12} />
				</button>
			{/each}

			<button
				type="button"
				onclick={() => onchange({ ...EMPTY_FILTERS })}
				class="min-h-9 cursor-pointer px-2 text-xs text-text-muted underline-offset-2 hover:text-text-primary hover:underline"
			>
				Clear all
			</button>
		</div>
	{/if}

	{#if open}
		<div
			id="filter-panel"
			class="grid gap-5 rounded-xl border border-border bg-surface-1 p-4 sm:grid-cols-2"
		>
			<div>
				<span class={labelCls}>Format</span>
				<div class="flex flex-wrap gap-1.5">
					{#each TYPES as t (t)}
						<button
							type="button"
							class={chip(filters.types.includes(t))}
							aria-pressed={filters.types.includes(t)}
							onclick={() => set({ types: toggle(filters.types, t) })}>{formatMediaType(t)}</button
						>
					{/each}
				</div>
			</div>

			<div>
				<span class={labelCls}>Airing</span>
				<div class="flex flex-wrap gap-1.5">
					{#each AIRING as a (a.value)}
						<button
							type="button"
							class={chip(filters.airing.includes(a.value))}
							aria-pressed={filters.airing.includes(a.value)}
							onclick={() => set({ airing: toggle(filters.airing, a.value) })}>{a.label}</button
						>
					{/each}
				</div>
			</div>

			<div class="sm:col-span-2">
				<div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
					<span class="{labelCls} !mb-0">Genres · click to include, again to exclude</span>
					{#if filters.genres.length > 1}
						<div class="flex gap-1" role="group" aria-label="Genre match mode">
							<button
								type="button"
								class={chip(filters.genreMode === 'all')}
								aria-pressed={filters.genreMode === 'all'}
								onclick={() => set({ genreMode: 'all' })}>Match all</button
							>
							<button
								type="button"
								class={chip(filters.genreMode === 'any')}
								aria-pressed={filters.genreMode === 'any'}
								onclick={() => set({ genreMode: 'any' })}>Match any</button
							>
						</div>
					{/if}
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each visibleGenres as g (g.name)}
						{@const inc = filters.genres.includes(g.name)}
						{@const exc = filters.exclude.includes(g.name)}
						<button
							type="button"
							onclick={() => cycleGenre(g.name)}
							aria-pressed={inc || exc ? 'true' : 'false'}
							class="min-h-9 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors {inc
								? 'border-primary/50 bg-primary/15 text-primary'
								: exc
									? 'border-error/40 bg-error/10 text-error line-through'
									: 'border-white/5 bg-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary'}"
						>
							{g.name}<span class="ml-1 opacity-50">{g.count}</span>
						</button>
					{/each}
					{#if options.genres.length > visibleGenres.length || showAllGenres}
						<button
							type="button"
							class="min-h-9 cursor-pointer px-2 text-xs text-primary hover:underline"
							onclick={() => (showAllGenres = !showAllGenres)}
						>
							{showAllGenres ? 'Fewer' : `All ${options.genres.length}`}
						</button>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<label>
					<span class={labelCls}>Min rating</span>
					<select
						class="{selectCls} w-full"
						value={filters.minScore}
						onchange={(e) => set({ minScore: Number((e.target as HTMLSelectElement).value) })}
					>
						<option value={0}>Any</option>
						{#each SCORES as s (s)}<option value={s}>{s}+</option>{/each}
					</select>
				</label>
				<label>
					<span class={labelCls}>Studio</span>
					<select
						class="{selectCls} w-full"
						value={filters.studio}
						onchange={(e) => set({ studio: (e.target as HTMLSelectElement).value })}
					>
						<option value="">Any</option>
						{#each options.studios.slice(0, 200) as s (s.name)}
							<option value={s.name}>{s.name} ({s.count})</option>
						{/each}
					</select>
				</label>
			</div>

			<div>
				<span class={labelCls}>Start year</span>
				<div class="flex items-center gap-2">
					<input
						type="number"
						inputmode="numeric"
						aria-label="From year"
						placeholder={options.years ? String(options.years.min) : 'From'}
						value={filters.yearFrom || ''}
						onchange={(e) => year('yearFrom', e)}
						class="{selectCls} w-24"
					/>
					<span class="text-text-muted">–</span>
					<input
						type="number"
						inputmode="numeric"
						aria-label="To year"
						placeholder={options.years ? String(options.years.max) : 'To'}
						value={filters.yearTo || ''}
						onchange={(e) => year('yearTo', e)}
						class="{selectCls} w-24"
					/>
				</div>
			</div>

			<div class="sm:col-span-2">
				<span class={labelCls}>Length</span>
				<div class="flex flex-wrap gap-1.5">
					{#each LENGTHS as l (l.label)}
						<button
							type="button"
							class={chip(filters.epsMin === l.min && filters.epsMax === l.max)}
							aria-pressed={filters.epsMin === l.min && filters.epsMax === l.max}
							onclick={() => set({ epsMin: l.min, epsMax: l.max })}>{l.label}</button
						>
					{/each}
				</div>
			</div>

			{#if mode === 'list'}
				<div class="flex flex-wrap items-end gap-3 sm:col-span-2">
					<label>
						<span class={labelCls}>My score</span>
						<select
							class={selectCls}
							value={filters.myMin}
							disabled={filters.unrated}
							onchange={(e) => set({ myMin: Number((e.target as HTMLSelectElement).value) })}
						>
							<option value={0}>Any</option>
							{#each [5, 6, 7, 8, 9, 10] as s (s)}<option value={s}>{s}+</option>{/each}
						</select>
					</label>
					<button
						type="button"
						class={chip(filters.unrated)}
						aria-pressed={filters.unrated}
						onclick={() => set({ unrated: !filters.unrated, myMin: 0 })}>Unrated only</button
					>
				</div>
			{:else if mode === 'browse'}
				<div class="sm:col-span-2">
					<button
						type="button"
						class={chip(filters.hideListed)}
						aria-pressed={filters.hideListed}
						onclick={() => set({ hideListed: !filters.hideListed })}>Hide titles on my list</button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>
