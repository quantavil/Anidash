// ─── Display formatting helpers ───

/** Formats large numbers into short strings (e.g., 1500 -> 1.5K, 1200000 -> 1.2M) */
export function formatNumberShort(num: number): string {
	if (num >= 1_000_000) {
		return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
	}
	if (num >= 1_000) {
		return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
	}
	return String(num);
}

/** ISO date → relative ("2h ago", "3d ago", "Jan 5") */
export function formatRelativeDate(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const minutes = Math.floor(diffMs / 60_000);
	const hours = Math.floor(diffMs / 3_600_000);
	const days = Math.floor(diffMs / 86_400_000);

	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 30) return `${days}d ago`;
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "2025" or "Winter 2025" */
export function formatSeason(year: number | null, season: string | null): string {
	if (!year) return 'TBA';
	if (!season) return String(year);
	return `${capitalize(season)} ${year}`;
}

export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
	tv: 'TV',
	ova: 'OVA',
	ona: 'ONA',
	movie: 'Movie',
	special: 'Special',
	music: 'Music',
	unknown: 'Unknown'
};

export function formatMediaType(type: string): string {
	return MEDIA_TYPE_LABELS[type.toLowerCase()] ?? type;
}

const STATUS_LABELS: Record<string, string> = {
	watching: 'Watching',
	completed: 'Completed',
	on_hold: 'On Hold',
	dropped: 'Dropped',
	plan_to_watch: 'Plan to Watch'
};

export function formatListStatus(status: string): string {
	return STATUS_LABELS[status] ?? status;
}

type StatusVariant = 'badge' | 'dot' | 'solid';
export const STATUS_COLORS: Record<string, Record<StatusVariant, string>> = {
	watching: {
		badge: 'bg-primary/20 text-[#bfb5ff] border-primary/40',
		dot: 'bg-primary',
		solid: 'bg-primary/90'
	},
	completed: {
		badge: 'bg-success/15 text-success border-success/30',
		dot: 'bg-success',
		solid: 'bg-success/90'
	},
	on_hold: {
		badge: 'bg-warning/15 text-warning border-warning/30',
		dot: 'bg-warning',
		solid: 'bg-warning/90'
	},
	dropped: {
		badge: 'bg-error/15 text-error border-error/30',
		dot: 'bg-error',
		solid: 'bg-error/90'
	},
	plan_to_watch: {
		badge: 'bg-info/15 text-info border-info/30',
		dot: 'bg-info',
		solid: 'bg-info/90'
	}
};

const ANIME_STATUS_LABELS: Record<string, string> = {
	currently_airing: 'Currently Airing',
	finished_airing: 'Finished Airing',
	not_yet_aired: 'Not Yet Aired'
};

export function formatAiringStatus(status: string): string {
	return ANIME_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

/** Converts JST day and time to user's local time and day */
export function formatLocalBroadcast(dayOfWeek: string, startTime?: string): string {
	if (!startTime) return `${capitalize(dayOfWeek)}s`;

	const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	const jstDayIndex = days.indexOf(dayOfWeek.toLowerCase());

	if (jstDayIndex === -1) return `${capitalize(dayOfWeek)}s at ${startTime} JST`;

	const [hours, minutes] = startTime.split(':').map(Number);

	// 2023-01-01 was a Sunday. We use this as a reference date in UTC.
	// JST is UTC+9. To get UTC time, subtract 9 from JST hours.
	const refDate = new Date(Date.UTC(2023, 0, 1 + jstDayIndex, hours - 9, minutes));

	const localDay = refDate.toLocaleDateString(undefined, { weekday: 'long' });
	const localTime = refDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

	return `${localDay}s at ${localTime}`;
}

export function formatCharacterName(rawName: string): string {
	if (!rawName) return '';
	const parts = rawName.split(',').map((p) => p.trim());
	return parts.length === 2 ? `${parts[1]} ${parts[0]}` : rawName;
}
