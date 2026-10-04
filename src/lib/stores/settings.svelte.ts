// ─── Settings Store ───
// Centralized store for user preferences. Persisted to localStorage.

import { browser } from '$app/environment';
import { STORAGE_KEYS } from '$lib/constants';

class SettingsStore {
	preferEnglish = $state(false);
	listView = $state<'journal' | 'grid'>('journal');

	init() {
		if (browser) {
			this.listView = localStorage.getItem('anidash_list_view') === 'grid' ? 'grid' : 'journal';
			this.preferEnglish = localStorage.getItem(STORAGE_KEYS.PREFER_ENGLISH) === 'true';
		}
	}

	setListView(view: 'journal' | 'grid') {
		this.listView = view;
		if (browser) localStorage.setItem('anidash_list_view', view);
	}

	togglePreferEnglish() {
		this.preferEnglish = !this.preferEnglish;
		if (browser) {
			localStorage.setItem(STORAGE_KEYS.PREFER_ENGLISH, String(this.preferEnglish));
		}
	}

	setPreferEnglish(value: boolean) {
		this.preferEnglish = value;
		if (browser) {
			localStorage.setItem(STORAGE_KEYS.PREFER_ENGLISH, String(value));
		}
	}
}

export const settingsStore = new SettingsStore();
