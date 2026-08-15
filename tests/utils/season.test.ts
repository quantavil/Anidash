import { describe, it, expect } from 'vitest';
import { getCurrentSeason, prevSeason, nextSeason } from '$lib/utils/season';

describe('season utils', () => {
	it('calculates current season with valid structure', () => {
		const current = getCurrentSeason();
		expect(typeof current.year).toBe('number');
		expect(['winter', 'spring', 'summer', 'fall']).toContain(current.season);
	});

	it('navigates previous seasons with year wrapping', () => {
		expect(prevSeason(2024, 'fall')).toEqual({ year: 2024, season: 'summer' });
		expect(prevSeason(2024, 'summer')).toEqual({ year: 2024, season: 'spring' });
		expect(prevSeason(2024, 'spring')).toEqual({ year: 2024, season: 'winter' });
		expect(prevSeason(2024, 'winter')).toEqual({ year: 2023, season: 'fall' });
	});

	it('navigates next seasons with year wrapping', () => {
		expect(nextSeason(2024, 'winter')).toEqual({ year: 2024, season: 'spring' });
		expect(nextSeason(2024, 'spring')).toEqual({ year: 2024, season: 'summer' });
		expect(nextSeason(2024, 'summer')).toEqual({ year: 2024, season: 'fall' });
		expect(nextSeason(2024, 'fall')).toEqual({ year: 2025, season: 'winter' });
	});
});
