import type { RequestHandler } from './$types';
import { env } from 'cloudflare:workers';
import { jsonError } from '#lib/server/mal-env.js';
import { handleOAuthRequest, stringFields } from '../oauth';

export const POST: RequestHandler = async ({ request }) => {
	return handleOAuthRequest(request, env, (body) => {
		const fields = stringFields(body, ['refresh_token']);
		if (!fields) return jsonError(400, 'Missing refresh_token');

		return new URLSearchParams({ grant_type: 'refresh_token', ...fields });
	});
};
