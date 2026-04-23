// ─── List sort helpers ───

import type { UserListRecord } from '$lib/cache/db';

export type SortKey = 'updated' | 'title' | 'score' | 'progress' | 'mean';

export function sortEntries(entries: UserListRecord[], key: SortKey): UserListRecord[] {
	return [...entries].sort((a, b) => {
		switch (key) {
			case 'title':
				return a.title.localeCompare(b.title);

			case 'score':
				// User score desc, then mean score desc
				if (b.score !== a.score) return b.score - a.score;
				return (b.mean ?? 0) - (a.mean ?? 0);

			case 'mean':
				return (b.mean ?? 0) - (a.mean ?? 0);

			case 'updated':
				return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();

			case 'progress': {
				const aPct = a.numEpisodes > 0 ? a.numWatchedEpisodes / a.numEpisodes : 0;
				const bPct = b.numEpisodes > 0 ? b.numWatchedEpisodes / b.numEpisodes : 0;
				return bPct - aPct;
			}

			default:
				return 0;
		}
	});
}
