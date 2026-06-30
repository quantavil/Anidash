// ─── Online/Offline detection (Svelte 5 Runes) ───

import { browser } from '$app/environment';

function createConnectionStore() {
	let isOnline = $state(true);
	let wasOffline = $state(false);
	let timerId: ReturnType<typeof setTimeout> | null = null;

	if (browser) {
		isOnline = navigator.onLine;

		const onOnline = () => {
			isOnline = true;
			wasOffline = true;
			if (timerId) clearTimeout(timerId);
			// Reset after 3 seconds
			timerId = setTimeout(() => {
				wasOffline = false;
				timerId = null;
			}, 3000);
		};

		const onOffline = () => {
			isOnline = false;
			if (timerId) {
				clearTimeout(timerId);
				timerId = null;
			}
			wasOffline = false;
		};

		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
	}

	return {
		get isOnline() {
			return isOnline;
		},
		get wasOffline() {
			return wasOffline;
		}
	};
}

export const connection = createConnectionStore();
