import type { RequestHandler } from './$types';
import { jsonError } from '$lib/server/mal-env';
import { handleOAuthRequest, stringFields } from '../oauth';

export const POST: RequestHandler = async ({ request, platform }) => {
	return handleOAuthRequest(request, platform, (body) => {
		const fields = stringFields(body, ['refresh_token']);
		if (!fields) return jsonError(400, 'Missing refresh_token');

		return new URLSearchParams({ grant_type: 'refresh_token', ...fields });
	});
};
