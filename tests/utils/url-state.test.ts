import { describe, it, expect } from 'vitest';
import { getUrlParam, setUrlParam, setUrlParams } from '$lib/utils/url-state';

describe('url-state utils', () => {
	it('reads url parameter with fallback default', () => {
		const url = new URL('https://anidash.app/browse?q=naruto&status=airing');
		expect(getUrlParam(url, 'q', '')).toBe('naruto');
		expect(getUrlParam(url, 'status', 'all')).toBe('airing');
		expect(getUrlParam(url, 'genre', 'all')).toBe('all');
	});

	it('sets and deletes single url parameters', () => {
		const url = new URL('https://anidash.app/browse?tab=watching');
		const updated = setUrlParam(url, 'tab', 'completed');
		expect(updated).toBe('/browse?tab=completed');

		const cleared = setUrlParam(url, 'tab', '');
		expect(cleared).toBe('/browse');
	});

	it('sets and deletes multiple url parameters in batch', () => {
		const url = new URL('https://anidash.app/browse?q=test&page=1');
		const result = setUrlParams(url, [
			{ key: 'q', value: 'bleach' },
			{ key: 'page', value: '' },
			{ key: 'type', value: 'tv' }
		]);
		expect(result).toBe('/browse?q=bleach&type=tv');
	});
});
