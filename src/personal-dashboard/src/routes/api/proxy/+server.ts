import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	classifyTarget,
	isPrivateAddress,
	looksLikeCalendar,
	TargetRejected,
	type TargetDecision
} from '$lib/server/proxyTargets';

const CACHE_DURATION_MS = 5 * 60 * 1000;
/** Der Cache lebt im Worker-Isolate und waechst sonst unbegrenzt. */
const CACHE_MAX_ENTRIES = 200;
const CACHE_MAX_BYTES = 8 * 1024 * 1024;
const FEED_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

interface CacheEntry {
	body: ArrayBuffer;
	contentType: string;
	timestamp: number;
}

const cache = new Map<string, CacheEntry>();
let cacheBytes = 0;

function cacheStore(key: string, entry: CacheEntry) {
	const existing = cache.get(key);
	if (existing) cacheBytes -= existing.body.byteLength;

	cache.set(key, entry);
	cacheBytes += entry.body.byteLength;

	// Map behaelt die Einfuegereihenfolge: erster Schluessel = aeltester Eintrag.
	while (cache.size > CACHE_MAX_ENTRIES || cacheBytes > CACHE_MAX_BYTES) {
		const oldest = cache.keys().next();
		if (oldest.done) break;
		const victim = cache.get(oldest.value);
		if (victim) cacheBytes -= victim.body.byteLength;
		cache.delete(oldest.value);
	}
}

const CREDENTIAL_HEADERS = ['authorization', 'api-key', 'x-api-key', 'access-token'];
const SAFE_HEADERS = ['content-type', 'user-agent', 'accept', 'accept-language'];

function buildHeaders(request: Request, forwardCredentials: boolean): Headers {
	const headers = new Headers();

	for (const name of SAFE_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}

	if (forwardCredentials) {
		for (const name of CREDENTIAL_HEADERS) {
			const value = request.headers.get(name);
			if (value) headers.set(name, value);
		}
	}

	return headers;
}

/** Von Hand, weil ein erlaubter Host sonst per 302 nach innen zeigen koennte. */
async function fetchFollowingRedirects(
	url: URL,
	init: RequestInit,
	fetchFn: typeof fetch
): Promise<Response> {
	let current = url;

	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		const response = await fetchFn(current.toString(), { ...init, redirect: 'manual' });

		const isRedirect = response.status >= 300 && response.status < 400;
		if (!isRedirect) return response;

		const location = response.headers.get('location');
		if (!location) return response;

		let next: URL;
		try {
			next = new URL(location, current);
		} catch {
			throw new TargetRejected(502, 'Target sent an unusable redirect');
		}

		if (next.protocol !== 'https:' || isPrivateAddress(next.hostname)) {
			throw new TargetRejected(403, 'Target redirected to a address that is not permitted');
		}

		current = next;
	}

	throw new TargetRejected(502, 'Target redirected too many times');
}

async function handleProxy(request: Request, url: URL, fetchFn: typeof fetch) {
	let decision: TargetDecision;
	try {
		decision = classifyTarget(url.searchParams.get('target') ?? '', request.method);
	} catch (e) {
		if (e instanceof TargetRejected) throw error(e.status, e.message);
		throw e;
	}

	const { kind, url: target, forwardCredentials } = decision;
	const headers = buildHeaders(request, forwardCredentials);

	// Ein vom Isolate geteilter Cache darf nutzerbezogene Antworten nie sehen.
	const sentCredentials = CREDENTIAL_HEADERS.some((name) => headers.has(name));
	const cacheable = request.method === 'GET' && !sentCredentials;

	const forceRefresh =
		url.searchParams.get('force') === 'true' || request.headers.get('cache-control') === 'no-cache';

	const cacheKey = target.toString();
	if (cacheable && !forceRefresh) {
		const cached = cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
			return new Response(cached.body, {
				status: 200,
				headers: {
					'Content-Type': cached.contentType,
					'Cache-Control': 'private, max-age=60',
					'X-Proxy-Cache': 'HIT'
				}
			});
		}
	}

	const init: RequestInit = { method: request.method, headers };
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		init.body = await request.arrayBuffer();
	}

	let response: Response;
	try {
		response = await fetchFollowingRedirects(target, init, fetchFn);
	} catch (e) {
		if (e instanceof TargetRejected) throw error(e.status, e.message);
		throw error(502, 'Failed to fetch from target');
	}

	const contentType = response.headers.get('Content-Type') || 'application/json';

	// Ohne diese Pruefung waere der Proxy ein allgemeiner Umleitungsdienst.
	if (kind === 'feed') {
		if (!response.ok) throw error(response.status, 'Calendar feed is not reachable');

		const declaredLength = Number(response.headers.get('content-length') ?? '0');
		if (declaredLength > FEED_MAX_BYTES) throw error(413, 'Calendar feed is too large');

		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > FEED_MAX_BYTES) throw error(413, 'Calendar feed is too large');

		const text = new TextDecoder().decode(buffer.slice(0, 512));
		if (!looksLikeCalendar(text)) throw error(415, 'Target did not return an iCalendar document');

		if (cacheable) {
			cacheStore(cacheKey, { body: buffer, contentType, timestamp: Date.now() });
		}

		return new Response(buffer, {
			status: 200,
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Cache-Control': 'private, max-age=60',
				'X-Proxy-Cache': 'MISS'
			}
		});
	}

	if (cacheable && response.ok) {
		const buffer = await response.arrayBuffer();
		cacheStore(cacheKey, { body: buffer, contentType, timestamp: Date.now() });

		return new Response(buffer, {
			status: response.status,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=60',
				'X-Proxy-Cache': 'MISS'
			}
		});
	}

	// Unveraendert durchreichen, damit gestreamte Antworten (AI-Assistent) laufen.
	return new Response(response.body, {
		status: response.status,
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'private, no-store'
		}
	});
}

export const GET: RequestHandler = async ({ request, url, fetch }) => handleProxy(request, url, fetch);
export const POST: RequestHandler = async ({ request, url, fetch }) => handleProxy(request, url, fetch);
