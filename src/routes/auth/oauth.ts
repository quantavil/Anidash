const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

/**
 * Shared server-side helper to handle POST requests to MAL's OAuth token endpoint.
 * Handles validation, client credential injection, and upstream fetch.
 */
export async function handleOAuthRequest(
	request: Request,
	platform: App.Platform | undefined,
	buildParams: (body: any) => URLSearchParams | Response
): Promise<Response> {
	const env = platform?.env;

	if (!env?.MAL_CLIENT_ID || !env?.MAL_CLIENT_SECRET) {
		return new Response(
			JSON.stringify({
				ok: false,
				error: 'MAL credentials not configured in platform environment'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const paramsOrResponse = buildParams(body);
	if (paramsOrResponse instanceof Response) {
		return paramsOrResponse;
	}

	// Inject credentials
	paramsOrResponse.set('client_id', env.MAL_CLIENT_ID);
	paramsOrResponse.set('client_secret', env.MAL_CLIENT_SECRET);

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
	} catch (e) {
		return new Response(JSON.stringify({ ok: false, error: 'Upstream request failed' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
