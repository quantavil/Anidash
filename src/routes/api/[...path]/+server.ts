import type { RequestHandler } from './$types';

// ─── Per-IP Rate Limiting ───
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
	const now = Date.now();

	// Prune stale entries when the map grows to prevent memory leaks in the isolate
	if (ipHits.size > 1000) {
		for (const [k, v] of ipHits.entries()) {
			if (now > v.resetAt) {
				ipHits.delete(k);
			}
		}
	}

	const entry = ipHits.get(ip);
	if (!entry || now > entry.resetAt) {
		ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
		return true;
	}
	entry.count++;
	return entry.count <= RATE_LIMIT_MAX;
}

export const fallback: RequestHandler = async ({ request, params, platform, url }) => {
	const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
	if (!checkRateLimit(clientIp)) {
		return new Response(JSON.stringify({ ok: false, error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
		});
	}

	const malUrl = `https://api.myanimelist.net/v2/${params.path}${url.search}`;
	const env = platform?.env;

	if (!env?.MAL_CLIENT_ID) {
		return new Response(
			JSON.stringify({ ok: false, error: 'MAL_CLIENT_ID not configured in platform environment' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const headers = new Headers(request.headers);
	// Only add client ID for unauthenticated requests; Bearer token suffices for auth'd ones
	if (!headers.has('Authorization')) {
		headers.set('X-MAL-CLIENT-ID', env.MAL_CLIENT_ID);
	}
	// Strip headers that MAL might reject or that reveal proxy details
	headers.delete('Host');
	headers.delete('Origin');
	headers.delete('Referer');

	try {
		const res = await fetch(malUrl, {
			method: request.method,
			headers,
			body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
			// @ts-ignore - SvelteKit/Cloudflare specific
			duplex: 'half'
		});

		return new Response(res.body, res);
	} catch (e) {
		return new Response(JSON.stringify({ ok: false, error: 'Upstream proxy error' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
