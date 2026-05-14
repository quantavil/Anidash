// ─── Dub Info Store ───
// Centralized store to hold the mapping of anime that have a dub.

import { getDB } from '$lib/cache/db';
import { logger } from '$lib/utils/logger';

class DubStore {
	dubs = $state<Set<number>>(new Set());
	dubMode = $state(false);
	isLoading = $state(false);
	isReady = $state(false);
	#initPromise: Promise<void> | null = null;

	async init() {
		if (typeof window !== 'undefined') {
			this.dubMode = localStorage.getItem('anidash_dub_mode') === 'true';
		}

		if (this.dubs.size > 0) return;
		if (this.#initPromise) return this.#initPromise;

		this.#initPromise = (async () => {
			this.isLoading = true;
			try {
				const db = await getDB();
				const cached = await db.get('meta', 'dubInfo');
				const now = Date.now();

				// 1. If cached and fresh (< 24h), use it immediately
				if (cached && now - cached.updatedAt < 24 * 60 * 60 * 1000) {
					const data = cached.value as { dubbed?: number[] };
					if (Array.isArray(data.dubbed)) {
						this.dubs = new Set(data.dubbed);
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
						this.dubs = new Set(data.dubbed);

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
							this.dubs = new Set(data.dubbed);
						}
					}
				}
			} catch (e) {
				logger.error('Critical failure in DubStore init:', e);
			} finally {
				this.isLoading = false;
				this.isReady = true;
				if (this.dubs.size === 0) {
					this.#initPromise = null;
				}
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
		if (typeof window !== 'undefined') {
			localStorage.setItem('anidash_dub_mode', String(this.dubMode));
		}
	}
}

export const dubStore = new DubStore();
