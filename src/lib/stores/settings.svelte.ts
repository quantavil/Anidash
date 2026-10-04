// ─── Settings Store ───
// Centralized store for user preferences. Persisted to localStorage.

import { browser } from '$app/environment';
import { STORAGE_KEYS } from '$lib/constants';

class SettingsStore {
	preferEnglish = $state(false);

	init() {
		if (browser) {
			this.preferEnglish = localStorage.getItem(STORAGE_KEYS.PREFER_ENGLISH) === 'true';
		}
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
