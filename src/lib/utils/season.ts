// ─── Season calculation & navigation ───

export type Season = 'winter' | 'spring' | 'summer' | 'fall';

const SEASON_ORDER: Season[] = ['winter', 'spring', 'summer', 'fall'];

/** Get the current real-world season */
export function getCurrentSeason(): { year: number; season: Season } {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth(); // 0-indexed

	let season: Season;
	if (month <= 2) season = 'winter';
	else if (month <= 5) season = 'spring';
	else if (month <= 8) season = 'summer';
	else season = 'fall';

	return { year, season };
}

/** Navigate to the previous season */
export function prevSeason(year: number, season: Season): { year: number; season: Season } {
	const idx = seasonIndex(season);
	if (idx === 0) {
		return { year: year - 1, season: 'fall' };
	}
	return { year, season: SEASON_ORDER[idx - 1] };
}

/** Navigate to the next season */
export function nextSeason(year: number, season: Season): { year: number; season: Season } {
	const idx = seasonIndex(season);
	if (idx === 3) {
		return { year: year + 1, season: 'winter' };
	}
	return { year, season: SEASON_ORDER[idx + 1] };
}

/** Season index for sorting (0=winter, 3=fall) */
export function seasonIndex(season: Season): number {
	return SEASON_ORDER.indexOf(season);
}
