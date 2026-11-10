// ─── Settings Store ───
// Centralized store for user preferences. Persisted to localStorage.

import { browser } from '$app/env';
import { STORAGE_KEYS } from '#lib/constants.js';

export type ViewMode = 'grid' | 'list';
export type ViewSection = 'list' | 'browse' | 'seasonal';

export const VIEW_SECTIONS: { id: ViewSection; label: string }[] = [
	{ id: 'list', label: 'My List' },
	{ id: 'browse', label: 'Browse' },
	{ id: 'seasonal', label: 'Seasonal' }
];

const DEFAULT_VIEWS: Record<ViewSection, ViewMode> = {
	list: 'grid',
	browse: 'list',
	seasonal: 'grid'
};

function readViews(): Record<ViewSection, ViewMode> {
	const views = { ...DEFAULT_VIEWS };
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIEWS) ?? '{}');
		if (stored && typeof stored === 'object') {
			for (const { id } of VIEW_SECTIONS) {
				const v = (stored as Record<string, unknown>)[id];
				if (v === 'grid' || v === 'list') views[id] = v;
			}
		}
	} catch {
		// unreadable storage: keep defaults
	}
	return views;
}

class SettingsStore {
	preferEnglish = $state(false);
	/** Card layout per section; Browse reads best as a list, My List and Seasonal as posters. */
	views = $state<Record<ViewSection, ViewMode>>({ ...DEFAULT_VIEWS });

	init() {
		if (browser) {
			this.preferEnglish = localStorage.getItem(STORAGE_KEYS.PREFER_ENGLISH) === 'true';
			this.views = readViews();
		}
	}

	setPreferEnglish(value: boolean) {
		this.preferEnglish = value;
		if (browser) {
			localStorage.setItem(STORAGE_KEYS.PREFER_ENGLISH, String(value));
		}
	}

	setView(section: ViewSection, mode: ViewMode) {
		this.views[section] = mode;
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEYS.VIEWS, JSON.stringify(this.views));
			} catch {
				// storage full or blocked: the choice still applies for this session
			}
		}
	}
}

export const settingsStore = new SettingsStore();
