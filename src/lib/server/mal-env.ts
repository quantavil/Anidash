// ─── MAL credentials from the Cloudflare worker environment ───
// adapter-cloudflare 8 no longer passes `event.platform`; routes import `env` from
// `cloudflare:workers` and hand it in. Local dev gets the same shape via the adapter's
// platform proxy (`wrangler.toml [vars]` + `.dev.vars` for the secret).

export type MalEnv = Partial<Pick<Cloudflare.Env, 'MAL_CLIENT_ID' | 'MAL_CLIENT_SECRET'>>;

export function getMalClientId(env: MalEnv | undefined): string | undefined {
	return env?.MAL_CLIENT_ID || undefined;
}

export function getMalClientSecret(env: MalEnv | undefined): string | undefined {
	return env?.MAL_CLIENT_SECRET || undefined;
}

export function jsonError(status: number, error: string, headers?: HeadersInit): Response {
	return new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json', ...headers }
	});
}
