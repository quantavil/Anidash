import type { RequestHandler } from './$types';
import { handleOAuthRequest } from '../oauth';

export const POST: RequestHandler = async ({ request, platform }) => {
	return handleOAuthRequest(request, platform, (body) => {
		const { code, code_verifier, redirect_uri } = body;

		if (!code || !code_verifier || !redirect_uri) {
			return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			code_verifier,
			redirect_uri
		});
	});
};
