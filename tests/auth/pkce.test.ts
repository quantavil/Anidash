import { describe, it, expect } from 'vitest';
import { generatePKCE } from '$lib/auth/pkce';

describe('pkce auth utils', () => {
	it('generates a compliant PKCE pair and state for MAL OAuth', () => {
		const pkce = generatePKCE();

		expect(pkce.verifier).toBeDefined();
		expect(pkce.challenge).toBeDefined();
		expect(pkce.state).toBeDefined();

		// Verifier must be 128 characters
		expect(pkce.verifier.length).toBe(128);
		// Challenge must match verifier (plain method requirement for MAL)
		expect(pkce.challenge).toBe(pkce.verifier);
		// State must be 128 characters
		expect(pkce.state.length).toBe(128);

		// Must contain only unreserved URL characters
		expect(/^[A-Za-z0-9\-._~]+$/.test(pkce.verifier)).toBe(true);
		expect(/^[A-Za-z0-9\-._~]+$/.test(pkce.state)).toBe(true);
	});

	it('generates distinct cryptographic randomness across calls', () => {
		const pair1 = generatePKCE();
		const pair2 = generatePKCE();

		expect(pair1.verifier).not.toBe(pair2.verifier);
		expect(pair1.state).not.toBe(pair2.state);
	});
});
