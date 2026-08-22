/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;

/**
 * `build` gehoert bewusst NICHT hierher: ~1,8 MB Chunks, deren Precache beim
 * ersten Besuch mit dem Seitenaufbau um Verbindungen konkurriert. Gehashte
 * Namen erlauben es, sie erst beim tatsaechlichen Zugriff zu cachen.
 */
const SHELL = [...files, ...prerendered];

const IMMUTABLE_PREFIX = '/_app/immutable/';

/**
 * `prerendered` gehoert hier NICHT hinein: gleicher Pfad, wechselnder Inhalt.
 * Cache-first darauf liefert nach einem Release die alten Chunk-Namen aus und
 * bricht die Seite mit "Importing a module script failed". War schon mal so.
 */
const IMMUTABLE_ASSETS = new Set([...build, ...files]);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			// Einzeln, damit eine fehlende Datei nicht die ganze Installation kippt.
			// `cache: 'reload'` umgeht den HTTP-Cache — sonst landet womoeglich ein
			// veraltetes Dokument im Precache, dessen Chunks es nicht mehr gibt.
			await Promise.allSettled(
				SHELL.map((asset) => cache.add(new Request(asset, { cache: 'reload' })))
			);
			await sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Ohne Preload wartet die Navigation erst auf den Worker-Start.
			if (sw.registration.navigationPreload) {
				await sw.registration.navigationPreload.enable();
			}

			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

async function handleFetch(
	request: Request,
	url: URL,
	preloadResponse: Promise<Response | undefined>
): Promise<Response> {
	const cache = await caches.open(CACHE);

	const isImmutable =
		request.mode !== 'navigate' &&
		(url.pathname.startsWith(IMMUTABLE_PREFIX) || IMMUTABLE_ASSETS.has(url.pathname));

	if (isImmutable) {
		const cached = await cache.match(request);
		if (cached) return cached;

		const response = await fetch(request);
		if (response.ok) cache.put(request, response.clone());
		return response;
	}

	// Netzwerk zuerst, damit nach einem Deployment sofort das Dokument mit den
	// neuen Chunk-Namen ankommt. Cache nur als Offline-Fallback.
	if (request.mode === 'navigate') {
		try {
			const response = (await preloadResponse) ?? (await fetch(request));
			if (response.ok) cache.put(request, response.clone());
			return response;
		} catch (error) {
			const cached = (await cache.match(request)) ?? (await cache.match('/'));
			if (cached) return cached;
			throw error;
		}
	}

	// Nutzerbezogene Antworten haben in einem geteilten Cache nichts verloren.
	return fetch(request);
}

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Fremde Origins (Supabase, open-meteo, Favicon-Dienste) laufen unveraendert
	// am Service Worker vorbei — sonst landen fremde, teils authentifizierte
	// Antworten in unserem Cache.
	if (url.origin !== sw.location.origin) return;

	event.respondWith(handleFetch(request, url, event.preloadResponse));
});
