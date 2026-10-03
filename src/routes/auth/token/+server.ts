import type { RequestHandler } from './$types';
import { jsonError } from '$lib/server/mal-env';
import { handleOAuthRequest, stringFields } from '../oauth';

export const POST: RequestHandler = async ({ request, platform }) => {
	return handleOAuthRequest(request, platform, (body) => {
		const fields = stringFields(body, ['code', 'code_verifier', 'redirect_uri']);
		if (!fields) return jsonError(400, 'Missing required fields');

		return new URLSearchParams({ grant_type: 'authorization_code', ...fields });
	});
};
