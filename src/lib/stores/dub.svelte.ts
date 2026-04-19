// ─── Dub Info Store ───
// Centralized store to hold the mapping of anime that have a dub.

import { getDB } from '$lib/cache/db';

class DubStore {
	dubs = $state<Set<number>>(new Set());
	dubMode = $state(false);
	#loading = false;

	async init() {
		if (typeof window !== 'undefined') {
			this.dubMode = localStorage.getItem('anidash_dub_mode') === 'true';
		}

		if (this.dubs.size > 0 || this.#loading) return;
		this.#loading = true;

		try {
			const db = await getDB();
			const cached = await db.get('meta', 'dubInfo');
			const now = Date.now();

			// 1. If cached and fresh (< 24h), use it immediately
			if (cached && now - cached.updatedAt < 24 * 60 * 60 * 1000) {
				const data = cached.value as { dubbed?: number[] };
				if (Array.isArray(data.dubbed)) {
					this.dubs = new Set(data.dubbed);
					this.#loading = false;
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
					this.#loading = false;
					return;
				}
			} catch (fetchError) {
				console.warn('Failed to fetch fresh dub info, falling back to cache:', fetchError);

				// 3. Last resort fallback: use stale cache if available
				if (cached) {
					const data = cached.value as { dubbed?: number[] };
					if (Array.isArray(data.dubbed)) {
						this.dubs = new Set(data.dubbed);
					}
				}
			}
		} catch (e) {
			console.error('Critical failure in DubStore init:', e);
		} finally {
			this.#loading = false;
		}
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
