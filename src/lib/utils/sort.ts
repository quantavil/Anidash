// ─── List sort helpers ───

import type { UserListRecord } from '$lib/cache/db';

export type SortKey = 'updated' | 'title' | 'score' | 'progress' | 'mean';

export function sortEntries(
  entries: UserListRecord[],
  key: SortKey,
): UserListRecord[] {
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
        return (
          new Date(b.updatedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? 0).getTime()
        );

      case 'progress': {
        const aPct =
          a.numEpisodes > 0 ? a.numWatchedEpisodes / a.numEpisodes : 0;
        const bPct =
          b.numEpisodes > 0 ? b.numWatchedEpisodes / b.numEpisodes : 0;
        return bPct - aPct;
      }

      default:
        return 0;
    }
  });
}

/** Filter entries by status tab */
export function filterByStatus(
  entries: UserListRecord[],
  tab: string,
): UserListRecord[] {
  if (tab === 'all') return entries;
  return entries.filter((e) => e.status === tab);
}

/** Filter entries by search query (title match) */
export function filterByQuery(
  entries: UserListRecord[],
  query: string,
): UserListRecord[] {
  if (!query.trim()) return entries;
  const q = query.toLowerCase().trim();
  return entries.filter((e) => e.title.toLowerCase().includes(q));
}