// ─── Per-IP rate limiting for server endpoints ───
// Note: state is per-isolate on Cloudflare, so this is best-effort, not a hard guarantee.

interface Bucket {
	count: number;
	resetAt: number;
}

/** Create an independent rate limiter with its own bucket map. */
export function createIpRateLimiter(options: { windowMs: number; max: number }) {
	const { windowMs, max } = options;
	const hits = new Map<string, Bucket>();

	/** Returns true if the request is allowed, false if the IP is over its limit. */
	return function check(ip: string): boolean {
		const now = Date.now();

		// Prune stale buckets when the map grows, to bound memory in the isolate.
		if (hits.size > 1000) {
			for (const [k, v] of hits.entries()) {
				if (now > v.resetAt) hits.delete(k);
			}
		}

		const entry = hits.get(ip);
		if (!entry || now > entry.resetAt) {
			hits.set(ip, { count: 1, resetAt: now + windowMs });
			return true;
		}
		entry.count++;
		return entry.count <= max;
	};
}

/** Standard 429 response for a rate-limited request. */
export function rateLimitedResponse(): Response {
	return new Response(JSON.stringify({ ok: false, error: 'Rate limit exceeded' }), {
		status: 429,
		headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
	});
}
