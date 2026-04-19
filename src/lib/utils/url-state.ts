// ─── URL SearchParams helpers ───
// Used in .svelte files alongside $page.url and goto().

/** Read a URL param with a fallback default */
export function getUrlParam(url: URL, key: string, defaultValue: string): string {
	return url.searchParams.get(key) ?? defaultValue;
}

/** Set (or delete) a URL param and return the new path+search string */
export function setUrlParam(url: URL, key: string, value: string): string {
	const next = new URL(url);
	if (value) {
		next.searchParams.set(key, value);
	} else {
		next.searchParams.delete(key);
	}
	return next.pathname + next.search;
}

/** Set multiple URL params at once */
export function setUrlParams(url: URL, pairs: Array<{ key: string; value: string }>): string {
	const next = new URL(url);
	for (const { key, value } of pairs) {
		if (value) {
			next.searchParams.set(key, value);
		} else {
			next.searchParams.delete(key);
		}
	}
	return next.pathname + next.search;
}
