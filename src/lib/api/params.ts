// ─── Shared query-string helper ───

/** Build URLSearchParams, skipping undefined/null/empty values. */
export function buildSearchParams(obj: Record<string, unknown>): URLSearchParams {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined && value !== null && value !== '') {
			params.set(key, String(value));
		}
	}
	return params;
}
