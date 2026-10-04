import type { AnimeStatus } from '$lib/cache/db';

/** Display order for status tabs, pickers and the stats distribution. */
export const STATUS_ORDER: AnimeStatus[] = [
	'watching',
	'plan_to_watch',
	'completed',
	'on_hold',
	'dropped'
];

export const STATUS_META: Record<AnimeStatus, { label: string; short: string; color: string }> = {
	watching: { label: 'Watching', short: 'Watching', color: 'var(--st-watching)' },
	plan_to_watch: { label: 'Plan to Watch', short: 'Planned', color: 'var(--st-plan_to_watch)' },
	completed: { label: 'Completed', short: 'Completed', color: 'var(--st-completed)' },
	on_hold: { label: 'On Hold', short: 'On hold', color: 'var(--st-on_hold)' },
	dropped: { label: 'Dropped', short: 'Dropped', color: 'var(--st-dropped)' }
};
