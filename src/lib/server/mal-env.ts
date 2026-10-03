// ─── MAL credentials from the Cloudflare platform environment ───
// Local dev gets the same shape via adapter-cloudflare's platform proxy
// (`wrangler.toml [vars]` + `.dev.vars` for the secret), so there is one source.

export function getMalClientId(platform: App.Platform | undefined): string | undefined {
	return platform?.env?.MAL_CLIENT_ID || undefined;
}

export function getMalClientSecret(platform: App.Platform | undefined): string | undefined {
	return platform?.env?.MAL_CLIENT_SECRET || undefined;
}

export function jsonError(status: number, error: string, headers?: HeadersInit): Response {
	return new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json', ...headers }
	});
}
