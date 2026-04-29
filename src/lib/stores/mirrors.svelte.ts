import { browser } from '$app/environment';

class MirrorsStore {
	preferences = $state<Record<string, string>>({});

	constructor() {
		if (browser) {
			const stored = localStorage.getItem('anidash-mirrors');
			if (stored) {
				try {
					this.preferences = JSON.parse(stored);
				} catch {
					// Ignore invalid JSON
				}
			}
		}
	}

	/** Returns domains with the user's preferred domain sorted to the front */
	getSortedDomains(siteName: string, defaultDomains: string[]): string[] {
		const preferred = this.preferences[siteName];
		if (!preferred || !defaultDomains.includes(preferred)) {
			return defaultDomains;
		}
		// Bubble preferred to the top
		return [preferred, ...defaultDomains.filter((d) => d !== preferred)];
	}

	/** Save user's preferred mirror for a site */
	setPreferredDomain(siteName: string, domain: string) {
		this.preferences[siteName] = domain;
		if (browser) {
			localStorage.setItem('anidash-mirrors', JSON.stringify(this.preferences));
		}
	}
}

export const mirrorsStore = new MirrorsStore();
