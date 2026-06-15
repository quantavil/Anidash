// ─── PKCE (Proof Key for Code Exchange) for MAL OAuth ───

/** Generate a cryptographically random code_verifier (128 chars) as required by MAL */
function generateVerifier(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
	const randomValues = new Uint8Array(128);
	crypto.getRandomValues(randomValues);
	let result = '';
	for (let i = 0; i < 128; i++) {
		result += chars[randomValues[i] % chars.length];
	}
	return result;
}

/** Generate both verifier and challenge (MAL ONLY supports plain) and CSRF state */
export async function generatePKCE(): Promise<{
	verifier: string;
	challenge: string;
	state: string;
}> {
	const verifier = generateVerifier();
	const state = generateVerifier(); // We can reuse the same secure random function for state
	// plain PKCE
	return { verifier, challenge: verifier, state };
}
