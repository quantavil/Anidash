// ─── Dub Info Store ───
// Centralized store to hold the mapping of anime that have a dub.

import { browser } from '$app/environment';
import { getDB } from '$lib/cache/db';
import { logger } from '$lib/utils/logger';
import { STORAGE_KEYS } from '$lib/constants';
import { SvelteSet } from 'svelte/reactivity';

class DubStore {
	dubs = $state<SvelteSet<number>>(new SvelteSet());
	dubMode = $state(false);
	isLoading = $state(false);
	isReady = $state(false);
	#initPromise: Promise<void> | null = null;
	#hasInitialized = false;

	async init() {
		if (browser) {
			this.dubMode = localStorage.getItem(STORAGE_KEYS.DUB_MODE) === 'true';
		}

		if (this.#hasInitialized || this.dubs.size > 0) return;
		if (this.#initPromise) return this.#initPromise;

		this.#initPromise = (async () => {
			this.isLoading = true;
			try {
				const db = await getDB();
				const cached = await db.get('meta', 'dubInfo');
				const now = Date.now();

				// 1. If cached and fresh (<24h), use it immediately
				if (cached && now - cached.updatedAt < 24 * 60 * 60 * 1000) {
					const data = cached.value as { dubbed?: number[] };
					if (Array.isArray(data.dubbed)) {
						this.dubs = new SvelteSet(data.dubbed);
						return;
					}
				}

				// 2. If no cache OR stale, try to fetch fresh
				try {
					const res = await fetch(
						'https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json'
					);
					if (!res.ok) throw new Error('Network response not ok');

					const data = (await res.json()) as { dubbed?: number[] };

					if (data && Array.isArray(data.dubbed)) {
						this.dubs = new SvelteSet(data.dubbed);

						// Save to cache
						await db.put('meta', {
							key: 'dubInfo',
							value: data,
							updatedAt: now
						});
						return;
					}
				} catch (fetchError) {
					logger.warn('Failed to fetch fresh dub info, falling back to cache:', fetchError);

					// 3. Last resort fallback: use stale cache if available
					if (cached) {
						const data = cached.value as { dubbed?: number[] };
						if (Array.isArray(data.dubbed)) {
							this.dubs = new SvelteSet(data.dubbed);
						}
					}
				}
			} catch (e) {
				logger.error('Critical failure in DubStore init:', e);
			} finally {
				this.isLoading = false;
				this.isReady = true;
				this.#hasInitialized = true;
			}
		})();

		return this.#initPromise;
	}

	hasDub(malId: number | undefined): boolean {
		if (!malId) return false;
		return this.dubs.has(malId);
	}

	toggleDubMode() {
		this.dubMode = !this.dubMode;
		if (browser) {
			localStorage.setItem(STORAGE_KEYS.DUB_MODE, String(this.dubMode));
		}
	}
}

export const dubStore = new DubStore();
