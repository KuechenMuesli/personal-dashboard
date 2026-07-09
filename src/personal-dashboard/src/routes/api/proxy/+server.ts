import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const cache = new Map<string, { body: ArrayBuffer, contentType: string, timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 Minuten Cache

async function handleProxy(request: Request, url: URL, fetch: any) {
    const targetUrl = url.searchParams.get('target');
    if (!targetUrl) throw error(400, "Missing target URL");

    // SSRF Protection: Define allowed domains/patterns for the proxy
    const allowedPrefixes = [
        "https://api.duckduckgo.com/",
        "https://query1.finance.yahoo.com/",
        "https://api.parcel.app/external", // For Parcel (GET & POST)
        "https://api.17track.net/", // For Parcel fallback
        "https://usetrmnl.com/", // For TRMNL
        "https://trmnl.com/", // For TRMNL alternative
        "https://de.wikipedia.org/w/api.php", // For DuckDuckGo fallback
        "https://en.wikipedia.org/w/api.php",
    ];

    let isAllowed = false;
    for (const prefix of allowedPrefixes) {
        if (targetUrl.startsWith(prefix)) {
            isAllowed = true;
            break;
        }
    }

    // Allow calendar feeds (typically ending in .ics or containing "calendar")
    if (targetUrl.includes('.ics') || targetUrl.includes('calendar') || targetUrl.includes('caldav')) {
        isAllowed = true;
    }

    if (!isAllowed) {
        throw error(403, "Target URL is not permitted by proxy rules.");
    }

    // Check In-Memory Cache for GET requests
    if (request.method === 'GET') {
        const cached = cache.get(targetUrl);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
            return new Response(cached.body, {
                status: 200,
                headers: {
                    'Content-Type': cached.contentType,
                    'Cache-Control': 'public, max-age=60',
                    'X-Proxy-Cache': 'HIT'
                }
            });
        }
    }

    try {
        const options: RequestInit = {
            method: request.method,
            headers: {
                // Forward content-type if present
                ...(request.headers.get('content-type') ? { 'Content-Type': request.headers.get('content-type')! } : {})
            }
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            options.body = await request.arrayBuffer();
        }

        const response = await fetch(targetUrl, options);
        
        // Cache successful GET responses
        if (request.method === 'GET' && response.ok) {
            const bodyBuffer = await response.arrayBuffer();
            const contentType = response.headers.get('Content-Type') || 'application/json';
            
            cache.set(targetUrl, {
                body: bodyBuffer,
                contentType,
                timestamp: Date.now()
            });

            return new Response(bodyBuffer, {
                status: response.status,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=60',
                    'X-Proxy-Cache': 'MISS'
                }
            });
        }
        
        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json'
            }
        });
    } catch (e) {
        throw error(500, "Failed to fetch from target");
    }
}

export const GET: RequestHandler = async ({ request, url, fetch }) => {
    return handleProxy(request, url, fetch);
};

export const POST: RequestHandler = async ({ request, url, fetch }) => {
    return handleProxy(request, url, fetch);
};
