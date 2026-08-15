import { describe, it, expect } from 'vitest';
import {
	formatNumberShort,
	formatRelativeDate,
	formatSeason,
	capitalize,
	formatMediaType,
	formatListStatus,
	formatAiringStatus,
	formatLocalBroadcast
} from '$lib/utils/format';

describe('format utils', () => {
	describe('formatNumberShort', () => {
		it('formats values under 1000 without suffix', () => {
			expect(formatNumberShort(0)).toBe('0');
			expect(formatNumberShort(450)).toBe('450');
			expect(formatNumberShort(999)).toBe('999');
		});

		it('formats thousands with K suffix', () => {
			expect(formatNumberShort(1000)).toBe('1K');
			expect(formatNumberShort(1500)).toBe('1.5K');
			expect(formatNumberShort(10200)).toBe('10.2K');
			expect(formatNumberShort(999999)).toBe('1000K');
		});

		it('formats millions with M suffix', () => {
			expect(formatNumberShort(1000000)).toBe('1M');
			expect(formatNumberShort(2450000)).toBe('2.5M');
		});
	});

	describe('formatRelativeDate', () => {
		it('formats recent timestamps accurately', () => {
			const now = Date.now();
			expect(formatRelativeDate(new Date(now - 10_000).toISOString())).toBe('just now');
			expect(formatRelativeDate(new Date(now - 10 * 60_000).toISOString())).toBe('10m ago');
			expect(formatRelativeDate(new Date(now - 3 * 3_600_000).toISOString())).toBe('3h ago');
			expect(formatRelativeDate(new Date(now - 5 * 86_400_000).toISOString())).toBe('5d ago');
		});
	});

	describe('formatSeason & capitalize', () => {
		it('capitalizes string words correctly', () => {
			expect(capitalize('action')).toBe('Action');
			expect(capitalize('WINTER')).toBe('Winter');
			expect(capitalize('')).toBe('');
		});

		it('formats season strings', () => {
			expect(formatSeason(2024, 'fall')).toBe('Fall 2024');
			expect(formatSeason(null, 'fall')).toBe('TBA');
			expect(formatSeason(2025, null)).toBe('2025');
		});
	});

	describe('formatMediaType & formatListStatus & formatAiringStatus', () => {
		it('formats media types', () => {
			expect(formatMediaType('tv')).toBe('TV');
			expect(formatMediaType('movie')).toBe('Movie');
			expect(formatMediaType('ova')).toBe('OVA');
			expect(formatMediaType('custom_type')).toBe('custom_type');
		});

		it('formats list status labels', () => {
			expect(formatListStatus('watching')).toBe('Watching');
			expect(formatListStatus('plan_to_watch')).toBe('Plan to Watch');
			expect(formatListStatus('on_hold')).toBe('On Hold');
			expect(formatListStatus('completed')).toBe('Completed');
			expect(formatListStatus('dropped')).toBe('Dropped');
		});

		it('formats airing status labels', () => {
			expect(formatAiringStatus('currently_airing')).toBe('Currently Airing');
			expect(formatAiringStatus('finished_airing')).toBe('Finished Airing');
			expect(formatAiringStatus('not_yet_aired')).toBe('Not Yet Aired');
		});
	});

	describe('formatLocalBroadcast', () => {
		it('returns capitalized day when no time is given', () => {
			expect(formatLocalBroadcast('monday')).toBe('Mondays');
		});

		it('converts valid JST time string to localized day/time string', () => {
			const result = formatLocalBroadcast('saturday', '23:30');
			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});

		it('falls back gracefully on invalid format', () => {
			expect(formatLocalBroadcast('sunday', 'invalid_time')).toBe('Sundays at invalid_time JST');
		});
	});
});
