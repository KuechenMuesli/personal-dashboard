/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // Alle generierten JS/CSS Dateien (inkl. lazy-loaded Widgets)
	...files  // Alles aus dem static Ordner
];

self.addEventListener('install', (event: any) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}
	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event: any) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event: any) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// Statische Assets & JS-Chunks für Widgets: IMMER sofort aus dem Cache laden (0ms)
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);
			if (response) {
				return response;
			}
		}

		// Dynamische Daten (API, Supabase, etc.): IMMER aus dem Netzwerk holen
		try {
			const response = await fetch(event.request);

			// Nur Seitenaufrufe (nicht APIs) als Offline-Fallback zwischenspeichern
			if (response.status === 200 && !url.pathname.includes('/api/')) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			// Fallback: Wenn wir offline sind, versuchen wir es aus dem Cache
			const response = await cache.match(event.request);
			if (response) {
				return response;
			}
			throw err;
		}
	}

	event.respondWith(respond());
});
