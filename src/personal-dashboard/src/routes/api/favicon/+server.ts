import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPrivateAddress } from '$lib/server/proxyTargets';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;
const CACHE_MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 3000;
const MAX_ICON_BYTES = 2 * 1024 * 1024;

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

	while (cache.size > CACHE_MAX_ENTRIES || cacheBytes > CACHE_MAX_BYTES) {
		const oldest = cache.keys().next();
		if (oldest.done) break;
		const victim = cache.get(oldest.value);
		if (victim) cacheBytes -= victim.body.byteLength;
		cache.delete(oldest.value);
	}
}

function getRootDomain(hostname: string): string {
	const parts = hostname.split('.');
	if (parts.length <= 2) return hostname;
	if (parts.length >= 3 && parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length <= 2) {
		return parts.slice(-3).join('.');
	}
	return parts.slice(-2).join('.');
}

interface IconCandidate {
	url: string;
	priority: number;
}

function extractIconCandidates(html: string, baseUrl: URL): IconCandidate[] {
	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	const headContent = headMatch ? headMatch[1] : html.slice(0, 65536);

	const candidates: IconCandidate[] = [];
	const linkRegex = /<link\s+([^>]+)>/gi;
	let match: RegExpExecArray | null;

	while ((match = linkRegex.exec(headContent)) !== null) {
		const attrsStr = match[1];
		const relMatch = attrsStr.match(/\brel=["']([^"']+)["']/i);
		const hrefMatch = attrsStr.match(/\bhref=["']([^"']+)["']/i);
		const sizesMatch = attrsStr.match(/\bsizes=["']([^"']+)["']/i);
		const typeMatch = attrsStr.match(/\btype=["']([^"']+)["']/i);

		if (!relMatch || !hrefMatch) continue;

		const rel = relMatch[1].toLowerCase().trim();
		const href = hrefMatch[1].trim();
		const sizes = sizesMatch ? sizesMatch[1].toLowerCase().trim() : '';
		const type = typeMatch ? typeMatch[1].toLowerCase().trim() : '';

		if (!href || href.startsWith('data:')) continue;

		let priority = 0;
		if (rel.includes('apple-touch-icon')) {
			priority = 100;
			if (sizes.includes('180') || sizes.includes('192') || sizes.includes('152') || sizes.includes('144')) {
				priority += 20;
			}
		} else if (type === 'image/svg+xml' || href.endsWith('.svg')) {
			priority = 90;
		} else if (rel.includes('icon')) {
			priority = 40;
			const sizeNum = parseInt(sizes.split('x')[0] || '0', 10);
			if (sizeNum >= 128) priority += 35;
			else if (sizeNum >= 64) priority += 25;
			else if (sizeNum >= 32) priority += 10;
		}

		if (priority > 0) {
			try {
				const fullUrl = new URL(href, baseUrl).toString();
				candidates.push({ url: fullUrl, priority });
			} catch {
				continue;
			}
		}
	}

	candidates.sort((a, b) => b.priority - a.priority);
	return candidates;
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit = {},
	fetchFn: typeof fetch,
	timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetchFn(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

export const GET: RequestHandler = async ({ url, fetch: fetchFn }) => {
	const rawTarget = url.searchParams.get('url') || url.searchParams.get('domain') || '';
	if (!rawTarget) throw error(400, 'Missing url parameter');

	const normalized =
		rawTarget.startsWith('http://') || rawTarget.startsWith('https://')
			? rawTarget
			: `https://${rawTarget}`;

	let targetUrl: URL;
	try {
		targetUrl = new URL(normalized);
	} catch {
		throw error(400, 'Invalid target URL');
	}

	if (isPrivateAddress(targetUrl.hostname)) {
		throw error(403, 'Private addresses not permitted');
	}

	const cacheKey = targetUrl.hostname;
	const cached = cache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
		return new Response(cached.body, {
			headers: {
				'Content-Type': cached.contentType,
				'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
				'X-Favicon-Cache': 'HIT'
			}
		});
	}

	let candidates: IconCandidate[] = [];
	try {
		const pageRes = await fetchWithTimeout(
			targetUrl.toString(),
			{
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
				}
			},
			fetchFn
		);

		if (pageRes.ok) {
			const contentType = pageRes.headers.get('Content-Type') || '';
			if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
				const html = await pageRes.text();
				candidates = extractIconCandidates(html, targetUrl);
			}
		}
	} catch {}

	candidates.push({ url: `${targetUrl.origin}/apple-touch-icon.png`, priority: 30 });
	candidates.push({ url: `${targetUrl.origin}/apple-touch-icon-precomposed.png`, priority: 25 });
	candidates.push({ url: `${targetUrl.origin}/favicon.ico`, priority: 10 });

	for (const candidate of candidates) {
		try {
			const imgRes = await fetchWithTimeout(
				candidate.url,
				{
					headers: {
						'User-Agent':
							'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
						Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
					}
				},
				fetchFn,
				2000
			);

			if (imgRes.ok) {
				const cType = imgRes.headers.get('Content-Type') || '';
				const isImage =
					cType.startsWith('image/') || cType.includes('svg') || cType.includes('octet-stream');
				if (isImage) {
					const buf = await imgRes.arrayBuffer();
					if (buf.byteLength > 100 && buf.byteLength <= MAX_ICON_BYTES) {
						const finalType = cType.includes('octet-stream') ? 'image/png' : cType;
						cacheStore(cacheKey, { body: buf, contentType: finalType, timestamp: Date.now() });
						return new Response(buf, {
							headers: {
								'Content-Type': finalType,
								'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
								'X-Favicon-Source': 'direct-icon'
							}
						});
					}
				}
			}
		} catch {}
	}

	const rootDomain = getRootDomain(targetUrl.hostname);
	try {
		const googleUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(rootDomain)}&sz=128`;
		const gRes = await fetchWithTimeout(googleUrl, {}, fetchFn, 2000);
		if (gRes.ok) {
			const buf = await gRes.arrayBuffer();
			// Google liefert bei unbekannten Domains einen 16x16-Globus (HTTP 200, <600 Bytes).
			if (buf.byteLength > 600) {
				const gType = gRes.headers.get('Content-Type') || 'image/png';
				cacheStore(cacheKey, { body: buf, contentType: gType, timestamp: Date.now() });
				return new Response(buf, {
					headers: {
						'Content-Type': gType,
						'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
						'X-Favicon-Source': 'google-s2'
					}
				});
			}
		}
	} catch {}

	throw error(404, 'No high-resolution icon available');
};
