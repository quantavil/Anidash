/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// ─── Offline app shell ───
// The app is a client-only SPA backed by IndexedDB, so once the shell and its hashed
// assets are cached the whole list/stats/detail experience works offline.
// Deliberately NOT cached: /api/* and /auth/* (live MAL data and credentials) and
// cross-origin requests (AniList, MAL images) — those keep their own caches/fallbacks.

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `anidash-${version}`;
const SHELL_URL = '/';
// The README preview image is documentation, not part of the app.
const ASSETS = [...build, ...files.filter((f) => !f.startsWith('/screenshots/'))];
const ASSET_SET = new Set(ASSETS);

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([SHELL_URL, ...ASSETS])));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/token')) return;
	if (url.pathname.startsWith('/auth/refresh')) return;

	// Hashed build output and static files never change for a given version: cache-first.
	if (ASSET_SET.has(url.pathname)) {
		event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
		return;
	}

	// Page navigations: network-first so deploys show up immediately; when the network is
	// unavailable serve the cached SPA shell (every route is rendered client-side).
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => {
				const shell = await caches.match(SHELL_URL);
				return shell ?? Response.error();
			})
		);
	}
});
