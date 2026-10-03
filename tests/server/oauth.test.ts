import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleOAuthRequest, stringFields } from '../../src/routes/auth/oauth';

const platform = { env: { MAL_CLIENT_ID: 'cid', MAL_CLIENT_SECRET: 'sec' } } as App.Platform;

function post(body: unknown, ip = '1.1.1.1') {
	return new Request('http://localhost/auth/token', {
		method: 'POST',
		headers: { 'cf-connecting-ip': ip },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

afterEach(() => vi.unstubAllGlobals());

describe('stringFields', () => {
	it('returns only when every field is a non-empty string', () => {
		expect(stringFields({ a: 'x', b: 'y' }, ['a', 'b'])).toEqual({ a: 'x', b: 'y' });
		expect(stringFields({ a: 'x' }, ['a', 'b'])).toBeNull();
		expect(stringFields({ a: 'x', b: { nested: 1 } }, ['a', 'b'])).toBeNull();
		expect(stringFields({ a: '' }, ['a'])).toBeNull();
	});
});

describe('handleOAuthRequest', () => {
	it('500s when the secret is not configured (the Cloudflare-secret-missing case)', async () => {
		const res = await handleOAuthRequest(
			post({}, '2.2.2.2'),
			{ env: { MAL_CLIENT_ID: 'cid' } } as App.Platform,
			() => new URLSearchParams()
		);
		expect(res.status).toBe(500);
		expect(((await res.json()) as { error: string }).error).toMatch(/credentials not configured/);
	});

	it('rejects non-object JSON bodies', async () => {
		const res = await handleOAuthRequest(
			post('[1]', '3.3.3.3'),
			platform,
			() => new URLSearchParams()
		);
		expect(res.status).toBe(400);
	});

	it('injects client credentials server-side and forwards MAL status', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));
		vi.stubGlobal('fetch', fetchMock);

		const res = await handleOAuthRequest(post({ x: 1 }, '4.4.4.4'), platform, () => {
			return new URLSearchParams({ grant_type: 'refresh_token', refresh_token: 'r' });
		});

		expect(res.status).toBe(400);
		const sent = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
		expect(sent.get('client_id')).toBe('cid');
		expect(sent.get('client_secret')).toBe('sec');
		expect(sent.get('refresh_token')).toBe('r');
	});
});
