import type { RequestHandler } from './$types';

const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

export const POST: RequestHandler = async ({ request, platform }) => {
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

	const { refresh_token } = body;

	if (!refresh_token) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing refresh_token' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const params = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: env.MAL_CLIENT_ID,
			client_secret: env.MAL_CLIENT_SECRET,
			refresh_token
		});

		const malRes = await fetch(MAL_TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString()
		});

		const data = (await malRes.json()) as any;
		return new Response(JSON.stringify({ ok: malRes.ok, ...data }), {
			status: malRes.status,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(JSON.stringify({ ok: false, error: 'Upstream request failed' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
