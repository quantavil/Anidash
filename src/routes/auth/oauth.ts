import { createIpRateLimiter, rateLimitedResponse } from '$lib/server/rate-limit';
import { getMalClientId, getMalClientSecret, jsonError } from '$lib/server/mal-env';

const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

// Guard the credential-injecting token/refresh endpoints. 20 requests/min per IP is
// generous for real login/refresh traffic but blunts abuse.
const checkAuthRateLimit = createIpRateLimiter({ windowMs: 60_000, max: 20 });

/** Read required string fields from a JSON body; any non-string/empty value yields null. */
export function stringFields<K extends string>(
	body: Record<string, unknown>,
	keys: readonly K[]
): Record<K, string> | null {
	const out = {} as Record<K, string>;
	for (const key of keys) {
		const value = body[key];
		if (typeof value !== 'string' || !value) return null;
		out[key] = value;
	}
	return out;
}

/**
 * Shared server-side helper to handle POST requests to MAL's OAuth token endpoint.
 * Handles validation, client credential injection, and upstream fetch.
 */
export async function handleOAuthRequest(
	request: Request,
	platform: App.Platform | undefined,
	buildParams: (body: Record<string, unknown>) => URLSearchParams | Response
): Promise<Response> {
	const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
	if (!checkAuthRateLimit(clientIp)) {
		return rateLimitedResponse();
	}

	const clientId = getMalClientId(platform);
	const clientSecret = getMalClientSecret(platform);
	if (!clientId || !clientSecret) {
		return jsonError(500, 'MAL credentials not configured in platform environment');
	}

	let body: Record<string, unknown>;
	try {
		const parsed = (await request.json()) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
		body = parsed as Record<string, unknown>;
	} catch {
		return jsonError(400, 'Invalid JSON');
	}

	const paramsOrResponse = buildParams(body);
	if (paramsOrResponse instanceof Response) {
		return paramsOrResponse;
	}

	paramsOrResponse.set('client_id', clientId);
	paramsOrResponse.set('client_secret', clientSecret);

	try {
		const malRes = await fetch(MAL_TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: paramsOrResponse.toString()
		});

		const data = (await malRes.json()) as unknown;
		return new Response(JSON.stringify(data), {
			status: malRes.status,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch {
		return jsonError(502, 'Upstream request failed');
	}
}
