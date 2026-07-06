import type { RequestHandler } from './$types';
import { createIpRateLimiter, rateLimitedResponse } from '$lib/server/rate-limit';

// 60 requests per minute per IP.
const checkRateLimit = createIpRateLimiter({ windowMs: 60_000, max: 60 });

export const fallback: RequestHandler = async ({ request, params, platform, url }) => {
	const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
	if (!checkRateLimit(clientIp)) {
		return rateLimitedResponse();
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
			// @ts-expect-error - duplex is required for streaming bodies (Cloudflare/undici)
			duplex: 'half'
		});

		return new Response(res.body, res);
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Upstream proxy error' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
