import type { RequestHandler } from './$types';
import { handleOAuthRequest } from '../oauth';

export const POST: RequestHandler = async ({ request, platform }) => {
	return handleOAuthRequest(request, platform, (body) => {
		const { refresh_token } = body;

		if (!refresh_token) {
			return new Response(JSON.stringify({ ok: false, error: 'Missing refresh_token' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token
		});
	});
};
