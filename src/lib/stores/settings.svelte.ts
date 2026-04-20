// ─── Settings Store ───
// Centralized store for user preferences. Persisted to localStorage.

class SettingsStore {
	preferEnglish = $state(false);

	init() {
		if (typeof window !== 'undefined') {
			this.preferEnglish = localStorage.getItem('anidash_prefer_english') === 'true';
		}
	}

	togglePreferEnglish() {
		this.preferEnglish = !this.preferEnglish;
		if (typeof window !== 'undefined') {
			localStorage.setItem('anidash_prefer_english', String(this.preferEnglish));
		}
	}

	setPreferEnglish(value: boolean) {
		this.preferEnglish = value;
		if (typeof window !== 'undefined') {
			localStorage.setItem('anidash_prefer_english', String(value));
		}
	}
}

export const settingsStore = new SettingsStore();
