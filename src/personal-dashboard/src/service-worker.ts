/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;

/**
 * Nur die App-Shell wird vorab geladen: der statische Ordner und die
 * vorgerenderten Seiten. Zusammen sind das wenige Kilobyte.
 *
 * Bewusst NICHT vorab geladen wird `build` — das sind alle generierten
 * JS/CSS-Chunks inklusive jedes Lazy-Widgets (~1,8 MB). Ein `addAll` darueber
 * konkurriert beim ersten Besuch direkt mit dem Seitenaufbau um die
 * Verbindungen. Weil alle Dateien unter `/_app/immutable/` einen Hash im Namen
 * tragen, koennen wir sie stattdessen gefahrlos beim ersten echten Zugriff
 * cachen (siehe `handleFetch`).
 */
const SHELL = [...files, ...prerendered];

/** Content-Hash im Dateinamen: darf unbegrenzt aus dem Cache kommen. */
const IMMUTABLE_PREFIX = '/_app/immutable/';

/**
 * Nur Dateien mit unveraenderlichem Namen duerfen ohne Rueckfrage aus dem Cache
 * kommen. Vorgerenderte Seiten (`prerendered`) gehoeren ausdruecklich NICHT dazu:
 * ihr Pfad bleibt gleich, ihr Inhalt aendert sich mit jedem Deployment. Wuerden
 * wir sie cache-first ausliefern, zeigte die Seite nach einem Release weiterhin
 * die alten Chunk-Namen — und deren Nachladen scheitert mit
 * "Importing a module script failed", weil es die Dateien nicht mehr gibt.
 */
const IMMUTABLE_ASSETS = new Set([...build, ...files]);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			// Einzeln statt `addAll`: eine fehlende Datei soll nicht die
			// komplette Installation scheitern lassen.
			//
			// `cache: 'reload'` ist hier entscheidend: ohne das bedient sich
			// `cache.add` am HTTP-Cache des Browsers und legt womoeglich ein
			// veraltetes Dokument ab — das dann auf Chunk-Namen zeigt, die es
			// nach dem Deployment nicht mehr gibt.
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
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

async function handleFetch(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);

	// 1. Gehashte Build-Assets und statische Dateien: immer zuerst aus dem Cache,
	//    bei Bedarf einmalig nachladen und dann behalten.
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

	// 2. Seitenaufrufe — auch die vorgerenderten: Netzwerk zuerst, damit nach
	//    einem Deployment sofort das neue Dokument mit den neuen Chunk-Namen
	//    ankommt. Der Cache ist hier nur Offline-Fallback.
	if (request.mode === 'navigate') {
		try {
			const response = await fetch(request);
			if (response.ok) cache.put(request, response.clone());
			return response;
		} catch (error) {
			const cached = (await cache.match(request)) ?? (await cache.match('/'));
			if (cached) return cached;
			throw error;
		}
	}

	// 3. Alles andere (eigene API-Routen, Quickshare-Daten): nie cachen.
	//    Diese Antworten sind nutzerbezogen und haben in einem geteilten
	//    Cache nichts verloren.
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

	event.respondWith(handleFetch(request, url));
});
