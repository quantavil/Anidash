import type { RequestHandler } from './$types';
import { createIpRateLimiter, rateLimitedResponse } from '$lib/server/rate-limit';
import { getMalClientId, jsonError } from '$lib/server/mal-env';

// Sized above the client-side MAL limiter (~2.5 req/s ≈ 150/min) so normal use is never
// throttled by our own proxy; per-isolate, so best-effort abuse protection only.
const checkRateLimit = createIpRateLimiter({ windowMs: 60_000, max: 200 });

/** Only these request headers are forwarded to MAL (no cookies / cf-* / hop-by-hop leakage). */
const FORWARDED_HEADERS = ['authorization', 'content-type', 'accept'];

export const fallback: RequestHandler = async ({ request, params, platform, url }) => {
	const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
	if (!checkRateLimit(clientIp)) {
		return rateLimitedResponse();
	}

	// The upstream host is fixed; reject dot-segments so the path can't climb out of /v2/.
	if (params.path.split('/').some((seg) => seg === '.' || seg === '..')) {
		return jsonError(400, 'Invalid path');
	}

	const malClientId = getMalClientId(platform);
	if (!malClientId) {
		return jsonError(500, 'MAL_CLIENT_ID not configured in platform environment');
	}

	const headers = new Headers();
	for (const name of FORWARDED_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	// Only add client ID for unauthenticated requests; Bearer token suffices for auth'd ones
	if (!headers.has('authorization')) {
		headers.set('X-MAL-CLIENT-ID', malClientId);
	}

	try {
		const res = await fetch(`https://api.myanimelist.net/v2/${params.path}${url.search}`, {
			method: request.method,
			headers,
			body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
			// @ts-expect-error - duplex is required for streaming bodies (Cloudflare/undici)
			duplex: 'half'
		});

		return new Response(res.body, res);
	} catch {
		return jsonError(502, 'Upstream proxy error');
	}
};
