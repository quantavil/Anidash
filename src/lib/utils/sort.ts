// ─── Sort helpers (My List, Browse, Seasonal) ───

import type { UserListRecord } from '#lib/cache/db.js';
import type { DisplayAnime } from './types';
import { facetOfDisplay, facetOfRecord } from './filters';

export type SortKey =
	| 'updated'
	| 'title'
	| 'score'
	| 'progress'
	| 'mean'
	| 'start'
	| 'episodes'
	| 'popularity';
export type SortDir = 'asc' | 'desc';

/** Natural direction per key: titles read A→Z, everything else biggest/newest first. */
export const NATURAL_DIR: Record<SortKey, SortDir> = {
	updated: 'desc',
	title: 'asc',
	score: 'desc',
	progress: 'desc',
	mean: 'desc',
	start: 'desc',
	episodes: 'desc',
	popularity: 'desc'
};

/** Missing values (null/0 start, no mean…) sink to the bottom in either direction. */
function compareNullable(a: number | null, b: number | null, dir: SortDir): number {
	const aMissing = a === null || a === 0;
	const bMissing = b === null || b === 0;
	if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
	return dir === 'asc' ? a - b : b - a;
}

export function sortEntries(
	entries: UserListRecord[],
	key: SortKey,
	dir: SortDir = NATURAL_DIR[key]
): UserListRecord[] {
	const sign = dir === NATURAL_DIR[key] ? 1 : -1;
	const startKey = new Map(entries.map((e) => [e.malId, facetOfRecord(e).startKey]));
	return entries.toSorted((a, b) => {
		switch (key) {
			case 'title':
				return sign * a.title.localeCompare(b.title);
			case 'score':
				// My score desc, then community mean desc
				if (b.score !== a.score) return sign * (b.score - a.score);
				return sign * ((b.mean ?? 0) - (a.mean ?? 0));
			case 'updated':
				return sign * (new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
			case 'progress': {
				const aPct = a.numEpisodes > 0 ? a.numWatchedEpisodes / a.numEpisodes : 0;
				const bPct = b.numEpisodes > 0 ? b.numWatchedEpisodes / b.numEpisodes : 0;
				return sign * (bPct - aPct);
			}
			case 'mean':
				return compareNullable(a.mean, b.mean, dir);
			case 'start':
				return compareNullable(startKey.get(a.malId)!, startKey.get(b.malId)!, dir);
			case 'episodes':
				return compareNullable(a.numEpisodes, b.numEpisodes, dir);
			case 'popularity':
				return compareNullable(a.numListUsers, b.numListUsers, dir);
			default:
				return 0;
		}
	});
}

/** Browse/Seasonal rows. `null` key keeps the source order (relevance / chart rank). */
export function sortDisplay(
	items: DisplayAnime[],
	key: SortKey | null,
	dir: SortDir = key ? NATURAL_DIR[key] : 'desc'
): DisplayAnime[] {
	if (!key) return items;
	const startKey = new Map(items.map((a) => [a.malId, facetOfDisplay(a).startKey]));
	return items.toSorted((a, b) => {
		switch (key) {
			case 'title':
				return dir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
			case 'mean':
			case 'score':
				return compareNullable(a.mean, b.mean, dir);
			case 'popularity':
				return compareNullable(a.numListUsers, b.numListUsers, dir);
			case 'episodes':
				return compareNullable(a.numEpisodes, b.numEpisodes, dir);
			case 'start':
				return compareNullable(startKey.get(a.malId)!, startKey.get(b.malId)!, dir);
			default:
				return 0;
		}
	});
}
